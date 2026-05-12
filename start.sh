#!/bin/bash
echo "Starting the WebRTC Signaling Server..."
node server/index.js &
SERVER_PID=$!

echo "Starting the Vite React App..."
npm run dev &
VITE_PID=$!

echo "Both server and app are running."
echo "Press Ctrl+C to stop both."

trap "kill $SERVER_PID $VITE_PID" EXIT
wait
