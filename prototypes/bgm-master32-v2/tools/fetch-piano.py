import pathlib,json,urllib.request,hashlib,concurrent.futures
R=pathlib.Path(__file__).resolve().parents[1];(R/'samples').mkdir(exist_ok=True)
def fetch(e):
 p=R/'samples'/e['path'];data=p.read_bytes() if p.exists() else urllib.request.urlopen(e['url'],timeout=60).read();assert hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()==e['gitSha'];p.write_bytes(data);return dict(e,sha256=hashlib.sha256(data).hexdigest(),bytes=len(data))
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:r=list(pool.map(fetch,json.loads((R/'tools/piano-sources.json').read_text())))
(R/'samples/manifest.json').write_text(json.dumps(r,indent=2)+'\n');print('6 pinned CC0 piano dyn2 files verified')
