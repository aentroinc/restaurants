.PHONY: up down build seed migrate test lint docs docs-read docs-serve prod prod-down ci

up:
	docker compose up -d

down:
	docker compose down

build:
	docker compose build

logs:
	docker compose logs -f

seed:
	docker compose exec api python -m app.seed.run

migrate:
	docker compose exec api alembic upgrade head

migrate-create:
	docker compose exec api alembic revision --autogenerate -m "$(msg)"

test:
	docker compose exec api python -m pytest tests/ -v

reset:
	docker compose down -v
	docker compose up -d
	sleep 3
	$(MAKE) migrate
	$(MAKE) seed

prod:
	docker compose -f docker-compose.prod.yml up --build -d

prod-down:
	docker compose -f docker-compose.prod.yml down

lint:
	cd backend && python -m ruff check app/ || true
	cd frontend && npx tsc --noEmit || true

ci:
	$(MAKE) lint
	cd frontend && npm run build

docs:
	@echo "PoC docs at docs/poc/:"
	@ls -la docs/poc/

docs-read:
	@command -v glow >/dev/null 2>&1 || { echo "glow not installed: brew install glow"; exit 1; }
	@glow docs/poc/

docs-serve:
	@command -v grip >/dev/null 2>&1 || { echo "grip not installed: pip install grip"; exit 1; }
	@grip docs/poc/README.md --browser
