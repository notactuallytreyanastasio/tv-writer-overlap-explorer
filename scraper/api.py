"""Simple API server to serve writer data as JSON."""
import json
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from database import (
    get_all_shows,
    get_all_writers,
    get_all_writers_with_details,
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
        parsed = urlparse(self.path)
        path = parsed.path
        query = parse_qs(parsed.query)

        if path == '/api/shows':
            self._set_headers()
            data = get_all_shows()
            self.wfile.write(json.dumps(data).encode())

        elif path == '/api/writers':
            self._set_headers()
            # Use detailed writers (includes image_url, bio, show_count)
            data = get_all_writers_with_details()
            self.wfile.write(json.dumps(data).encode())

        elif path == '/api/writers/paginated':
            self._set_headers()
            # Paginated writers endpoint with optional search
            page = int(query.get('page', ['1'])[0])
            per_page = int(query.get('per_page', ['10'])[0])
            search = query.get('search', [''])[0].strip().lower()

            all_writers = get_all_writers_with_details()

            # Filter by search if provided
            if search:
                all_writers = [
                    w for w in all_writers
                    if search in w['name'].lower()
                ]

            total = len(all_writers)
            total_pages = max(1, (total + per_page - 1) // per_page)

            start = (page - 1) * per_page
            end = start + per_page
            writers = all_writers[start:end]

            data = {
                'writers': writers,
                'pagination': {
                    'page': page,
                    'per_page': per_page,
                    'total': total,
                    'total_pages': total_pages,
                    'has_next': page < total_pages,
                    'has_prev': page > 1,
                    'search': search if search else None,
                }
            }
            self.wfile.write(json.dumps(data).encode())

        elif path == '/api/links':
            self._set_headers()
            data = get_all_links()
            self.wfile.write(json.dumps(data).encode())

        elif path == '/api/overlaps':
            self._set_headers()
            data = get_writer_overlap()
            self.wfile.write(json.dumps(data).encode())

        elif path == '/api/all':
            self._set_headers()
            data = {
                'shows': get_all_shows(),
                'writers': get_all_writers_with_details(),
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
    print("  GET /api/shows              - All shows")
    print("  GET /api/writers            - All writers with details")
    print("  GET /api/writers/paginated  - Paginated writers (?page=1&per_page=10)")
    print("  GET /api/links              - All show-writer links")
    print("  GET /api/overlaps           - Writers with multiple shows")
    print("  GET /api/all                - All data combined")
    server.serve_forever()


if __name__ == '__main__':
    run_server()
