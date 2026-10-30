"""Prepare deploy-only derivatives of the preserved v7 distribution + v8 build.

Never run in the GitHub asset directory. PNG masters and QA evidence stay there.
All game files and official character bytes are retained. Eight legacy full-size
background derivatives use quality 94–100 WebP, without resizing. No JS transport
compression: HTTP Content-Encoding belongs to the hosting server.
"""
import hashlib, io, json, math, subprocess, sys, tarfile
from pathlib import Path

def sha(data): return hashlib.sha256(data).hexdigest()
def validate_javascript(root):
    for p in sorted(root.rglob('*')):
        if p.suffix not in ('.js','.mjs') or not p.is_file(): continue
        if p.read_bytes()[:2]==b'\x1f\x8b': raise ValueError('Precompressed gzip JavaScript: '+str(p))
        subprocess.run(['node','--check',str(p)],check=True,capture_output=True)

def inventory(root):
    return {str(p.relative_to(root)):{'bytes':p.stat().st_size,'sha256':sha(p.read_bytes())}
            for p in sorted(root.rglob('*')) if p.is_file() and p.name!='release-v8-delivery.json'}

def package(root):
    from PIL import Image, ImageChops, ImageStat, features
    repo=Path(__file__).resolve().parents[1]
    if root==repo or repo in root.parents: raise ValueError('Use a separate deployment directory')
    if not (root/'release-v8.json').is_file(): raise ValueError('Build v8 on preserved v7 first')
    validate_javascript(root)
    before=inventory(root)
    baseline_record=root/'release-v8-delivery.json'
    baseline=json.loads(baseline_record.read_text()) if baseline_record.exists() else None
    sources=sorted((repo/'assets/home-art-recovered-20261029').glob('*.png'))+[
        repo/'assets/home-b-20261029/home-interior-b.png',repo/'assets/home-c-20261029/home-interior-c.png']
    derivatives={}; pending=[]
    for source in sources:
        rel=str(source.relative_to(repo).with_suffix('.webp'));target=root/rel
        if not target.is_file(): raise ValueError('Missing legacy comparison: '+rel)
        original=source.read_bytes()
        with Image.open(source) as image:
            if image.mode!='RGB': raise ValueError('Unexpected background transparency: '+str(source))
            for quality in (94,96,98,100):
                buf=io.BytesIO();image.save(buf,'WEBP',quality=quality,method=6)
                data=buf.getvalue()
                with Image.open(io.BytesIO(data)) as decoded:
                    if image.size!=decoded.size: raise ValueError('Background size changed')
                    diff=ImageChops.difference(image,decoded.convert('RGB'));rms=ImageStat.Stat(diff).rms
                    mse=sum(x*x for x in rms)/3;psnr=10*math.log10(255**2/mse) if mse else 100
                    dimensions=image.size
                if psnr>=35:break
            if psnr<35: raise ValueError('Background quality guard: '+rel+' '+str(psnr))
        pending.append((target,data))
        derivatives[rel]={'source':str(source.relative_to(repo)),'sourceSha256':sha(original),
            'beforeSha256':(baseline or {}).get('derivatives',{}).get(rel,{}).get('beforeSha256',before[rel]['sha256']),'deliveredSha256':sha(data),
            'beforeBytes':(baseline or {}).get('derivatives',{}).get(rel,{}).get('beforeBytes',before[rel]['bytes']),'deliveredBytes':len(data),'width':dimensions[0],
            'height':dimensions[1],'quality':quality,'method':6,'psnrDb':round(psnr,4),'pixelIdentical':False}
    for target,data in pending:target.write_bytes(data)
    excluded=list((baseline or {}).get('excluded',[]))
    for rel in ['prototypes/card-game/UI-IMPLEMENTATION.md','assets/home-art-recovered-20261029/README.md']:
        p=root/rel
        if p.exists():excluded.append({'path':rel,**before[rel],'reason':'development documentation retained in GitHub'});p.unlink()
    # Supersede the obsolete v8 formatting record, never mislabel new output as the old compacted bytes.
    (root/'v8-compaction.json').write_text(json.dumps({'kind':'No additional JavaScript transformation; inherited v7 formatting is recorded in release-v7.json','files':[]},indent=2)+'\n')
    for version in [6,7,8]:
        p=root/f'release-v{version}.json';release=json.loads(p.read_text())
        for key in ['files','v6EntryHashes']:
            for rel in release.get(key,{}):
                release[key][rel]=sha((root/rel).read_bytes())
        if version==6:
            release.pop('losslessPackagingDerivatives',None)
            release['deploymentBackgroundDerivatives']=derivatives
        p.write_text(json.dumps(release,ensure_ascii=False,indent=2)+'\n')
    after=inventory(root)
    for rel,data in before.items():
        if rel.startswith('assets/characters/') or rel.startswith('prototypes/card-game/art-delivery/'):
            if after.get(rel)!=data:raise ValueError('Protected image changed: '+rel)
        if rel.endswith(('.js','.mjs','.css','.html')) and after.get(rel)!=data:
            raise ValueError('Packaging modified code: '+rel)
    record={'githubHead':json.loads((root/'release-v8.json').read_text())['githubHead'],
        'beforeBytes':(baseline or {}).get('beforeBytes',sum(x['bytes'] for x in before.values())),'deliveredBytes':sum(x['bytes'] for x in after.values()),
        'limitBytes':256*1024**2,'libwebp':features.version('webp'),'derivatives':derivatives,
        'excluded':excluded,'files':after,'javascript':'All JS/MJS syntax checked, plain bytes; server-owned HTTP compression',
        'protected':'All official characters, card images, runtime entrypoints, comparisons and game features retained'}
    (root/'release-v8-delivery.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n')
    # This counts logical tar file sizes, padded bodies, directory headers and end blocks.
    class Counter:
        def __init__(self):self.size=0
        def write(self,b):self.size+=len(b);return len(b)
    counter=Counter()
    with tarfile.open(fileobj=counter,mode='w|',format=tarfile.PAX_FORMAT) as tar:tar.add(root,arcname='dist')
    if counter.size>=256*1024**2:raise ValueError('Expanded tar exceeds 256MiB: '+str(counter.size))
    print(json.dumps({'files':len(after)+1,'beforeBytes':record['beforeBytes'],'deliveredBytes':sum(p.stat().st_size for p in root.rglob('*') if p.is_file()),'expandedTarBytes':counter.size,'headroomBytes':256*1024**2-counter.size,'backgrounds':len(derivatives),'minPSNR':min(x['psnrDb'] for x in derivatives.values())}))
if __name__=='__main__':package(Path(sys.argv[1]).resolve())
