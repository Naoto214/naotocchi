"""Verify numerical scope of independent replays after strict painted obstruction checks."""
import argparse,hashlib,json
from pathlib import Path
HERE=Path(__file__).resolve().parent
def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def load(p):return json.loads(p.read_bytes())
def comparable(obj):
    # Absolute observer costs and revised source identity are reported separately.
    if isinstance(obj,dict):
        return {k:comparable(v) for k,v in obj.items() if k not in {'model','modelSHA256','cost','source','nativeStateSHA256'}}
    if isinstance(obj,list):return list(map(comparable,obj))
    return obj

def check(old,strictgame):
    evidence=HERE/'evidence';rows=[]
    for oldname,newname in [
        *[(f'geometry-{w}',f'terrain-strict-{w}') for w in (320,375,390,430)],
        ('geometry-pairs-320','terrain-strict-pairs-4'),('geometry-pairs-320-fine','terrain-strict-pairs-2'),
        ('geometry-browser','terrain-strict-browser'),('geometry-direction-audit','terrain-strict-directions'),
        ('geometry-pair-browser','terrain-strict-pair-browser'),('geometry-600-c','terrain-strict-600-c'),
        ('geometry-600-rabbit','terrain-strict-600-rabbit')]:
        a=evidence/(oldname+'.json');b=evidence/(newname+'.json')
        if not b.is_file():continue
        left,right=load(a),load(b)
        rows.append({'originalFile':a.name,'strictFile':b.name,'originalSHA256':digest(a),'strictSHA256':digest(b),
            'byteIdentical':digest(a)==digest(b),'sameNumericalResultsApartFromTimingAndSourceIdentity':comparable(left)==comparable(right)})
        if 'actors' in right and 'originalCheckpointSHA256' in right:
            rows[-1]['sameOpening']=left['originalCheckpointSHA256']==right['originalCheckpointSHA256']
            rows[-1]['sameFinalNativeState']=left['nativeStateSHA256']==right['nativeStateSHA256']
    arch=old/'home-visible-ground-navigation-v13.mjs' if old else None
    silhouettes={'projection':'independent measured image scale on each axis and native CSS facing', 'baselineInputs':'V12 recorded client rectangles and feet'}
    direct=evidence/'terrain-strict-contact.json';fine=evidence/'terrain-strict-contact-fine.json'
    if direct.is_file():
        orig=load(evidence/'terrain-strict-contact-baseline.json')['cases'];actual=load(direct)['cases']
        silhouettes['cameras']=[{'width':v['width'],'height':v['height'],
            'originalInputSHA256':u['sourceSHA256'],'strictInputSHA256':v['sourceSHA256'],
            'sameScale':u['nativeScale']==v['nativeScale'],
            'sameEveryMarginCountAndWitness':u['marginsModelPixels']==v['marginsModelPixels']}
            for u,v in zip(orig,actual,strict=True)]
    if fine.is_file():
        previous=load(evidence/'terrain-strict-contact-baseline-fine.json');final=load(fine)
        silhouettes['sameOpaqueCoreCountsAndWitnesses']=previous['results']==final['results']
    data={'silhouettes':silhouettes,'firstPassNavigationSHA256':digest(arch) if arch else None,
          'strictNavigationSHA256':digest(strictgame/'home-visible-ground-navigation-v13.mjs'),
          'strictPatchSHA256':digest(HERE/'geometry.cjs'),'comparisons':rows}
    (evidence/'terrain-strict-equivalence.json').write_text(json.dumps(data,indent=2)+'\n')
    return data

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('strictgame',type=Path);p.add_argument('--first-pass-game',type=Path)
    a=p.parse_args();check(a.first_pass_game,a.strictgame)
