# S6 — モック一掃・API完全接続（+5点 / 2日）

## 現状 → ゴール
多くのフロントエンドページがAPIフェッチ失敗時にmock-data.tsのハードコードデータにフォールバックしている。これは開発中は便利だが、**デモで「本当にDBから来てるのか？」と疑われる原因になる**。

→ 全画面がAPIからデータ取得。APIが落ちている場合のみローディングエラー表示（モックフォールバックなし）。

---

## Step 1: 全画面のAPI接続状況監査（1時間）

各ページファイルを読み、以下を分類:

### A: API接続済み（変更不要）
直接 `fetchAPI("/api/v1/...")` を呼び、成功時にデータ表示、失敗時にエラー表示するページ。

### B: モックフォールバック依存（修正必要）
`fetchAPI` が失敗すると `mock-data.ts` から静的データを返すページ。

### C: 完全モック（修正必要）
APIを呼ばず、ページ内でハードコードしたデータを表示するページ。

監査スクリプト:
```bash
# mock-data.ts の関数/変数を参照しているページを検索
grep -rn "mock\|Mock\|MOCK" frontend/src/app/ --include="*.tsx" | grep -v node_modules
```

## Step 2: api.ts のフォールバック挙動変更（1時間）

現在の `frontend/src/lib/api.ts`:
```typescript
// 現在: API失敗 → mock返却
if (!response.ok) {
  return fetchMock(path);  // ← これを除去
}
```

変更後:
```typescript
export async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_URL}${path}`;
  try {
    const response = await fetch(url, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders(), ...options?.headers },
    });
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    const json = await response.json();
    return json.data ?? json;
  } catch (error) {
    // API_URLが未設定の場合のみmockフォールバック（開発用）
    if (!API_URL) {
      return fetchMock<T>(path);
    }
    throw error;  // API_URL設定済みなら例外を投げる
  }
}
```

**重要**: `NEXT_PUBLIC_API_URL` が設定されている場合はモック不使用。未設定時のみフォールバック。

## Step 3: 各ページのエラーハンドリング統一（4時間）

全ページに統一エラー/ローディング表示を追加:

```tsx
// 共通パターン
const [data, setData] = useState<T | null>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  fetchAPI<T>("/api/v1/...")
    .then(setData)
    .catch(e => setError(e.message))
    .finally(() => setLoading(false));
}, []);

if (loading) return <LoadingState />;
if (error) return <ErrorState message={error} />;
if (!data) return <EmptyState />;
```

共通コンポーネント `frontend/src/components/states.tsx`:
```tsx
export function LoadingState() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-pulse text-white/40">読み込み中...</div>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <AlertCircle className="w-8 h-8 text-red-400" />
      <p className="text-white/60 text-sm">データ取得に失敗しました</p>
      <p className="text-white/30 text-xs">{message}</p>
      <Button variant="ghost" size="sm" onClick={() => window.location.reload()}>
        再読み込み
      </Button>
    </div>
  );
}

export function EmptyState({ message = "データがありません" }: { message?: string }) {
  return (
    <div className="flex items-center justify-center h-64">
      <p className="text-white/40 text-sm">{message}</p>
    </div>
  );
}
```

## Step 4: ページ別修正対象（8時間）

### 経営司令塔 (page.tsx)
現状: ページ内にハードコードしたデータ（`seededRandom(42)` で生成）
修正: APIから取得に切替:
- Executive summary → `/api/v1/executive/summary`
- Store ranking → `/api/v1/stores/ranking?page_size=10&sort_by=health_score&sort_dir=asc`
- Issues → `/api/v1/executive/issues`

**注**: このページは最も複雑。ブランド別KPI、インシデント、マップ等はAPIに対応するエンドポイントがない部分もある。そこは:
- ブランド別KPI → executive/summaryのbrands配列を使用
- インシデント → `/api/v1/executive/issues` のissuesをインシデント風に表示
- マップ → stores/rankingの lat/lng を使用

### Vertical ページ群
recipes, labor, qsc, haccp, franchise: S0で修正済（`/api/v1/vertical/...`）。確認のみ。

### Admin ページ群
ontology, kpi-definitions, data-sources, lineage, writeback, ai-governance, roles, users, access-logs:
各ページで `fetchAPI` 呼出が正しいパスか確認。モック残存を除去。

### workspace
分析一覧/カスタムKPI/コホート: API呼出確認。panel実行はバックエンド `/analyses/{id}/run` に接続。

## Step 5: APIレスポンス形式の統一チェック（1時間）

全APIが `{data, meta, errors}` 形式を返しているか確認:

```bash
# 全エンドポイントのレスポンス形式チェック
for ep in /api/v1/executive/summary /api/v1/stores/ranking /api/v1/tasks /api/v1/vertical/recipes /api/v1/workspace/analyses /api/v1/rbac/roles; do
  response=$(curl -s http://localhost:8000$ep)
  has_data=$(echo "$response" | python3 -c "import json,sys; d=json.load(sys.stdin); print('data' in d)")
  echo "$ep: data=$has_data"
done
```

形式が違うエンドポイントがあれば修正。

## Step 6: 接続確認ダッシュボード（30分）

デバッグ用に `/admin/system-status` ページを追加:
- 各APIエンドポイントの接続状態をリアルタイム確認
- 緑: 200 OK、赤: エラー、灰: 未テスト
- 最終確認日時

---

## 完了基準

- [ ] `NEXT_PUBLIC_API_URL=http://localhost:8000` 設定時、全ページがAPIからデータ取得
- [ ] モックデータにフォールバックするページが0（`NEXT_PUBLIC_API_URL` 設定時）
- [ ] API接続エラー時に統一エラー画面が表示される（白画面にならない）
- [ ] ローディング中にスピナー/プレースホルダーが表示される
- [ ] 経営司令塔(page.tsx)がAPIデータで描画される
- [ ] 全APIエンドポイントが `{data, meta, errors}` 形式
- [ ] `/admin/system-status` で全エンドポイントの接続状態が確認可能
