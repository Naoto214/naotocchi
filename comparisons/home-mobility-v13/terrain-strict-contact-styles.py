"""Extract image-level measured CSS orientation separately from unchanged raw foot/rect captures."""
import gzip,hashlib,json,sys
from pathlib import Path
def style_inputs(atlas,out):
    rows=[]
    for w,suffix in [(320,''),(375,''),(390,''),(430,''),(320,'-long-fixed')]:
        path=atlas/f'forest-{w}-28{suffix}-c.json.gz';data=json.loads(gzip.decompress(path.read_bytes()))
        people={p['key']:{'asset':p['asset'],'imageScale':p['flip']} for p in data['geometry']['people']}
        assert len(people)==28 and all(p['flip'] in ['-1 1','1','1 1'] and p.get('origin') for p in data['geometry']['people'])
        rows.append({'width':w,'height':data['height'],'source':path.name,'sourceSHA256':hashlib.sha256(path.read_bytes()).hexdigest(),'people':people})
    out.write_text(json.dumps({'source':'computed CSS scale on img.character-asset','cases':rows},indent=2)+'\n')
if __name__=='__main__':style_inputs(Path(sys.argv[1]),Path(sys.argv[2]))
