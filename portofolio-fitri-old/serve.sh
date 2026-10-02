#!/usr/bin/env bash
# ============================================================
# serve.sh — jalankan website di jaringan lokal (LAN)
#
#   ./serve.sh          -> port 8000
#   ./serve.sh 3000     -> port 3000
#
# Server di-bind ke 0.0.0.0 supaya bisa dibuka dari HP, tablet,
# atau laptop lain yang terhubung ke Wi-Fi/jaringan yang sama.
# ============================================================
set -euo pipefail

PORT="${1:-8000}"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# berhenti jika port sudah dipakai
if command -v ss >/dev/null 2>&1 && ss -tln 2>/dev/null | grep -q ":${PORT} "; then
  echo "⚠  Port ${PORT} sudah dipakai. Coba: ./serve.sh $((PORT + 1))"
  exit 1
fi

cd "$DIR"

echo "╔══════════════════════════════════════════════════════╗"
echo "║  Website berjalan — buka di perangkat lain:            ║"
echo "╚══════════════════════════════════════════════════════╝"
echo
echo "  Komputer ini : http://localhost:${PORT}/"
echo

# Semua IPv4 yang aktif (skip loopback & docker)
IPS=$(ip -4 -o addr show scope global 2>/dev/null \
      | awk '{print $4}' | cut -d/ -f1 \
      | grep -v '^172\.' || hostname -I 2>/dev/null || true)

if [ -z "$IPS" ]; then
  echo "  (tidak ada IP LAN terdeteksi)"
else
  for ip in $IPS; do
    iface=$(ip -4 -o addr show 2>/dev/null | awk -v a="$ip" '$4 ~ "^"a"/" {print $2}')
    echo "  Jaringan       : http://${ip}:${PORT}/   (${iface})"
  done
fi

echo
echo "  Tekan Ctrl+C untuk menghentikan server."
echo

exec python3 -m http.server "$PORT" --bind 0.0.0.0
