"""Compare actual public bytes with the exact deployed Actions artifact report.

The raw result intentionally retains ALL missing paths, including .nojekyll.
No mismatch is ignored or reclassified by this checker.
"""
import asyncio
import hashlib
import json
from pathlib import Path
import time
from urllib.parse import quote
import aiohttp

ROOT=Path(__file__).resolve().parents[1]
report=json.loads((ROOT/'reports/package-report.json').read_text())
assert report['source_head']=='92ac654644351a169b9661e2319b0cd81670c497'
assert len(report['sha256'])==report['file_count']==4053
base='https://naoto214.github.io/naotocchi/'
progress=ROOT/'verification/production-progress.json'
results=json.loads(progress.read_text()) if progress.exists() else []
results=[r for r in results if 'errors' not in r and
    hashlib.sha256((ROOT/'runtime'/r['path']).read_bytes()).hexdigest()==report['sha256'][r['path']]]
done={r['path'] for r in results}
started=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())

async def main():
    sem=asyncio.Semaphore(16)
    async with aiohttp.ClientSession(trust_env=True,connector=aiohttp.TCPConnector(limit=16),
        timeout=aiohttp.ClientTimeout(total=45)) as session:
        async def check(path,expected):
            async with sem:
                errors=[]
                for attempt in range(3):
                    try:
                        async with session.get(base+quote(path)) as r:
                            content=await r.read()
                            if r.status!=200: raise ValueError(f'HTTP {r.status}')
                            digest=hashlib.sha256(content).hexdigest()
                            if digest!=expected: raise ValueError(f'SHA-256 mismatch: {digest} != {expected}')
                            dest=ROOT/'runtime'/path
                            dest.parent.mkdir(parents=True,exist_ok=True)
                            dest.write_bytes(content)
                            return dict(path=path,status=r.status,bytes=len(content),sha256=digest,attempts=attempt+1)
                    except Exception as e:
                        errors.append(str(e))
                return dict(path=path,errors=errors)
        tasks=[asyncio.create_task(check(p,h)) for p,h in report['sha256'].items() if p not in done]
        for task in asyncio.as_completed(tasks):
            results.append(await task)
            if len(results)%100==0:
                print(f'{len(results)}/4053; failed={sum("errors" in r for r in results)}',flush=True)
                progress.write_text(json.dumps(results))
    results.sort(key=lambda r:r['path'])
    failed=[r for r in results if 'errors' in r]
    total=sum(r.get('bytes',0) for r in results)
    summary=dict(source_head=report['source_head'],base_url=base,started_at=started,
        completed_at=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),
        expected_files=report['file_count'],checked_files=len(results),matched_files=len(results)-len(failed),
        expected_bytes=report['bytes'],received_bytes=total,failed=failed,
        package_report_sha256=hashlib.sha256((ROOT/'reports/package-report.json').read_bytes()).hexdigest())
    (ROOT/'verification/production-files.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
    (ROOT/'verification/production-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(summary,ensure_ascii=False,indent=2),flush=True)
    assert not failed and total==report['bytes']

asyncio.run(main())
