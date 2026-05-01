.PHONY: up down build seed migrate test lint docs docs-read docs-serve

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
	docker compose exec api pytest -v

reset:
	docker compose down -v
	docker compose up -d
	sleep 3
	$(MAKE) migrate
	$(MAKE) seed

docs:
	@echo "PoC docs at docs/poc/:"
	@ls -la docs/poc/

docs-read:
	@command -v glow >/dev/null 2>&1 || { echo "glow not installed: brew install glow"; exit 1; }
	@glow docs/poc/

docs-serve:
	@command -v grip >/dev/null 2>&1 || { echo "grip not installed: pip install grip"; exit 1; }
	@grip docs/poc/README.md --browser
