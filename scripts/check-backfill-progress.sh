#!/bin/bash
# Quick script to check backfill progress

TERMINAL_FILE="/Users/mokhateeb/.cursor/projects/Users-mokhateeb-rillation-sb-react/terminals/527540.txt"

if [ -f "$TERMINAL_FILE" ]; then
  echo "=== Latest Backfill Progress ==="
  tail -30 "$TERMINAL_FILE"
  echo ""
  echo "=== Progress Summary (if available) ==="
  grep -A 10 "PROGRESS UPDATE" "$TERMINAL_FILE" | tail -15
else
  echo "Backfill script output file not found. The script may have completed or not started yet."
fi









