#!/usr/bin/env bash
# Génère les types TypeScript depuis l'OpenAPI de apps/agent
# Usage: ./scripts/gen-contracts.sh (run from monorepo root)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "→ Export OpenAPI depuis apps/agent..."
cd "$REPO_ROOT/apps/agent"
uv run python scripts/export_openapi.py

echo "→ Copie vers packages/contracts..."
cp "$REPO_ROOT/apps/agent/openapi.json" "$REPO_ROOT/packages/contracts/openapi.json"

echo "→ Génération des types TypeScript..."
cd "$REPO_ROOT"
pnpm --filter @isimple/contracts run gen

echo "✓ Contrats TypeScript à jour dans packages/contracts/src/generated.ts"
