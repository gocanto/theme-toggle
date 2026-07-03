SHELL := /bin/bash

PNPM := pnpm

# Cloudflare Pages deploy target (override CF_BRANCH=<branch> for a preview deploy).
CF_PAGES_PROJECT := dark-mode-lite-web
CF_BRANCH ?= main

.DEFAULT_GOAL := help

.PHONY: help format format-all typecheck build check web build-web deploy-web

help: ## Show available targets
	@awk 'BEGIN {FS = ":.*##"; printf "Available targets:\n"} /^[a-zA-Z0-9_-]+:.*##/ {printf "  %-14s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

format: ## Format project files
	$(PNPM) run format

format-all: ## Format every non-ignored project file
	$(PNPM) run format-all

typecheck: ## Run TypeScript/Vue type checks
	$(PNPM) run typecheck

build: ## Build the extension
	$(PNPM) run build

web: ## Run the landing-page dev server (VitePress)
	$(PNPM) run dev:web

build-web: ## Build the landing page (VitePress)
	$(PNPM) run build:web

deploy-web: build-web ## Build & deploy the landing page to Cloudflare Pages (CF_BRANCH=main)
	cd apps/web && npx wrangler pages deploy .vitepress/dist --project-name $(CF_PAGES_PROJECT) --branch $(CF_BRANCH)

check: ## Run the project verification script
	$(PNPM) run check
