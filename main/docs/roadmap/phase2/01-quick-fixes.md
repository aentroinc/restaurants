# Phase 2 / S0 — 配線ミス修正（+3点 / 1日）

## 課題
Phase 1 で作った frontend ページの大半が **間違った API パスを叩いていて 404**。BE は実装済なのに UI が空になる。AI Analyst も新 `/chat` SSE ではなく旧 `/query` 呼びっぱなし。**コードはあるが動いてない**状態を解消する。

## ゴール
壊れた配線を1日で全直し、デモが嘘なく動くようにする。

---

## 仕様書

### 修正対象（API path）

| ファイル | 旧（壊） | 新（正） |
|---------|---------|---------|
| `frontend/src/app/recipes/page.tsx` | `/api/v1/recipes` | `/api/v1/vertical/recipes` |
| `frontend/src/app/recipes/page.tsx` | `/api/v1/ingredients` | `/api/v1/vertical/ingredients` |
| `frontend/src/app/labor/page.tsx` | `/api/v1/labor/shifts` | `/api/v1/vertical/labor/shifts` |
| `frontend/src/app/labor/page.tsx` | `/api/v1/labor/compliance` | `/api/v1/vertical/labor/compliance-report` |
| `frontend/src/app/qsc/page.tsx` | `/api/v1/qsc/audits` | `/api/v1/vertical/qsc/audits` |
| `frontend/src/app/haccp/page.tsx` | `/api/v1/haccp/*` | `/api/v1/vertical/haccp/*` |
| `frontend/src/app/franchise/page.tsx` | `/api/v1/franchise/*` | `/api/v1/vertical/franchise/*` |
| `frontend/src/app/admin/roles/page.tsx` | `/api/v1/admin/roles` | `/api/v1/rbac/roles` |
| `frontend/src/app/admin/roles/page.tsx` | `/api/v1/admin/roles/{id}/permissions` | `/api/v1/rbac/roles/{id}/permissions` |

### AI Analyst の SSE 化

`frontend/src/app/ai-analyst/page.tsx` を全面書き直し：
- `fetchAPI("/api/v1/ai/query", {body})` を削除
- `/api/v1/ai/chat` に SSE で接続
- ストリーミングで `text` / `tool_use` / `tool_result` / `done` イベントを処理
- セッション管理（`session_id` を localStorage に保持）
- メッセージ履歴を画面に積む

クライアント実装：
```typescript
async function streamChat(message: string, sessionId: string | null) {
  const res = await fetch("/api/v1/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, session_id: sessionId }),
  });
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const event = JSON.parse(line.slice(6));
      yield event;  // {type, content, name, input, output, ...}
    }
  }
}
```

### sidebar の整合性
`frontend/src/components/sidebar.tsx` を確認、新ページが全部リンクされているか・パス一致しているか。

### 採点スクリプト
`scripts/grade.sh` を新設、各完了基準を自動チェック：
- API path の grep 検査（誤パスが残っていないか）
- BE/FE の起動 → 各ページのデータ取得が 200 OK
- AI chat /chat エンドポイントが SSE を返す
- 結果を `docs/roadmap/SCORE.md` に追記

---

## 指示書（実装手順）

### Step 1: API path 一括置換（30分）
1. 各ファイルを開いて `find /Users/doohyw/restaurants/main/frontend/src/app -name "page.tsx" -exec grep -l "/api/v1/" {} \;` で対象列挙
2. 以下を順番に：
```bash
# recipes
sd '"/api/v1/recipes"' '"/api/v1/vertical/recipes"' main/frontend/src/app/recipes/page.tsx
sd '"/api/v1/ingredients"' '"/api/v1/vertical/ingredients"' main/frontend/src/app/recipes/page.tsx
# labor
sd '"/api/v1/labor/shifts"' '"/api/v1/vertical/labor/shifts"' main/frontend/src/app/labor/page.tsx
sd '"/api/v1/labor/compliance"' '"/api/v1/vertical/labor/compliance-report"' main/frontend/src/app/labor/page.tsx
# qsc/haccp/franchise (vertical/* 配下)
sd '"/api/v1/qsc/' '"/api/v1/vertical/qsc/' main/frontend/src/app/qsc/page.tsx
sd '"/api/v1/haccp/' '"/api/v1/vertical/haccp/' main/frontend/src/app/haccp/page.tsx
sd '"/api/v1/franchise/' '"/api/v1/vertical/franchise/' main/frontend/src/app/franchise/page.tsx
# admin/roles → rbac/
sd '"/api/v1/admin/roles' '"/api/v1/rbac/roles' main/frontend/src/app/admin/roles/page.tsx
```
3. `cd main/frontend && npx tsc --noEmit` で型エラー確認

