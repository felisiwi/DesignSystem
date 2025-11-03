#!/bin/bash
cd "$(dirname "$0")"
git add notes/claude-sessions/Carousel/
git commit -m "🧩 Add new Claude session summary + master update"
git push
