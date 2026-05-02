.PHONY: up down build seed migrate test lint docs docs-read docs-serve prod prod-down prod-build prod-up prod-test ci bundle promote rollback smoke release-dryrun

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

# --- Release management (Foundry Apollo equivalent) -----------------------
# Usage:
#   make bundle SHA=abc1234
#   make promote FROM=dev TO=staging SHA=abc1234
#   make rollback ENV=prod SHA=abc1234
#   make smoke ENV=staging
#   make release-dryrun SHA=abc1234   (full pipeline locally with DRYRUN=1)
SHA ?= $(shell git rev-parse --short HEAD 2>/dev/null)
FROM ?= dev
TO ?= staging
ENV ?= staging

bundle:
	@chmod +x infra/scripts/*.sh
	@SHA=$(SHA) infra/scripts/bundle.sh

promote:
	@chmod +x infra/scripts/*.sh
	@infra/scripts/promote.sh $(FROM) $(TO) $(SHA)

rollback:
	@chmod +x infra/scripts/*.sh
	@infra/scripts/rollback.sh $(ENV) $(SHA)

smoke:
	@chmod +x infra/scripts/healthcheck.sh
	@infra/scripts/healthcheck.sh https://$(if $(filter prod,$(ENV)),app,$(ENV)).aentro.io 30 10

release-dryrun:
	@DRYRUN=1 SHA=$(SHA) $(MAKE) bundle
	@DRYRUN=1 $(MAKE) promote FROM=dev TO=staging SHA=$(SHA)
	@DRYRUN=1 $(MAKE) promote FROM=staging TO=prod SHA=$(SHA)