### Step 2: AI Analyst を /chat SSE に切替（4時間）
1. `frontend/src/lib/api/ai_chat.ts` 新設、上記の SSE generator を実装
2. `frontend/src/app/ai-analyst/page.tsx` 書き直し：
   - `useState<ChatMessage[]>` で履歴管理
   - 入力 → `streamChat()` を `for await` で消費
   - `tool_use` / `tool_result` を inline 表示
   - セッション ID を localStorage `ai_session_id` に保存
3. tool result が KPI 系の場合は recharts で簡易グラフを inline 描画

### Step 3: sidebar の整合確認（30分）
1. `components/sidebar.tsx` を開く
2. 新ページ7枚（workspace, recipes, labor, qsc, haccp, franchise, admin/roles）がリンクされてるか確認
3. なければ追加

### Step 4: 採点スクリプト（2時間）
1. `scripts/grade.sh` 新設：
```bash
#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

# Boot stack
docker compose up -d
sleep 10

# Check 1: no broken /api/v1/<wrong> paths
broken=$(grep -rE '"/api/v1/(recipes|ingredients|labor/(shifts|compliance)|qsc/|haccp/|franchise/|admin/roles)"' frontend/src/app --include="*.tsx" || true)
test -z "$broken" || { echo "FAIL: broken paths still exist"; exit 1; }

# Check 2: each page's data endpoint returns 200
for path in /api/v1/vertical/recipes /api/v1/vertical/ingredients /api/v1/vertical/labor/shifts /api/v1/rbac/roles /api/v1/workspace/analyses; do
  status=$(curl -s -o /dev/null -w "%{http_code}" -H "X-Tenant-Id: 00000000-0000-0000-0000-000000000001" http://localhost:8000$path)
  test "$status" = "200" || { echo "FAIL: $path → $status"; exit 1; }
done

# Check 3: AI chat returns SSE
content_type=$(curl -s -o /dev/null -D - -X POST http://localhost:8000/api/v1/ai/chat -d '{"message":"test"}' -H "Content-Type: application/json" -H "X-Tenant-Id: 00000000-0000-0000-0000-000000000001" | grep -i content-type)
echo "$content_type" | grep -q "text/event-stream" || { echo "FAIL: /chat not SSE"; exit 1; }

echo "PASS: S0 quick-fixes complete"
```
2. CI に追加：`.github/workflows/ci.yml` の `lint` job に `bash scripts/grade.sh` の dry-check を入れる

### Step 5: 動作確認（30分）
1. `make dev` or `docker compose up`
2. ブラウザで全ページを開いてデータが出るか目視
3. AI Analyst で「首都圏で粗利率が低い店トップ5」と聞いて回答が来るか
4. screenshot を `docs/roadmap/phase2/screenshots/` に保存

---

## 完了基準

- [ ] `grep -rE '"/api/v1/(recipes|ingredients|labor/shifts|labor/compliance|qsc/|haccp/|franchise/|admin/roles)"' main/frontend/src/app` で1件もヒットしない
- [ ] /recipes /labor /qsc /haccp /franchise /admin/roles /workspace の7ページ、全てデータが表示される（空白でない）
- [ ] /ai-analyst で実際に Claude にチャットでき、tool 呼出 + 引用付回答がストリーミング表示される
- [ ] `scripts/grade.sh` が exit 0 で終わる
- [ ] スクリーンショット 7 + 1（AI chat）撮影、PR レビュー可能

## 工数見積
- Step 1: 30分
- Step 2: 4時間
- Step 3: 30分
- Step 4: 2時間
- Step 5: 30分
- **合計: 7.5時間（約1日）**

## 増点内訳
- 03 LLM：UI 配線完了で **+1**
- 05 認証：/admin/roles ページが動く **+1**
- 08 業界深掘り：5ページが本当に動く UI に **+1**
- = **+3点**
