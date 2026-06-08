#!/bin/bash
# ChoreChart Firebase Edition - Local Startup Script

echo "======================================================"
echo "   Starting ChoreChart Local Server on Port 8000...   "
echo "======================================================"
echo "   Serving files from the 'public' folder..."
echo "   Opening application in browser..."

# Open default browser based on OS
if [ "$(uname)" == "Darwin" ]; then
    open "http://localhost:8000"
elif [ "$(expr substr $(uname -s) 1 5)" == "Linux" ]; then
    xdg-open "http://localhost:8000" 2>/dev/null || echo "Please open http://localhost:8000 in your browser."
fi

# Run python HTTP server serving public/ directory
python3 -m http.server --directory public 8000
