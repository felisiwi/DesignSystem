#!/bin/bash
# claude-sync - Bash equivalent of PowerShell claude-sync function
# Usage: ./claude-sync.sh

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Change to project root
cd "$PROJECT_ROOT" || exit 1

# Stage, commit, and push
git add .
git commit -m "Sync Claude session notes"
git push

echo "✅ Session notes synced!"

