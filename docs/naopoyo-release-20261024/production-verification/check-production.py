import concurrent.futures as cf
import hashlib
import json
from pathlib import Path
import threading
import time
from urllib.parse import quote
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
report = json.loads((ROOT / 'reports/package-report.json').read_text())
assert report['source_head'] == '92ac654644351a169b9661e2319b0cd81670c497'
assert len(report['sha256']) == report['file_count'] == 4053
base = 'https://naoto214.github.io/naotocchi/'
local = threading.local()
def check(item):
    path, expected = item
    errors = []
    for attempt in range(3):
        try:
            with urlopen(base + quote(path), timeout=35) as r:
                content = r.read()
                status = r.status
            assert status == 200
            digest = hashlib.sha256(content).hexdigest()
            if digest != expected:
                raise ValueError(f'SHA-256 mismatch: {digest} != {expected}')
            dest = ROOT / 'runtime' / path
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(content)
            return dict(path=path, status=status, bytes=len(content), sha256=digest, attempts=attempt+1)
        except Exception as exc:
            errors.append(str(exc))
    return dict(path=path, errors=errors)

started = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
results=[]
with cf.ThreadPoolExecutor(max_workers=16) as pool:
    for result in pool.map(check, sorted(report['sha256'].items())):
        results.append(result)
        if len(results)%100 == 0:
            print(f'{len(results)}/{report["file_count"]}; failed={sum("errors" in x for x in results)}', flush=True)
        if len(results)%100 == 0:
            (ROOT / 'verification/production-progress.json').write_text(json.dumps(results))
failed=[r for r in results if 'errors' in r]
total=sum(r.get('bytes',0) for r in results)
summary=dict(source_head=report['source_head'], base_url=base, started_at=started,
    completed_at=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),
    expected_files=report['file_count'], checked_files=len(results), matched_files=len(results)-len(failed),
    expected_bytes=report['bytes'], received_bytes=total, failed=failed,
    package_report_sha256=hashlib.sha256((ROOT/'reports/package-report.json').read_bytes()).hexdigest())
(ROOT/'verification/production-files.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
(ROOT/'verification/production-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(summary,ensure_ascii=False,indent=2),flush=True)
assert not failed and total == report['bytes']
