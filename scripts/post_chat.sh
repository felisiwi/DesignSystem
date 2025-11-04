#!/bin/bash
# post_chat.sh — upgraded automation for component session integration (supports any component)

# Get component name from first argument, default to Carousel
# Debug: Show what arguments were received
if [ "$DEBUG" = "true" ]; then
  echo "DEBUG: Received $# arguments"
  echo "DEBUG: Arg 1: '$1'"
  echo "DEBUG: Arg 2: '$2'"
fi

COMPONENT="${1:-Carousel}"

# Derive session directory from component name
SESSION_DIR="notes/claude-sessions/$COMPONENT"

# Check if directory exists
if [ ! -d "$SESSION_DIR" ]; then
  echo "❌ Component directory not found: $SESSION_DIR"
  echo "Available components:"
  ls -d notes/claude-sessions/*/ 2>/dev/null | sed 's|notes/claude-sessions/||' | sed 's|/||' || echo "  (none found)"
  exit 1
fi

# Find the master file (look for *MASTER.md in the component directory)
MASTER_FILE=$(find "$SESSION_DIR" -maxdepth 1 -name "*MASTER.md" -type f | head -n 1)

if [ -z "$MASTER_FILE" ]; then
  echo "❌ Master file not found in $SESSION_DIR"
  echo "Expected a file matching pattern: *MASTER.md"
  exit 1
fi

# Find the most recently modified session markdown file (excluding the master)
LATEST_SESSION=$(find "$SESSION_DIR" -maxdepth 1 -name "*.md" -type f ! -name "*MASTER*" -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -n 1 | cut -d' ' -f2-)

# Fallback for systems without find -printf (like macOS)
if [ -z "$LATEST_SESSION" ]; then
  LATEST_SESSION=$(ls -t "$SESSION_DIR"/*.md 2>/dev/null | grep -v "MASTER" | head -n 1)
fi

if [ -z "$LATEST_SESSION" ]; then
  echo "❌ No session files found in $SESSION_DIR (excluding master files)."
  exit 1
fi

echo "🟣 Processing latest session: $(basename "$LATEST_SESSION")"
echo "📁 Component: $COMPONENT"

# Extract key parts from the session file
# Try multiple date patterns: XX_YYYYMMDD or just extract any numbers
SESSION_DATE=$(basename "$LATEST_SESSION" | grep -oE '[0-9]{2}_[0-9]{6}' || basename "$LATEST_SESSION" | grep -oE '[0-9]+' | head -n 1 || echo "")
SESSION_TITLE=$(head -n 1 "$LATEST_SESSION" | sed 's/# //')
KEY_POINTS=$(grep -E '^[-*]' "$LATEST_SESSION" | head -n 10)

# Create temporary snippet for integration
# Format date for display (replace underscores with slashes, or use original if no pattern matched)
if [ -n "$SESSION_DATE" ]; then
  FORMATTED_DATE="${SESSION_DATE//_//}"
else
  FORMATTED_DATE="$(date +%Y-%m-%d)"
fi

TEMP_SNIPPET="$SESSION_DIR/Session_Integration_${SESSION_DATE:-$(date +%s)}.md"

cat <<EOF > "$TEMP_SNIPPET"
## ${SESSION_TITLE:-Session Update} — ${FORMATTED_DATE}

**Summary:** Automatic summary from \`$(basename "$LATEST_SESSION")\`.

**Relevant Sections Updated:** (Add manually if needed)

**Key Additions:**
${KEY_POINTS:-_No bullet points detected; review manually._}

---

EOF

echo "✅ Created session snippet: $TEMP_SNIPPET"

# Insert snippet above the END marker in the master file
awk -v snippet="$TEMP_SNIPPET" '
  BEGIN { inserted=0 }
  {
    if (!inserted && /\*\*END OF MASTER DOCUMENTATION\*\*/) {
      while ((getline line < snippet) > 0) print line
      inserted=1
    }
    print
  }
' "$MASTER_FILE" > "${MASTER_FILE}.tmp" && mv "${MASTER_FILE}.tmp" "$MASTER_FILE"

echo "✅ Integrated new session snippet into $MASTER_FILE"

# Stage, commit, and push changes
git add "$MASTER_FILE" "$TEMP_SNIPPET"
git commit -m "Auto-integrated $(basename "$LATEST_SESSION") into master log"
git push

echo "🚀 Session successfully integrated and pushed to GitHub!"
