import concurrent.futures, hashlib, json, pathlib, sys, termios, urllib.parse, urllib.request, urllib.error

old = termios.tcgetattr(sys.stdin)
hidden = old[:]
hidden[3] &= ~termios.ECHO
termios.tcsetattr(sys.stdin, termios.TCSANOW, hidden)
print('Ready for private verification JSON on stdin (input hidden).', flush=True)
cfg = json.loads(sys.stdin.readline())
termios.tcsetattr(sys.stdin, termios.TCSANOW, old)
root = pathlib.Path(cfg['directory'])
origin = cfg['origin'].rstrip('/')
expected_origin = urllib.parse.urlsplit(origin).netloc
headers = {'OAI-Sites-Authorization': 'Bearer ' + cfg['token'], 'Cache-Control': 'no-cache'}

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, hdrs, newurl):
        return None

def request(url, supplied_headers):
    opener = urllib.request.build_opener(NoRedirect())
    try:
        response = opener.open(urllib.request.Request(url, headers=supplied_headers), timeout=40)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        return response.status, response.headers, response.read()

def get(path):
    url = origin + '/' + path
    for _ in range(5):
        status, response_headers, body = request(url, headers)
        if status not in (301, 302, 303, 307, 308):
            return status, body
        url = urllib.parse.urljoin(url, response_headers['Location'])
        if urllib.parse.urlsplit(url).netloc != expected_origin:
            raise RuntimeError('Refusing authenticated cross-origin redirect')
    raise RuntimeError('Too many redirects')

def verify(path):
    rel = path.relative_to(root).as_posix()
    status, body = get(rel)
    actual = hashlib.sha256(body).hexdigest()
    expected = hashlib.sha256(path.read_bytes()).hexdigest()
    return {'path': rel, 'status': status, 'sha256': actual, 'expected': expected, 'matches': status == 200 and actual == expected}

paths = sorted(p for p in root.rglob('*') if p.is_file())
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
    results = list(pool.map(verify, paths))
version = json.loads(get('version.json')[1])
unauth = request(origin + '/version.json', {})[0]
report = {'files': len(results), 'matches': sum(r['matches'] for r in results), 'mismatches': sum(not r['matches'] for r in results), 'version': version['version'], 'sourceCommit': version['sourceCommit'], 'unauthenticated_status': unauth, 'results': results}
pathlib.Path(cfg['report']).write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({k:v for k,v in report.items() if k != 'results'}), flush=True)
sys.exit(0 if report['mismatches'] == 0 and report['version'] == 11 and report['sourceCommit'] == cfg['sourceCommit'] else 1)
