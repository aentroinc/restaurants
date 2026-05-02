"""標準同意テンプレ + 個人情報系 marking 紐付けの seeds."""
from __future__ import annotations
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.consent import ConsentTemplate
from app.models.marking import Marking, MarkingAssignment


# 4 標準テンプレ
STANDARD_CONSENT_TEMPLATES = [
    {
        "code": "face",
        "version": 1,
        "title": "顔認証データの取得・利用について",
        "body_md": (
            "# 顔認証データの取り扱い\n\n"
            "本アプリは、出退勤の打刻を3秒で完了させるため、あなたの顔特徴量（embedding ベクトル）を取得・保管します。\n\n"
            "- **取得項目**: 顔画像から抽出した数値ベクトル（顔写真そのものは保存しません）\n"
            "- **利用目的**: 出退勤打刻時の本人認証のみ\n"
            "- **第三者提供**: なし\n"
            "- **保管期間**: 退職または同意撤回まで\n"
            "- **撤回方法**: 設定画面の「データ削除を申請する」から、いつでも撤回可能\n\n"
            "個人情報保護法（2022改正）に基づく要配慮個人情報として厳重に管理します。"
        ),
        "required_fields": ["face"],
    },
    {
        "code": "gps",
        "version": 1,
        "title": "位置情報（GPS）の取得について",
        "body_md": (
            "# 位置情報の取り扱い\n\n"
            "出退勤打刻時に、店舗から半径200m以内にいることを確認するため、GPS による位置情報を取得します。\n\n"
            "- **取得項目**: 緯度・経度（打刻時点のみ）\n"
            "- **利用目的**: ジオフェンス内打刻の検証\n"
            "- **保管期間**: 打刻イベントと一体で保管（労基法109条に基づき3年）\n"
            "- **常時取得**: しません（打刻ボタン押下時のみ）"
        ),
        "required_fields": ["gps"],
    },
    {
        "code": "clock_retention",
        "version": 1,
        "title": "打刻記録の保管について",
        "body_md": (
            "# 打刻記録（出勤簿）の保管\n\n"
            "労働基準法第109条に基づき、出退勤・休憩の打刻記録を3年間保管します。\n\n"
            "- **取得項目**: 出退勤・休憩開始/終了時刻、店舗ID、認証方式\n"
            "- **利用目的**: 賃金計算・労務監査・労働基準監督署対応\n"
            "- **保管期間**: 3年（法定）\n"
            "- **撤回**: 法定保管期間中は撤回不可。経過後は削除リクエスト可能"
        ),
        "required_fields": ["clock_retention"],
    },
    {
        "code": "interview",
        "version": 1,
        "title": "面談・評価記録の保管について",
        "body_md": (
            "# 面談・評価記録の取り扱い\n\n"
            "店長・SVとの面談内容、人事評価、AI による要約などを記録・保管します。\n\n"
            "- **取得項目**: 面談メモ、評価スコア、AI要約\n"
            "- **利用目的**: 人事評価・育成計画・店舗オペレーション改善\n"
            "- **保管期間**: 在職中（退職後は匿名化）\n"
            "- **AI 学習利用**: テナント外部への学習データ提供は行いません"
        ),
        "required_fields": ["interview"],
    },
]


# 顔・GPS・誕生日 等の個人情報系 marking
BIOMETRIC_MARKINGS = [
    {"code": "pii.biometric", "display_name": "PII（生体情報）", "description": "顔特徴量・指紋等の生体情報", "level": "high"},
    {"code": "pii.location", "display_name": "PII（位置情報）", "description": "GPS 緯度経度", "level": "medium"},
]

# 顔・打刻系 column への marking 紐付け
BIOMETRIC_ASSIGNMENTS = [
    ("face_template", None, "embedding_jsonb", "pii.biometric"),
    ("clock_event", None, "lat", "pii.location"),
    ("clock_event", None, "lon", "pii.location"),
    ("employee", None, "birth_date", "pii.sensitive"),
]


async def ensure_consent_templates(db: AsyncSession, tenant_id: str) -> dict[str, str]:
    """標準同意テンプレを idempotent に投入. code -> id を返す."""
    existing = (await db.execute(
        select(ConsentTemplate).where(ConsentTemplate.tenant_id == tenant_id)
    )).scalars().all()
    code_to_id: dict[str, str] = {}
    seen_keys: set[tuple[str, int]] = set()
    for t in existing:
        code_to_id.setdefault(t.code, str(t.id))
        seen_keys.add((t.code, t.version))

    for spec in STANDARD_CONSENT_TEMPLATES:
        key = (spec["code"], spec["version"])
        if key in seen_keys:
            continue
        obj = ConsentTemplate(
            id=uuid.uuid4(),
            tenant_id=uuid.UUID(tenant_id),
            code=spec["code"],
            version=spec["version"],
            title=spec["title"],
            body_md=spec["body_md"],
            required_fields_jsonb=spec["required_fields"],
        )
        db.add(obj)
        await db.flush()
        code_to_id[spec["code"]] = str(obj.id)
    await db.commit()
    return code_to_id


async def ensure_biometric_markings(db: AsyncSession, tenant_id: str) -> dict[str, str]:
    """生体情報系 marking + assignments を idempotent に投入."""
    code_to_id: dict[str, str] = {}
    existing_m = (await db.execute(
        select(Marking).where(Marking.tenant_id == tenant_id)
    )).scalars().all()
    for m in existing_m:
        code_to_id[m.code] = str(m.id)

    for spec in BIOMETRIC_MARKINGS:
        if spec["code"] in code_to_id:
            continue
        obj = Marking(
            id=uuid.uuid4(),
            tenant_id=uuid.UUID(tenant_id),
            code=spec["code"],
            display_name=spec["display_name"],
            description=spec["description"],
            level=spec["level"],
        )
        db.add(obj)
        await db.flush()
        code_to_id[spec["code"]] = str(obj.id)

    existing_a = (await db.execute(
        select(MarkingAssignment).where(MarkingAssignment.tenant_id == tenant_id)
    )).scalars().all()
    seen = {(a.resource_type, a.resource_id, a.column_name, str(a.marking_id)) for a in existing_a}

    for resource_type, resource_id, column_name, marking_code in BIOMETRIC_ASSIGNMENTS:
        marking_id = code_to_id.get(marking_code)
        if not marking_id:
            continue
        key = (resource_type, resource_id, column_name, marking_id)
        if key in seen:
            continue
        db.add(MarkingAssignment(
            id=uuid.uuid4(),
            tenant_id=uuid.UUID(tenant_id),
            marking_id=uuid.UUID(marking_id),
            resource_type=resource_type,
            resource_id=resource_id,
            column_name=column_name,
        ))

    await db.commit()
    return code_to_id
