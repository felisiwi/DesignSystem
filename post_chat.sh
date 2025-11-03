#!/bin/bash
# post_chat.sh — upgraded automation for Carousel Master session integration

MASTER_FILE="Carousel_MASTER.md"
SESSION_DIR="notes/claude-sessions/Carousel"

# Find the most recently modified session markdown file (excluding the master)
LATEST_SESSION=$(ls -t $SESSION_DIR/Carousel_*.md | grep -v "MASTER" | head -n 1)

if [ -z "$LATEST_SESSION" ]; then
  echo "❌ No session files found in $SESSION_DIR."
  exit 1
fi

echo "🟣 Processing latest session: $(basename "$LATEST_SESSION")"

# Extract key parts from the session file
SESSION_DATE=$(basename "$LATEST_SESSION" | grep -oE '[0-9]{2}_[0-9]{6}')
SESSION_TITLE=$(head -n 1 "$LATEST_SESSION" | sed 's/# //')
KEY_POINTS=$(grep -E '^[-*]' "$LATEST_SESSION" | head -n 10)

# Create temporary snippet for integration
TEMP_SNIPPET="notes/claude-sessions/Carousel/Session_Integration_${SESSION_DATE}.md"

cat <<EOF > "$TEMP_SNIPPET"
## ${SESSION_TITLE:-Session Update} — ${SESSION_DATE//_//}

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
