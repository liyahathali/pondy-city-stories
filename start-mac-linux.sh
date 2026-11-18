#!/bin/sh
cd "$(dirname "$0")"
echo "Starting Pondy City Stories on http://localhost:8080 ..."
if command -v node >/dev/null 2>&1; then
  (sleep 1; (xdg-open http://localhost:8080 || open http://localhost:8080) >/dev/null 2>&1) &
  node server.js
elif command -v python3 >/dev/null 2>&1; then
  (sleep 1; (xdg-open http://localhost:8080 || open http://localhost:8080) >/dev/null 2>&1) &
  python3 server.py
else
  echo "Install Node.js (https://nodejs.org) or Python 3, then run this again."
fi
