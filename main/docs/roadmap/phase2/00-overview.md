# Phase 2 — 70点 → 100点 ロードマップ総論

## 現在位置
**70 / 100点**

Phase 1 で骨格・縦軸（業界深掘り）・LLM・ワークスペース・デプロイ基盤までは取った。残るのは：
1. 取りこぼした **配線ミス**（壊れた API パス、UI 未配線）
2. **半実装の完遂**（コネクタの永続化、認証の SSO 化）
3. **未着手の最後のブロック**（パイロット実走、Huff、列マスク）

## 残30点の内訳

| # | 領域 | 残点 | 主な未完項目 |
|---|------|------|------------|
| 01 | 動的オントロジー | 4 | UI v2 refresh、Brand→ontology_instances 移行 |
| 02 | 実コネクタ | 7 | OAuth flow、canonical 永続化、scheduler、実本番接続 |
| 03 | LLM | 3 | フロント /chat 配線、prompt caching、RAG、governance UI |
| 04 | ワークスペース | 3 | Pivot/cohort UI、export、MeetingPack 統合 |
| 05 | 認証 | 5 | SSO (OIDC/SAML)、MFA、列マスク、AccessLog、IdP 設定 |
| 06 | デプロイ | 1 | terraform apply 実証、OTel runtime、DR drill |
| 07 | パイロット | 5 | 1社で8週POC完走、価値計測 |
| 08 | 業界深掘り | 2 | 商圏Huff、価格弾力性 |
| | **合計** | **30** | |

## Phase 2 スプリント計画

| Sprint | 期間 | 焦点 | 増点 | 累計 |
|--------|------|------|------|------|
| **S0** | 1日 | 配線ミス修正（API path、UI wiring） | +3 | 73 |
| **S1** | 1.5週 | 02 コネクタ完成（OAuth + 永続化 + scheduler） | +7 | 80 |
| **S2** | 1.5週 | 03 LLM + 04 Workspace 完遂（並列） | +6 | 86 |
| **S3** | 2週 | 05 認証フル実装（SSO/MFA/ACL） | +5 | 91 |
| **S4** | 1週 | 01仕上げ + 06 deploy verify + 08 Huff/Price | +4 | 95 |
| **S5** | 8週 | 07 パイロット実走（並行で全体改善） | +5 | 100 |

**短期スプリント（S0〜S4）合計: 6週間**
**S5 はクリティカルパス、並列で他改善継続**

## 仕様書一覧

| 文書 | 対応スプリント | 増点 |
|------|--------------|------|
| [01-quick-fixes.md](./01-quick-fixes.md) | S0 | +3 |
| [02-connector-real.md](./02-connector-real.md) | S1 | +7 |
| [03-llm-finalize.md](./03-llm-finalize.md) | S2 | +3 |
| [04-workspace-finalize.md](./04-workspace-finalize.md) | S2 | +3 |
| [05-auth-enterprise.md](./05-auth-enterprise.md) | S3 | +5 |
| [06-deploy-verify.md](./06-deploy-verify.md) | S4 | +1 |
| [07-pilot-execution.md](./07-pilot-execution.md) | S5 | +5 |
| [08-vertical-final.md](./08-vertical-final.md) | S4 | +2 |
| [09-ontology-finalize.md](./09-ontology-finalize.md) | S4 | +4 |

## 依存関係

```
S0 (1日) ──┬──> S1 (1.5週) ──┬──> S5 (8週 / pilot) ────┐
           │                  │                         │
           └─> S2 (1.5週) ────┘                         │
               (S0 で配線済前提)                        │
                                                         ▼
S3 (2週) ───────────────────────┬──────────────────────> 100点
                                │
S4 (1週) ────────────────────── ┘
```

S0 が全ての前提（壊れた配線が直ってないと S2 で更に上塗りになる）。S1〜S4 は概ね並列可だが、S5 開始までに S1（コネクタ）と S3（認証）が完了している必要がある。

## ステージゲート

- **73点 (S0完了)**: デモが嘘なく動く
- **80点 (S1完了)**: 顧客POCの最低ライン到達
- **86点 (S2完了)**: AI と分析がプロダクトの売りになる
- **91点 (S3完了)**: エンタープライズ商談に入れる
- **95点 (S4完了)**: 全機能本番運用準備完了
- **100点 (S5完了)**: 業界デファクト候補、本契約獲得

## 必要リソース

| 役割 | 期間 | 主担当スプリント |
|------|------|----------------|
| BE エンジニア 1名 | 全期間 | S0/S1/S2/S3 |
| FE エンジニア 1名 | 全期間 | S0/S2/S4 |
| インフラ/SRE 1名 | S3〜 | S3/S4/S5W1 |
| CS / 営業 1名 | S5〜 | S5 |

**合計: 4名 × 14週間 ≈ 14人月**

## 採点更新ルール

各仕様書の `完了基準` を全達成したら [SCORE.md](../SCORE.md) を更新。Sprint 完了時に `scripts/grade.sh`（S0で作成）を回して自動採点。
