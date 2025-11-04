#!/bin/bash
while true; do
    if [[ -n "$(git status --porcelain)" ]]; then
        summary=$(git diff --stat)
        git add .
        git commit -m "Auto-save $(date '+%H:%M:%S %d-%m-%Y')" -m "$summary"
        git push
    fi
    sleep 60  # check every minute
done
