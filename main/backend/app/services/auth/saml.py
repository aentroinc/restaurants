"""SAML 2.0 helper (minimal SP behaviour).

Real SAML deployments use python3-saml; here we provide just enough surface
for E2E flow testing without that dep. The production wiring should swap
the stub `validate_assertion` for the python3-saml implementation.
"""
from __future__ import annotations

import base64
from dataclasses import dataclass
from typing import Any
from xml.etree import ElementTree as ET


@dataclass
class SAMLAttributes:
    name_id: str
    email: str | None
    name: str | None
    groups: list[str]
    raw: dict


class SAMLServiceProvider:
    """Tiny SAML SP: build the redirect URL, parse the assertion attrs.

    For production: replace `parse_assertion` body with python3-saml's
    OneLogin_Saml2_Auth.process_response().
    """
    def __init__(self, config: dict):
        self.config = config

    def build_redirect_url(self, *, relay_state: str = "") -> str:
        """Return the IdP SSO URL with our entity_id baked in."""
        # Real SAMLRequest construction would go here
        idp_sso = self.config.get("idp_sso_url", "")
        return f"{idp_sso}?RelayState={relay_state}&SPEntityID={self.config.get('sp_entity_id', '')}"

    def parse_assertion(self, saml_response_b64: str) -> SAMLAttributes:
        """Parse a base64-encoded SAML response and return attributes.

        Stub mode: when configured with `stub: true`, return a deterministic
        identity so tests can exercise the flow.
        """
        if self.config.get("stub"):
            return SAMLAttributes(
                name_id="stub-saml-user@example.com",
                email="stub-saml-user@example.com",
                name="SAML Test User",
                groups=["aentro-executive"],
                raw={"stub": True},
            )

        try:
            xml = base64.b64decode(saml_response_b64).decode("utf-8")
        except Exception:
            xml = saml_response_b64

        try:
            root = ET.fromstring(xml)
        except ET.ParseError:
            return SAMLAttributes(name_id="", email=None, name=None, groups=[], raw={})

        ns = {
            "saml": "urn:oasis:names:tc:SAML:2.0:assertion",
        }

        name_id_el = root.find(".//saml:NameID", ns)
        name_id = name_id_el.text if name_id_el is not None else ""

        attrs: dict[str, list[str]] = {}
        for attr in root.findall(".//saml:AttributeStatement/saml:Attribute", ns):
            key = attr.get("Name", "")
            values = [v.text for v in attr.findall("saml:AttributeValue", ns) if v.text]
            attrs[key] = values

        groups_attr = self.config.get("groups_attribute", "groups")
        return SAMLAttributes(
            name_id=name_id or "",
            email=(attrs.get("email") or [None])[0],
            name=(attrs.get("name") or [None])[0],
            groups=attrs.get(groups_attr, []),
            raw=attrs,
        )


def map_groups_to_role(groups: list[str], mapping: dict) -> str | None:
    for g in groups:
        if g in mapping:
            return mapping[g]
    return mapping.get("_default")
