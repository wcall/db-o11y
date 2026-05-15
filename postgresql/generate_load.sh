#!/usr/bin/env bash
# Continuously generate query load against super_awesome_application as wcall.
# Usage: ./generate_load.sh [delay_seconds]
#   delay_seconds  — pause between iterations (default: 5)

set -euo pipefail

CONTAINER="db-o11y-postgres"
DB="super_awesome_application"
USER="wcall"
SQL_FILE="$(dirname "$0")/generate_load.sql"
DELAY="${1:-5}"

docker cp "$SQL_FILE" "$CONTAINER":/tmp/generate_load.sql

iteration=0
echo "Starting load generation as $USER on $DB (delay=${DELAY}s). Ctrl-C to stop."

while true; do
    iteration=$((iteration + 1))
    echo "[$(date '+%H:%M:%S')] iteration $iteration"
    docker exec "$CONTAINER" \
        psql -U "$USER" -d "$DB" -f /tmp/generate_load.sql -q 2>&1 | tail -5
    sleep "$DELAY"
done
