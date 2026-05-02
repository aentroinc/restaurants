# S-F — デプロイローカル検証（+2点 / 1日）

## 現状
- Terraform 6モジュール + Helm chart + CI/CD YAML は書面として存在
- Dockerfile.prod（multi-stage）あり
- **一度も検証していない**: Dockerfile.prodでビルドすら通っていない
- OTel組込み未実装

## ゴール
docker compose up 一発で production-like な構成が起動し、全サービスが正常動作。CI pipelineがローカルで完走。

---

## 実装手順

### Step 1: Dockerfile.prod でビルド検証（2時間）

```bash
# Backend
cd main/backend
docker build -f Dockerfile.prod -t aentro-api:prod .
docker run --rm aentro-api:prod python -c "from app.main import app; print('OK')"

# Frontend
cd main/frontend
docker build -f Dockerfile.prod -t aentro-web:prod .
```

ビルドが通らなければ修正:
- 依存パッケージ不足
- COPY パスずれ
- next.config.js に `output: 'standalone'` が入っているか
- requirements.txt の最新化

### Step 2: docker-compose.prod.yml 作成（1時間）

`main/docker-compose.prod.yml`:
```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: aentro
      POSTGRES_PASSWORD: ${DB_PASSWORD:-aentro_prod}
      POSTGRES_DB: restaurant_os
    volumes:
      - pgdata_prod:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U aentro"]
      interval: 10s
      retries: 5

  api:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    ports:
      - "8000:8000"
    env_file:
      - ./backend/.env
    environment:
      DATABASE_URL: postgresql+asyncpg://aentro:${DB_PASSWORD:-aentro_prod}@db:5432/restaurant_os
      DATABASE_URL_SYNC: postgresql://aentro:${DB_PASSWORD:-aentro_prod}@db:5432/restaurant_os
      ENVIRONMENT: production
    depends_on:
      db:
        condition: service_healthy
    # NO volume mount, NO --reload

  web:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:8000
    depends_on:
      - api

volumes:
  pgdata_prod:
```

検証:
```bash
docker compose -f docker-compose.prod.yml up --build -d
sleep 10
curl http://localhost:8000/health  # 200
curl http://localhost:3000/        # 200
```

### Step 3: CI パイプラインローカル検証（2時間）

`act` (GitHub Actions ローカル実行ツール) または手動で CI ステップを実行:

```bash
# Lint
cd main/backend && pip install ruff && ruff check app/
cd main/frontend && npx tsc --noEmit

# Test
cd main/backend && python -m pytest tests/ -v  # tests/ にテスト追加
cd main/frontend && npm run build  # ビルド通過 = フロントテスト相当

# Security
pip install pip-audit && pip-audit -r requirements.txt
cd main/frontend && npm audit --audit-level=moderate
```

### Step 4: 基本テスト追加（2時間）

`backend/tests/test_health.py`:
```python
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_health():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r = await ac.get("/health")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"

@pytest.mark.asyncio
async def test_executive_summary():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r = await ac.get("/api/v1/executive/summary")
        assert r.status_code == 200
        data = r.json()["data"]
        assert data["total_stores"] > 0
```

`backend/tests/conftest.py`:
```python
import pytest
# テスト用のDB設定等
```

5本以上のテスト: health, executive summary, store ranking, tasks CRUD, AI suggested questions

### Step 5: Makefile更新（30分）

`main/Makefile` に追加:
```makefile
prod:
	docker compose -f docker-compose.prod.yml up --build -d

prod-down:
	docker compose -f docker-compose.prod.yml down

lint:
	cd backend && ruff check app/
	cd frontend && npx tsc --noEmit

test:
	cd backend && python -m pytest tests/ -v

ci:
	$(MAKE) lint
	$(MAKE) test
	cd frontend && npm run build
```

---

## 完了基準
- [ ] `Dockerfile.prod` で backend / frontend がビルド成功
- [ ] `docker compose -f docker-compose.prod.yml up` で3サービス起動、全ページ200 OK
- [ ] prod構成で volume mount なし、--reload なし（本番と同じ起動方法）
- [ ] `make lint` が通る（ruff + tsc）
- [ ] `make test` で pytest 5本以上が全 PASS
- [ ] `make ci` が1コマンドで lint + test + build 完走
- [ ] healthcheck で API/Web 両方が自動復旧する
