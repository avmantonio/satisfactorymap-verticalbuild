"""Throwaway server for the Renderer probe.

Mirrors production COOP/COEP (tools/serve_site.py / Cloudflare _headers)
so a CDN library hit is a real failure, not a lucky local miss.

Usage:
  python .scratch/vertical-builds/prototype/renderer-probe-serve.py
  python .scratch/vertical-builds/prototype/renderer-probe-serve.py 8792 --no-coep
"""
import http.server
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
PORT = 8792
COEP = True


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript",
        ".mjs": "text/javascript",
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=HERE, **kwargs)

    def end_headers(self):
        if COEP:
            self.send_header("Cross-Origin-Opener-Policy", "same-origin")
            self.send_header("Cross-Origin-Embedder-Policy", "require-corp")
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()


def main():
    global PORT, COEP
    args = sys.argv[1:]
    if "--no-coep" in args:
        COEP = False
        args = [a for a in args if a != "--no-coep"]
    if args:
        PORT = int(args[0])

    class Server(http.server.ThreadingHTTPServer):
        allow_reuse_address = False

    try:
        server = Server(("127.0.0.1", PORT), Handler)
    except OSError as e:
        sys.exit(f"Port {PORT} is in use ({e}).")
    mode = "COOP/COEP on (hosted/local-prod headers)" if COEP else "COEP off"
    print(f"Renderer probe at http://127.0.0.1:{PORT}/renderer-probe.html  [{mode}]", flush=True)
    with server:
        server.serve_forever()


if __name__ == "__main__":
    main()
