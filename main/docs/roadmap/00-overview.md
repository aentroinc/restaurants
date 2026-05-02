# 00 — 38点 → 100点 ロードマップ総論

## 現在位置
**38 / 100点**（"日本の外食専用 Palantir" 軸）

骨格は揃った。Foundryの主要概念（Ontology / Lineage / Writeback / DQ / KPI Registry / Workflow / Audit）が型として存在し、外食バーティカルのページも23枚ある。一方、**動的化・実データ化・AI実装・本番運用化**が全部モックの域を出ない。

## ターゲット採点表

| # | 領域 | 現状 | ゴール | 増点 | 仕様書 |
|---|------|------|--------|------|--------|
| 01 | 動的オントロジー | 静的 ORM 型 | DB-driven + バージョニング + 編集UI | +10 | [01-dynamic-ontology.md](./01-dynamic-ontology.md) |
| 02 | 実コネクタ | seed のみ | Airレジ / スマレジ / Square 1本以上 本番接続 | +12 | [02-real-connectors.md](./02-real-connectors.md) |
| 03 | LLM AI Analyst | 静的 mock insight | claude-opus-4-7 + tool use + RAG | +8 | [03-llm-ai-analyst.md](./03-llm-ai-analyst.md) |
| 04 | 分析ワークスペース | なし | コホート / Pivot / カスタムKPI builder | +8 | [04-analytical-workspace.md](./04-analytical-workspace.md) |
| 05 | エンタープライズ認証 | JWT + tenant_id 一段 | SSO (OIDC/SAML) + RBAC + 行列ACL | +7 | [05-enterprise-auth.md](./05-enterprise-auth.md) |
| 06 | デプロイ堅牢化 | docker-compose | Terraform + Helm + SOPS + OTel | +5 | [06-deployment-hardening.md](./06-deployment-hardening.md) |
| 07 | パイロット顧客運用 | tests/ 空 | 1社 8週POC 完走 + 価値計測 | +5 | [07-customer-pilot.md](./07-customer-pilot.md) |
| 08 | 業界深掘り | 標準SaaS的 | BOM/レシピ原価, シフト法令, QSC, FC会計 | +7 | [08-vertical-depth.md](./08-vertical-depth.md) |
| | **合計** | **38** | **100** | **+62** | |

## 依存関係

```
01 (動的オントロジー) ──┬──> 04 (ワークスペース)
                        └──> 03 (AI tool定義)
02 (実コネクタ) ──> 07 (パイロット)
05 (認証) ──┬──> 06 (デプロイ)
            └──> 07 (パイロット)
08 (業界深掘り) は 01 完了後に dynamic で投入可能
```

## 推奨着手順
1. **01 動的オントロジー**（基盤。これがないと 03/04/08 がモックで詰まる）
2. **02 実コネクタ**（顧客提案の最大の弱点。1本通せば信用が一段上がる）
3. **03 LLM**（顧客が一番欲しがる目玉機能）
4. **05 認証** + **06 デプロイ**（並列。pilot前の最低ライン）
5. **07 パイロット**（実顧客で点数の正当性を担保）
6. **04 ワークスペース** + **08 業界深掘り**（差別化の上積み）

## 採点更新ルール
各領域の `完了基準` セクションが全項目チェックになったら点数加算。`docs/roadmap/SCORE.md` に都度反映。

## ステージゲート
| 累計点 | 状態 | 次の意思決定 |
|--------|------|------------|
| 50点 | MVP+ | 1社目POC開始判断 |
| 65点 | 製品化目前 | 営業開始 / 価格表確定 |
| 80点 | プロダクション可 | 5社並行運用 |
| 100点 | 業界デファクト候補 | 上場 or M&A 検討段階 |

---
**注意**: 100点は「Palantir Foundryの外食版相当」を意味する。Foundryを超える（業界特化で勝つ）には、08 業界深掘りを 7点以上に引き上げる必要がある。
