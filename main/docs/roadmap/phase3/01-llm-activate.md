# S-A — LLM有効化 + 完遂（+4点 / 1日）

## 現状
- Anthropic SDK統合済、6ツール定義済、SSEストリーミング実装済
- **クレジット切れで実動作しない**
- フロントのAI Analystは旧 `/api/v1/ai/query` にフォールバック中
- prompt caching実装済だが未検証
- RAG（pgvector + ドキュメント検索）未実装

## ゴール
AIに「すき家の首都圏で原価率が悪い店は？」と聞くと、Claude APIが6ツールで実データを引き、根拠付きストリーミング回答を返す。

---

## 実装手順

### Step 1: Anthropicクレジット追加（5分）
1. https://console.anthropic.com/settings/plans でクレジット購入（$20で十分）
2. `.env` の `ANTHROPIC_API_KEY` が有効か確認
3. `docker compose up -d api` で再起動
4. テスト: `curl -X POST http://localhost:8000/api/v1/ai/chat -H "Content-Type: application/json" -d '{"message":"すき家の売上トップ3は？"}'`

### Step 2: AI Chat フォールバック改善（2時間）
`backend/app/api/v1/ai_chat.py` 修正:
- LLM API呼び出しが失敗した場合（クレジット切れ、ネットワークエラー）、既存ルールベースAI `/api/v1/ai/query` の結果をSSE形式で返す
- エラー時に「AIサービスに接続できません。ルールベース分析にフォールバックします」を `type: "system"` イベントで通知

### Step 3: prompt caching検証（1時間）
1. 連続で5回質問を投げる
2. `audit_log` から `cache_read_input_tokens` / `cache_creation_input_tokens` を確認
3. 2回目以降で80%以上キャッシュヒットするか確認
4. しなければ `system_prompt.py` の `cache_control` ブロック分割を調整

### Step 4: ツール実行の堅牢化（2時間）
`backend/app/services/ai/tools.py` 修正:
- 各ツール実行に `try/except` を追加。DB接続エラー等でもLLMに「データ取得に失敗しました」と伝えて続行させる
- ツール結果が巨大（1000行超）の場合、上位20件に切り詰めてトークン節約
- ツール実行時間を `audit_log` に記録（遅いツールの特定用）

### Step 5: フロントSSE表示の改善（2時間）
`frontend/src/app/ai-analyst/page.tsx` 修正:
- ストリーミング中に「思考中...」インジケータ表示
- `tool_use` イベント時に「🔍 {tool_name} を実行中...」カード表示
- `tool_result` イベント時にデータサマリ表示（テーブル or 数値カード）
- `done` イベント時にトークン使用量をフッターに小さく表示

### Step 6: 推奨質問の改善（30分）
`backend/app/api/v1/ai.py` の `suggested-questions` を更新:
```python
SUGGESTED_QUESTIONS = [
    {"question": "すき家の首都圏で原価率が最も高い店舗は？", "category": "原価"},
    {"question": "はま寿司で今月客数が前年割れの店舗を教えて", "category": "売上"},
    {"question": "ココスの人件費率が35%を超えている店舗はどこ？", "category": "人件費"},
    {"question": "改善施策の効果が出ている店舗を教えて", "category": "改善"},
    {"question": "今週SVが訪問すべき優先店舗は？", "category": "SV"},
    {"question": "全ブランドのFL比率を比較して", "category": "経営"},
    {"question": "なか卯のテイクアウト比率の推移は？", "category": "チャネル"},
    {"question": "ジョリーパスタの値上げ後の客数影響は？", "category": "価格"},
]
```

---

## 完了基準
- [ ] `/api/v1/ai/chat` でClaudeが実データからtool useで回答する
- [ ] 連続質問で2回目以降のprompt cachingヒット率 > 80%
- [ ] LLM APIエラー時にルールベースフォールバックが動作する
- [ ] フロントでストリーミング表示（tool呼出 → 結果 → テキスト）が動く
- [ ] 推奨質問8問が全てゼンショー固有
- [ ] 全LLM呼び出しが `audit_log` + `ai_query_logs` に記録される
