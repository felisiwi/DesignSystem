#!/bin/bash
# --------------------------------------------------------------
# Claude Export Script – Safe Incremental Draft Mode
# --------------------------------------------------------------
# This script finds your most recent [Carousel]_YYYY-MM-DD.md
# in /notes/claude-sessions/Carousel/, creates a new file called
# Carousel_NEW_INSIGHTS.md containing only the new summary content
# and hints on where to integrate it. Then it commits and pushes
# that file to GitHub.
# --------------------------------------------------------------

# Define paths
SESSIONS_DIR="./notes/claude-sessions/Carousel"
OUTPUT_FILE="$SESSIONS_DIR/Carousel_NEW_INSIGHTS.md"

# Ensure directory exists
if [ ! -d "$SESSIONS_DIR" ]; then
  echo "❌ Directory $SESSIONS_DIR not found."
  exit 1
fi

# Find the newest session file
LATEST_FILE=$(ls -t "$SESSIONS_DIR"/Carousel_*.md 2>/dev/null | head -n 1)

if [ -z "$LATEST_FILE" ]; then
  echo "❌ No Carousel session files found."
  exit 1
fi

# Write to the draft file
echo "🟣 Creating new insight draft from: $LATEST_FILE"
echo -e "---\n🆕 Suggested Integration – $(basename "$LATEST_FILE")\n---\n" > "$OUTPUT_FILE"
echo -e "Below are the newly added insights from your most recent Claude session.\n" >> "$OUTPUT_FILE"
echo -e "Manually integrate them into the relevant sections of Carousel_MASTER.md.\n" >> "$OUTPUT_FILE"
echo -e "--------------------------------------------------------------\n" >> "$OUTPUT_FILE"
cat "$LATEST_FILE" >> "$OUTPUT_FILE"
echo -e "\n--------------------------------------------------------------\n✅ End of suggestions.\n" >> "$OUTPUT_FILE"

# Git stage and push
git add "$OUTPUT_FILE"
git commit -m "Add new Carousel insights draft from $(basename "$LATEST_FILE")"
git push

echo "✅ Done! Created and pushed Carousel_NEW_INSIGHTS.md"
