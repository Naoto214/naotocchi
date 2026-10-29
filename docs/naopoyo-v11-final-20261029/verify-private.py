import concurrent.futures, hashlib, json, pathlib, sys, termios, urllib.parse
import requests

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

def get(path):
    url = origin + '/' + path
    for _ in range(5):
        response = requests.get(url, headers=headers, timeout=40, allow_redirects=False)
        if response.status_code not in (301, 302, 303, 307, 308):
            return response
        url = urllib.parse.urljoin(url, response.headers['Location'])
        if urllib.parse.urlsplit(url).netloc != expected_origin:
            raise RuntimeError('Refusing authenticated cross-origin redirect')
    raise RuntimeError('Too many redirects')

def verify(path):
    rel = path.relative_to(root).as_posix()
    response = get(rel)
    actual = hashlib.sha256(response.content).hexdigest()
    expected = hashlib.sha256(path.read_bytes()).hexdigest()
    return {'path': rel, 'status': response.status_code, 'sha256': actual, 'expected': expected, 'matches': response.status_code == 200 and actual == expected}

paths = sorted(p for p in root.rglob('*') if p.is_file())
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
    results = list(pool.map(verify, paths))
version = get('version.json').json()
unauth = requests.get(origin + '/version.json', timeout=40, allow_redirects=False).status_code
report = {'files': len(results), 'matches': sum(r['matches'] for r in results), 'mismatches': sum(not r['matches'] for r in results), 'version': version['version'], 'sourceCommit': version['sourceCommit'], 'unauthenticated_status': unauth, 'results': results}
pathlib.Path(cfg['report']).write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({k:v for k,v in report.items() if k != 'results'}), flush=True)
sys.exit(0 if report['mismatches'] == 0 and report['version'] == 11 and report['sourceCommit'] == cfg['sourceCommit'] else 1)
