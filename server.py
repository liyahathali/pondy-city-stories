# Fallback static server (used when Node.js is not installed): python server.py
# Sends no-store headers so the browser never mixes old and new game files.
import http.server, json, os, socketserver
ROOT = os.path.dirname(os.path.abspath(__file__))
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        super().end_headers()
    def do_GET(self):
        if self.path.split('?')[0] in ('/music/', '/music'):
            d = os.path.join(ROOT, 'music')
            files = [f for f in os.listdir(d) if f.lower().endswith(('.mp3', '.ogg', '.m4a', '.wav', '.aac', '.flac'))] if os.path.isdir(d) else []
            body = json.dumps(files).encode()
            self.send_response(200); self.send_header('Content-Type', 'application/json'); self.send_header('Content-Length', str(len(body))); self.end_headers(); self.wfile.write(body); return
        pth = self.path.split('?')[0]
        if pth.startswith('/models/') and pth.endswith('/'):
            d = os.path.normpath(os.path.join(ROOT, pth.lstrip('/')))
            files = [f for f in os.listdir(d) if f.lower().endswith(('.glb', '.gltf', '.fbx'))] if d.startswith(ROOT) and os.path.isdir(d) else []
            body = json.dumps(files).encode()
            self.send_response(200); self.send_header('Content-Type', 'application/json'); self.send_header('Content-Length', str(len(body))); self.end_headers(); self.wfile.write(body); return
        return super().do_GET()
    def log_message(self, *a): pass
H.extensions_map.update({'.js': 'text/javascript'})
print('\n  Pondy City Stories is running!  Open http://localhost:8080  (Ctrl+C to stop)\n')
socketserver.ThreadingTCPServer.allow_reuse_address = True
socketserver.ThreadingTCPServer(('', 8080), H).serve_forever()
