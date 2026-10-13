#!/usr/bin/env python3
"""Tiny wishlist booking API (stdlib only).

GET  /api/reservations          -> {"reserved": [item ids]}   (names are never exposed)
POST /api/reserve {id, name}    -> {"token": "..."} or 409 if already booked
POST /api/cancel  {id, token}   -> {"ok": true} if the token matches

Splitting the price of a pricey gift ("split": true in wishlist.json):
GET  /api/splits?id=X                    -> {"people": [{name, contact}]}  (shown to other guests on purpose)
POST /api/split {id, name, contact}      -> {"token": "..."}
POST /api/split/cancel {id, token}       -> {"ok": true}

Bookings live in a JSON file (see --data), split requests in splits.json next to it.
For local testing, --static DIR also serves the site itself.
"""
import argparse, hashlib, json, os, secrets, tempfile, threading, time
from urllib.parse import parse_qs
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

parser = argparse.ArgumentParser()
parser.add_argument('--host', default='127.0.0.1')
parser.add_argument('--port', type=int, default=8091)
parser.add_argument('--data', default='reservations.json')
parser.add_argument('--items', default=os.path.join(os.path.dirname(__file__), '..', 'dist', 'wishlist.json'))
parser.add_argument('--static', help='also serve this directory (local testing)')
args = parser.parse_args()
SPLITS = os.path.join(os.path.dirname(os.path.abspath(args.data)), 'splits.json')

lock = threading.Lock()

def wishlist():
    with open(args.items, encoding='utf-8') as f:
        return {item['id']: item for item in json.load(f)}

def item_ids():
    return set(wishlist())

def load(path=None):
    try:
        with open(path or args.data, encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return {}

def save(data, path=None):
    path = path or args.data
    folder = os.path.dirname(os.path.abspath(path))
    fd, tmp = tempfile.mkstemp(dir=folder, suffix='.tmp')
    with os.fdopen(fd, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    os.replace(tmp, path)

def clean(value, limit):
    return ' '.join(str(value or '').split())[:limit]

def digest(token):
    return hashlib.sha256(token.encode()).hexdigest()


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=args.static or os.devnull, **kw)

    def send_json(self, status, body):
        raw = json.dumps(body, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def read_json(self):
        length = int(self.headers.get('Content-Length') or 0)
        if length > 4096:
            return None
        try:
            body = json.loads(self.rfile.read(length) or b'{}')
            return body if isinstance(body, dict) else None
        except ValueError:
            return None

    def do_GET(self):
        path, _, query = self.path.partition('?')
        if path == '/api/reservations':
            with lock:
                return self.send_json(200, {'reserved': sorted(load())})
        if path == '/api/splits':
            item = parse_qs(query).get('id', [''])[0]
            with lock:
                people = load(SPLITS).get(item, [])
            return self.send_json(200, {'people': [{'name': p['name'], 'contact': p['contact']} for p in people]})
        if args.static and not self.path.startswith('/api/'):
            return super().do_GET()
        self.send_json(404, {'error': 'not found'})

    def do_POST(self):
        path = self.path.split('?')[0]
        body = self.read_json()
        if body is None:
            return self.send_json(400, {'error': 'bad request'})
        item = str(body.get('id', ''))
        if path == '/api/reserve':
            name = ' '.join(str(body.get('name', '')).split())[:60]
            if not name or item not in item_ids():
                return self.send_json(400, {'error': 'bad request'})
            with lock:
                data = load()
                if item in data:
                    return self.send_json(409, {'error': 'taken'})
                token = secrets.token_urlsafe(18)
                data[item] = {'name': name, 'at': time.strftime('%Y-%m-%d %H:%M:%S'), 'token': digest(token)}
                save(data)
            return self.send_json(200, {'token': token})
        if path == '/api/split':
            name, contact = clean(body.get('name'), 60), clean(body.get('contact'), 80)
            if not name or not contact or not wishlist().get(item, {}).get('split'):
                return self.send_json(400, {'error': 'bad request'})
            with lock:
                data = load(SPLITS)
                people = data.setdefault(item, [])
                if len(people) >= 30:
                    return self.send_json(429, {'error': 'too many'})
                token = secrets.token_urlsafe(18)
                people.append({'name': name, 'contact': contact, 'at': time.strftime('%Y-%m-%d %H:%M:%S'), 'token': digest(token)})
                save(data, SPLITS)
            return self.send_json(200, {'token': token})
        if path == '/api/split/cancel':
            token = digest(str(body.get('token', '')))
            with lock:
                data = load(SPLITS)
                people = data.get(item, [])
                kept = [p for p in people if not secrets.compare_digest(p['token'], token)]
                if len(kept) == len(people):
                    return self.send_json(403, {'error': 'forbidden'})
                data[item] = kept
                save(data, SPLITS)
            return self.send_json(200, {'ok': True})
        if path == '/api/cancel':
            token = str(body.get('token', ''))
            with lock:
                data = load()
                if item not in data or not secrets.compare_digest(data[item]['token'], digest(token)):
                    return self.send_json(403, {'error': 'forbidden'})
                del data[item]
                save(data)
            return self.send_json(200, {'ok': True})
        self.send_json(404, {'error': 'not found'})

    def log_message(self, fmt, *a):
        if self.path.startswith('/api/'):
            super().log_message(fmt, *a)


if __name__ == '__main__':
    print(f'Wishlist API on http://{args.host}:{args.port}  data={os.path.abspath(args.data)}')
    ThreadingHTTPServer((args.host, args.port), Handler).serve_forever()
