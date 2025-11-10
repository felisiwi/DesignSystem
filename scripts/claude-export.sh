#!/bin/bash
# claude-export - Bash equivalent of PowerShell claude-export function
# Usage: ./claude-export.sh [ComponentName|all]

# Get component name from arguments, or "all" if no arguments
COMPONENT="${1:-all}"

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Change to project root
cd "$PROJECT_ROOT" || exit 1

# If "all" or empty, process all components
if [ "$COMPONENT" = "all" ] || [ -z "$COMPONENT" ]; then
    echo "Processing ALL components..." | grep --color=always ".*"
    
    # Get all component directories
    if [ ! -d "notes/claude-sessions" ]; then
        echo "❌ No component directories found in notes/claude-sessions/" >&2
        exit 1
    fi
    
    COMPONENT_DIRS=$(find notes/claude-sessions -mindepth 1 -maxdepth 1 -type d)
    
    if [ -z "$COMPONENT_DIRS" ]; then
        echo "❌ No component directories found in notes/claude-sessions/" >&2
        exit 1
    fi
    
    for dir in $COMPONENT_DIRS; do
        comp_name=$(basename "$dir")
        echo ""
        echo "Processing component: $comp_name" | grep --color=always ".*"
        bash "$SCRIPT_DIR/post_chat.sh" "$comp_name"
        
        # Small delay between components to avoid git conflicts
        sleep 0.5
    done
    
    echo ""
    echo "✅ Finished processing all components!"
else
    # Process single component
    bash "$SCRIPT_DIR/post_chat.sh" "$COMPONENT"
fi

