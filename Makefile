SHELL := /bin/bash

NPM := npm

.DEFAULT_GOAL := help

.PHONY: help format format-all typecheck build check

help: ## Show available targets
	@awk 'BEGIN {FS = ":.*##"; printf "Available targets:\n"} /^[a-zA-Z0-9_-]+:.*##/ {printf "  %-14s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

format: ## Format project files
	$(NPM) run format

format-all: ## Format every non-ignored project file
	$(NPM) run format-all

typecheck: ## Run TypeScript/Vue type checks
	$(NPM) run typecheck

build: ## Build the extension
	$(NPM) run build

check: ## Run the project verification script
	$(NPM) run check
