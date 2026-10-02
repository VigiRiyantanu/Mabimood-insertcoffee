#!/bin/bash
# Jalankan server dev agar bisa diakses dari jaringan yang sama (HP/laptop lain)
# Usage: ./start-lan.sh
export PATH="$HOME/.local/node/bin:$PATH"
cd "$(dirname "$0")"
setsid nohup ./node_modules/.bin/vite --host 0.0.0.0 --port 5173 --strictPort < /dev/null > /tmp/vite.log 2>&1 &
sleep 1
LAN_IP=$(hostname -I | awk '{print $2}')
echo "Server jalan di:"
echo "  Local : http://localhost:5173/"
echo "  LAN   : http://$LAN_IP:5173/"
echo "Log: tail -f /tmp/vite.log"
