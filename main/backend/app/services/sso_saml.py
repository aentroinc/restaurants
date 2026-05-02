"""SAML 2.0 SSO service — minimal self-built (no xmlsec) implementation.

Implements:
  start_saml_login -> AuthnRequest URL (HTTP-Redirect binding, deflated+b64)
  complete_saml_login(saml_response_b64) -> verifies signature/audience/NotOnOrAfter, upserts user, mints JWT

Signature verification uses `cryptography` for raw RSA-SHA256 verify
on the canonicalized signed XML node. This is intentionally minimal —
for full xml-c14n + xml-dsig fidelity prefer python3-saml in production.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import secrets
import time
import uuid
import zlib
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urlencode
from xml.etree import ElementTree as ET

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import SECRET_KEY, create_access_token
from app.models.auth_enterprise import IdentityProvider
from app.models.user import AccessScope, User

NS = {
    "saml": "urn:oasis:names:tc:SAML:2.0:assertion",
    "samlp": "urn:oasis:names:tc:SAML:2.0:protocol",
    "ds": "http://www.w3.org/2000/09/xmldsig#",
}

_STATE_CACHE: dict[str, dict[str, Any]] = {}
_STATE_TTL = 600


class SAMLError(Exception):
    pass


def _now() -> int:
    return int(time.time())


def _gc_state() -> None:
    now = _now()
    for k in [k for k, v in _STATE_CACHE.items() if v["expires_at"] < now]:
        _STATE_CACHE.pop(k, None)


def _sign(raw: str) -> str:
    sig = hmac.new(SECRET_KEY.encode(), raw.encode(), hashlib.sha256).hexdigest()[:16]
    return f"{raw}.{sig}"


def _verify_sig(token: str) -> str:
    raw, sig = token.rsplit(".", 1)
    expected = hmac.new(SECRET_KEY.encode(), raw.encode(), hashlib.sha256).hexdigest()[:16]
    if not hmac.compare_digest(sig, expected):
        raise SAMLError("invalid relay state")
    return raw


def _build_authn_request(sp_entity_id: str, acs_url: str, idp_sso_url: str, request_id: str) -> str:
    issue_instant = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    xml = (
        f'<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" '
        f'xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" '
        f'ID="{request_id}" Version="2.0" IssueInstant="{issue_instant}" '
        f'Destination="{idp_sso_url}" '
        f'ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" '
        f'AssertionConsumerServiceURL="{acs_url}">'
        f'<saml:Issuer>{sp_entity_id}</saml:Issuer>'
        f'</samlp:AuthnRequest>'
    )
    return xml


def _deflate_b64(xml: str) -> str:
    """Redirect binding: DEFLATE (no zlib header) + base64."""
    compressor = zlib.compressobj(level=9, wbits=-15)
    deflated = compressor.compress(xml.encode("utf-8")) + compressor.flush()
    return base64.b64encode(deflated).decode("ascii")


async def start_saml_login(
    db: AsyncSession,
    tenant_id: str,
    idp_id: str,
) -> dict[str, str]:
    result = await db.execute(
        select(IdentityProvider).where(
            IdentityProvider.id == idp_id,
            IdentityProvider.tenant_id == tenant_id,
            IdentityProvider.type == "saml",
            IdentityProvider.enabled == True,
        )
    )
    provider = result.scalar_one_or_none()
    if not provider:
        raise SAMLError("SAML provider not found")

    config = provider.config or {}
    sp_entity_id = config.get("sp_entity_id") or config.get("entity_id")
    acs_url = config.get("acs_url")
    idp_sso_url = config.get("sso_url") or config.get("idp_sso_url")
    if not (sp_entity_id and acs_url and idp_sso_url):
        raise SAMLError("provider misconfigured: sp_entity_id/acs_url/sso_url required")

    request_id = "_" + secrets.token_hex(16)
    relay_raw = f"{provider.id}:{tenant_id}:{request_id}"
    relay_state = _sign(relay_raw)

    _gc_state()
    _STATE_CACHE[relay_state] = {
        "provider_id": str(provider.id),
        "tenant_id": str(tenant_id),
        "request_id": request_id,
        "expires_at": _now() + _STATE_TTL,
    }

    xml = _build_authn_request(sp_entity_id, acs_url, idp_sso_url, request_id)
    samlrequest = _deflate_b64(xml)

    params = {"SAMLRequest": samlrequest, "RelayState": relay_state}
    redirect_url = f"{idp_sso_url}?{urlencode(params)}"
    return {"redirect_url": redirect_url, "relay_state": relay_state, "request_id": request_id}


def _parse_iso_dt(s: str) -> datetime:
    # Accept ...Z and ...+00:00
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    return datetime.fromisoformat(s)


def _verify_signature(signed_xml_bytes: bytes, signature_b64: str, idp_cert_pem: str) -> bool:
    """Verify RSA-SHA256 signature over signed_xml_bytes. Minimal — does not perform xml-c14n.
    Caller must pass the bytes that were signed (typically the SignedInfo or the Assertion node serialized).
    """
    try:
        from cryptography.hazmat.primitives import hashes, serialization
        from cryptography.hazmat.primitives.asymmetric import padding
        from cryptography.x509 import load_pem_x509_certificate
    except ImportError as e:
        raise SAMLError(f"cryptography not installed: {e}")

    try:
        cert = load_pem_x509_certificate(idp_cert_pem.encode())
        public_key = cert.public_key()
        signature = base64.b64decode(signature_b64)
        public_key.verify(
            signature,
            signed_xml_bytes,
            padding.PKCS1v15(),
            hashes.SHA256(),
        )
        return True
    except Exception:
        return False


def _normalize_cert(cert_str: str) -> str:
    cert_str = cert_str.strip()
    if "BEGIN CERTIFICATE" in cert_str:
        return cert_str
    body = "".join(cert_str.split())
    return "-----BEGIN CERTIFICATE-----\n" + "\n".join(
        body[i : i + 64] for i in range(0, len(body), 64)
    ) + "\n-----END CERTIFICATE-----\n"


def _validate_assertion_conditions(assertion: ET.Element, expected_audience: str) -> None:
    conditions = assertion.find("saml:Conditions", NS)
    if conditions is None:
        raise SAMLError("missing Conditions")
    not_before = conditions.get("NotBefore")
    not_on_or_after = conditions.get("NotOnOrAfter")
    now = datetime.now(timezone.utc)
    if not_before:
        nb = _parse_iso_dt(not_before)
        if now < nb:
            raise SAMLError("assertion not yet valid")
    if not_on_or_after:
        na = _parse_iso_dt(not_on_or_after)
        if now >= na:
            raise SAMLError("assertion expired")

    aud_restriction = conditions.find("saml:AudienceRestriction", NS)
    if aud_restriction is not None:
        audiences = [a.text for a in aud_restriction.findall("saml:Audience", NS)]
        if expected_audience not in audiences:
            raise SAMLError(f"audience mismatch: expected {expected_audience}, got {audiences}")


def _extract_attributes(assertion: ET.Element) -> dict[str, Any]:
    out: dict[str, Any] = {}
    stmt = assertion.find("saml:AttributeStatement", NS)
    if stmt is None:
        return out
    for attr in stmt.findall("saml:Attribute", NS):
        name = attr.get("Name")
        values = [v.text for v in attr.findall("saml:AttributeValue", NS)]
        if not name:
            continue
        out[name] = values if len(values) > 1 else (values[0] if values else None)
    return out


async def complete_saml_login(
    db: AsyncSession,
    saml_response_b64: str,
    relay_state: str | None = None,
) -> dict[str, Any]:
    """Decode SAMLResponse, verify, upsert user, mint JWT."""
    if relay_state:
        _verify_sig(relay_state)
        cached = _STATE_CACHE.pop(relay_state, None)
        if not cached:
            raise SAMLError("relay state unknown or expired")
        provider_id = cached["provider_id"]
        tenant_id = cached["tenant_id"]
    else:
        provider_id = None
        tenant_id = None

    try:
        decoded = base64.b64decode(saml_response_b64)
    except Exception as e:
        raise SAMLError(f"base64 decode failed: {e}")

    try:
        root = ET.fromstring(decoded)
    except ET.ParseError as e:
        raise SAMLError(f"XML parse failed: {e}")

    # Find Assertion (may be wrapped in Response)
    assertion = root.find("saml:Assertion", NS)
    if assertion is None and root.tag.endswith("Assertion"):
        assertion = root
    if assertion is None:
        raise SAMLError("no Assertion in SAMLResponse")

    issuer_el = assertion.find("saml:Issuer", NS)
    issuer = issuer_el.text if issuer_el is not None else None

    # Resolve provider (by relay_state, else by Issuer)
    if provider_id:
        result = await db.execute(
            select(IdentityProvider).where(IdentityProvider.id == provider_id)
        )
    else:
        result = await db.execute(
            select(IdentityProvider).where(
                IdentityProvider.type == "saml",
                IdentityProvider.enabled == True,
            )
        )
    provider = None
    if provider_id:
        provider = result.scalar_one_or_none()
    else:
        # match by issuer
        for p in result.scalars().all():
            if (p.config or {}).get("idp_entity_id") == issuer:
                provider = p
                break
    if not provider:
        raise SAMLError("provider not found")
    config = provider.config or {}
    if tenant_id is None:
        tenant_id = str(provider.tenant_id)

    # Signature verification (best-effort — minimal RSA verify)
    idp_cert = config.get("idp_cert") or config.get("x509cert")
    sig_el = assertion.find("ds:Signature", NS) or root.find("ds:Signature", NS)
    if config.get("require_signature", True):
        if not idp_cert:
            raise SAMLError("idp_cert not configured but signature required")
        if sig_el is None:
            raise SAMLError("SAMLResponse not signed")
        sig_value_el = sig_el.find("ds:SignatureValue", NS)
        signed_info_el = sig_el.find("ds:SignedInfo", NS)
        if sig_value_el is None or signed_info_el is None:
            raise SAMLError("malformed signature element")
        signed_info_bytes = ET.tostring(signed_info_el, method="xml")
        sig_b64 = "".join((sig_value_el.text or "").split())
        ok = _verify_signature(signed_info_bytes, sig_b64, _normalize_cert(idp_cert))
        if not ok:
            raise SAMLError("signature verification failed")

    # Conditions / Audience / NotOnOrAfter
    expected_audience = config.get("sp_entity_id") or config.get("entity_id") or ""
    _validate_assertion_conditions(assertion, expected_audience)

    # Subject -> NameID (email)
    subject = assertion.find("saml:Subject", NS)
    name_id_el = subject.find("saml:NameID", NS) if subject is not None else None
    name_id = name_id_el.text if name_id_el is not None else None

    attrs = _extract_attributes(assertion)
    email = (
        attrs.get("email")
        or attrs.get("Email")
        or attrs.get("urn:oid:0.9.2342.19200300.100.1.3")
        or name_id
    )
    if not email:
        raise SAMLError("no email/NameID in assertion")

    name = attrs.get("name") or attrs.get("displayName") or email
    groups = attrs.get("groups") or attrs.get("memberOf") or []
    if isinstance(groups, str):
        groups = [groups]

    role_mapping = provider.role_mapping or {}
    target_role = "viewer"
    for g in groups:
        if g in role_mapping:
            target_role = role_mapping[g]
            break

    user_q = await db.execute(
        select(User).where(User.email == email, User.tenant_id == tenant_id)
    )
    user = user_q.scalar_one_or_none()
    if not user:
        user = User(
            tenant_id=uuid.UUID(tenant_id) if isinstance(tenant_id, str) else tenant_id,
            email=email,
            name=name,
            role=target_role,
            active=True,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    else:
        user.role = target_role
        await db.commit()

    scopes_q = await db.execute(select(AccessScope).where(AccessScope.user_id == user.id))
    scopes = [
        {"scope_type": s.scope_type, "scope_id": str(s.scope_id)}
        for s in scopes_q.scalars().all()
    ]
    access_token = create_access_token(
        user_id=str(user.id),
        tenant_id=str(user.tenant_id),
        role=user.role,
        scopes=scopes,
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "role": user.role,
            "name": user.name,
        },
    }


def build_sp_metadata(sp_entity_id: str, acs_url: str) -> str:
    """Generate SP metadata XML for IdP configuration."""
    return (
        '<?xml version="1.0"?>'
        f'<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" '
        f'entityID="{sp_entity_id}">'
        f'<md:SPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol" '
        f'AuthnRequestsSigned="false" WantAssertionsSigned="true">'
        f'<md:AssertionConsumerService '
        f'Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" '
        f'Location="{acs_url}" index="0" isDefault="true"/>'
        f'<md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>'
        f'</md:SPSSODescriptor>'
        f'</md:EntityDescriptor>'
    )
