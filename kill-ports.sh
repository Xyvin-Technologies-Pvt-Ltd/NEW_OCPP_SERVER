#!/bin/bash
# Free OCPP server ports (7535, 5500, 6500) and related node/nodemon processes
set -e
PORTS="7535 5500 6500"
echo "Looking for listeners on: $PORTS"
PIDS=$(lsof -tiTCP:7535,5500,6500 -sTCP:LISTEN 2>/dev/null | sort -u || true)
if [ -n "$PIDS" ]; then
  echo "Killing PIDs: $PIDS"
  kill -9 $PIDS || true
else
  echo "No port listeners found"
fi
# Also kill stray nodemon/node for this project
pkill -f "NEW_OCPP_SERVER.*nodemon" 2>/dev/null || true
pkill -f "nodemon app.js" 2>/dev/null || true
sleep 1
echo "Recheck:"
lsof -nP -iTCP:7535,5500,6500 -sTCP:LISTEN 2>/dev/null || echo "All ports free — you can run: npm start"
