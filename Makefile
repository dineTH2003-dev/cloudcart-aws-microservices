.PHONY: help build up down restart logs test clean lint

help: ## Display available commands
	@echo "CloudCart Platform - Makefile targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-18s\033[0m %s\n", $$1, $$2}'

build: ## Build all microservice Docker images locally
	docker compose build

up: ## Start local platform (Postgres, LocalStack, and all 5 microservices + Frontend)
	docker compose up -d
	@echo "Waiting for services to become healthy..."
	@sleep 8
	@echo "CloudCart is live at http://localhost:3000"

down: ## Stop all local platform containers
	docker compose down

restart: down up ## Restart the platform

logs: ## Tail logs across all microservices
	docker compose logs -f

test: ## Execute end-to-end integration test
	./tests/integration/test-checkout.sh

clean: ## Stop and remove all containers, networks, and persistent volumes
	docker compose down -v --remove-orphans
