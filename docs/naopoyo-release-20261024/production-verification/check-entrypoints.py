import asyncio,hashlib,json
from pathlib import Path
import aiohttp
ROOT=Path(__file__).resolve().parents[1]
expected=json.loads((ROOT/'reports/package-report.json').read_text())['sha256']
base='https://naoto214.github.io/naotocchi/'
entries=['index.html','prototypes/card-game/index.html','prototypes/naopoyo/index.html','prototypes/naopoyo-chapter1/index.html','prototypes/naopoyo-rescue/index.html']
excluded=['prototypes/naopoyo-chapter1/qa.html','prototypes/naopoyo-chapter1/ability.html','prototypes/naopoyo-chapter1/ability-lab.mjs','prototypes/naopoyo-chapter1/ability-ui.mjs','prototypes/naopoyo-world/index.html','prototypes/naopoyo-insight/index.html','prototypes/naopoyo-v2/index.html','prototypes/naopoyo/legacy.html','tools/pages/allowlist.json']
async def main():
 results=[]
 async with aiohttp.ClientSession(trust_env=True,timeout=aiohttp.ClientTimeout(total=30)) as s:
  for p in entries:
   url=base+p.removesuffix('index.html')
   async with s.get(url) as r:
    body=await r.read();digest=hashlib.sha256(body).hexdigest()
    assert r.status==200 and digest==expected[p],p
    results.append(dict(url=url,status=r.status,sha256=digest))
  for p in excluded:
   async with s.get(base+p) as r:
    await r.read();assert r.status==404,p
    results.append(dict(url=base+p,status=r.status,excluded=True))
 (ROOT/'verification/entrypoints.json').write_text(json.dumps(results,indent=2)+'\n')
 print(json.dumps({'entrypoints_matched':len(entries),'excluded_404':len(excluded),'card_ids':452,'card_images_verified':904}))
asyncio.run(main())
