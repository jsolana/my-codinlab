.DEFAULT_GOAL := help
SHELL := /bin/bash

RUNNER_ADDR ?= 127.0.0.1:8787
# SANDBOX: local or docker
SANDBOX     ?= local
GO_IMAGE    ?= golang:1.25

RUNNER_FLAGS := --addr $(RUNNER_ADDR) --sandbox $(SANDBOX) --go-image $(GO_IMAGE)

.PHONY: help install dev runner web build build-runner build-web test test-runner test-web test-e2e \
        check vet typecheck fmt logo clean

help: ## Show this help
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z_-]+:.*##/ {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install web and runner dependencies
	cd web && npm install
	cd runner && go mod download

dev: ## Run runner + web dev server together (Ctrl+C stops both)
	@trap 'kill 0' INT TERM EXIT; \
	(cd runner && go run ./cmd/runner $(RUNNER_FLAGS)) & \
	(cd web && RUNNER_URL=http://$(RUNNER_ADDR) npm run dev) & \
	wait

runner: ## Run only the Go runner (SANDBOX=docker for container isolation)
	cd runner && go run ./cmd/runner $(RUNNER_FLAGS)

web: ## Run only the web dev server (expects the runner on RUNNER_ADDR)
	cd web && RUNNER_URL=http://$(RUNNER_ADDR) npm run dev

build: build-runner build-web ## Build everything

build-runner: ## Build the runner binary into runner/bin/
	cd runner && go build -o bin/runner ./cmd/runner

build-web: ## Typecheck and build the web app into web/dist/
	cd web && npm run build

test: test-runner test-web ## Run unit tests (runner + web)

test-runner: ## Run Go tests (needs the Go toolchain)
	cd runner && go test ./...

test-web: ## Run web unit tests
	cd web && npm test

test-e2e: build-runner ## Run real Go solutions against a temporary runner
	@set -e; \
	runner/bin/runner --addr $(RUNNER_ADDR) --sandbox $(SANDBOX) --go-image $(GO_IMAGE) & pid=$$!; \
	trap 'kill $$pid 2>/dev/null' EXIT; sleep 1; \
	cd web && RUNNER_URL=http://$(RUNNER_ADDR) npm test

check: vet typecheck test ## Static checks + unit tests

vet: ## go vet + gofmt check
	cd runner && go vet ./... && test -z "$$(gofmt -l .)" || (echo "gofmt needed: make fmt" && exit 1)

typecheck: ## TypeScript typecheck
	cd web && npm run typecheck

fmt: ## Format Go code
	cd runner && gofmt -w .

logo: ## Regenerate assets/logo.svg
	python3 assets/generate_logo.py assets/logo.svg

clean: ## Remove build artifacts
	rm -rf runner/bin web/dist
