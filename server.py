import http.server
import socketserver
import socket
import sys

PORT = 8080

def get_local_ips():
    ips = []
    try:
        hostname = socket.gethostname()
        for ip in socket.gethostbyname_ex(hostname)[2]:
            if not ip.startswith("127."):
                ips.append(ip)
    except Exception:
        pass
    return ips

class NoCacheHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        '.js': 'application/javascript',
        '.mjs': 'application/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.wasm': 'application/wasm',
        '.svg': 'image/svg+xml',
    }

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

if __name__ == '__main__':
    # Ensure Windows console handles UTF-8 safely
    if sys.platform.startswith('win'):
        try:
            sys.stdout.reconfigure(encoding='utf-8')
            sys.stderr.reconfigure(encoding='utf-8')
        except Exception:
            pass

    socketserver.TCPServer.allow_reuse_address = True
    try:
        with socketserver.TCPServer(("0.0.0.0", PORT), NoCacheHTTPRequestHandler) as httpd:
            print("=" * 60)
            print("  [INSERT COFFEE] WEB SERVER AKTIF")
            print("=" * 60)
            print(f"  > Akses Lokal (Komputer ini) : http://localhost:{PORT}/")
            print(f"  > Akses Loopback             : http://127.0.0.1:{PORT}/")
            ips = get_local_ips()
            for ip in ips:
                print(f"  > Akses Jaringan (HP/WiFi)   : http://{ip}:{PORT}/")
            print("=" * 60)
            print("  Tekan Ctrl+C untuk menghentikan server.")
            print("=" * 60)
            sys.stdout.flush()
            httpd.serve_forever()
    except Exception as e:
        print(f"Server error: {e}")


