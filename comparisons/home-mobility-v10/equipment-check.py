"""Compare the native owner and accessory after every pose in the archived active fixture."""
import argparse,gzip,json
from pathlib import Path
from playwright.sync_api import sync_playwright
from performance_common import HERE,V9,WPE,clock,digest,load,native_page,save
fixed=load('v10_fixed',HERE/'performance-fixed.py');previous=load('v9_equipment',V9/'equipment-parity.py')

def main(args):
    source=json.loads(gzip.decompress(args.poses.read_bytes()));poses=[r['positions'] for r in source]
    painters,hashes=fixed.painters(args.base,guard=True)
    hook=previous.AUDIT.replace('const before=read(\'v8\'),after=read(\'v9\');',"const before=read('v8'),other=read('v9'),probe=read('guarded'),after=read('v10');if(JSON.stringify(before)!==JSON.stringify(other)||JSON.stringify(before)!==JSON.stringify(probe))errors.push({pose:i,other,probe});").replace('PAINTERS',painters)
    def insert(name,src):return clock.replace(src,'    function stop(){',hook+'\n    function stop(){') if 'production-diorama' in name else src
    with sync_playwright() as pw:
        b=pw.webkit.launch(executable_path=WPE);p,errors,_=native_page(b,args.base,'v9',init=fixed.HOLD,transform=insert);r=p.evaluate('v=>mobilityPerf.attachmentAudit(v)',poses)
        save(args.out,dict(browser=b.version,posesSHA256=digest(json.dumps(source,separators=(',',':'))),controllers=hashes,**r));assert not errors and not r['errors'] and r['pairs']>=len(poses) and r['distinctAttachmentPoses']>1;b.close()
if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--base',default='http://127.0.0.1:8461/game');p.add_argument('--poses',type=Path,required=True);p.add_argument('--out',type=Path,required=True);main(p.parse_args())
