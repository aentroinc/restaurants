.PHONY: up down build seed migrate test lint docs docs-read docs-serve prod prod-down prod-build prod-up prod-test ci

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

prod-build:
	docker compose -f docker-compose.prod.yml build

prod-up:
	docker compose -f docker-compose.prod.yml up -d

prod-down:
	docker compose -f docker-compose.prod.yml down

prod-test:
	@echo "Building prod..."
	docker compose -f docker-compose.prod.yml up --build -d
	@sleep 15
	@echo "Testing API..."
	@curl -sf http://localhost:8000/health > /dev/null && echo "API: OK" || echo "API: FAIL"
	@curl -sf http://localhost:3000/ > /dev/null && echo "Web: OK" || echo "Web: FAIL"
	docker compose -f docker-compose.prod.yml down

prod:
	docker compose -f docker-compose.prod.yml up --build -d

lint:
	cd backend && python -m ruff check app/ || true
	cd frontend && npx tsc --noEmit || true

ci: lint test
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
