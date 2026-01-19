"""Simple API server to serve writer data as JSON."""
import json
from http.server import HTTPServer, BaseHTTPRequestHandler
from database import (
    get_all_shows,
    get_all_writers,
    get_writer_overlap,
    get_connection,
)


def get_all_links():
    """Get all show-writer links."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT show_id, writer_id, role, episode_count
        FROM show_writers
    """)
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


class APIHandler(BaseHTTPRequestHandler):
    def _set_headers(self, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_OPTIONS(self):
        self._set_headers()

    def do_GET(self):
        if self.path == '/api/shows':
            self._set_headers()
            data = get_all_shows()
            self.wfile.write(json.dumps(data).encode())

        elif self.path == '/api/writers':
            self._set_headers()
            data = get_all_writers()
            self.wfile.write(json.dumps(data).encode())

        elif self.path == '/api/links':
            self._set_headers()
            data = get_all_links()
            self.wfile.write(json.dumps(data).encode())

        elif self.path == '/api/overlaps':
            self._set_headers()
            data = get_writer_overlap()
            self.wfile.write(json.dumps(data).encode())

        elif self.path == '/api/all':
            self._set_headers()
            data = {
                'shows': get_all_shows(),
                'writers': get_all_writers(),
                'links': get_all_links(),
                'overlaps': get_writer_overlap(),
            }
            self.wfile.write(json.dumps(data).encode())

        else:
            self._set_headers(404)
            self.wfile.write(json.dumps({'error': 'Not found'}).encode())


def run_server(port=8080):
    """Run the API server."""
    server = HTTPServer(('localhost', port), APIHandler)
    print(f"API server running at http://localhost:{port}")
    print("Endpoints:")
    print("  GET /api/shows    - All shows")
    print("  GET /api/writers  - All writers")
    print("  GET /api/links    - All show-writer links")
    print("  GET /api/overlaps - Writers with multiple shows")
    print("  GET /api/all      - All data combined")
    server.serve_forever()


if __name__ == '__main__':
    run_server()
