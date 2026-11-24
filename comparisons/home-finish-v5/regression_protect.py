"""Check the 3,920-file accepted package before examining any V5 additions."""
import argparse
import hashlib
import json
import re
from pathlib import Path

BASE_FILES=3920
BASE_SHA='f9b927c65ea9f683dead97b906d569c2216f7334bad7e70e1ee915635c56f90a'


def inventory(root):
    rows={}
    for path in root.rglob('*'):
        if path.is_symlink():
            raise ValueError(f'Unexpected package symlink {path}')
        if path.is_file():
            rows[path.relative_to(root).as_posix()]=hashlib.sha256(path.read_bytes()).digest()
    return rows


def fingerprint(rows):
    digest=hashlib.sha256()
    for path in sorted(rows,key=str.encode):
        digest.update(path.encode()+b'\0'+rows[path])
    return digest.hexdigest()


def verify_active_html(base,finish):
    source=(base/'game/population.html').read_bytes()
    active=(finish/'game/finish.html').read_bytes()
    def versioned(name):
        sha=hashlib.sha256((finish/'game'/name).read_bytes()).hexdigest()[:12]
        return (name+'?v='+sha).encode()
    def once(text,old,new):
        if text.count(old)!=1:
            raise ValueError('Missing or repeated script reference '+old.decode())
        return text.replace(old,new)
    ground=(b'<link rel="stylesheet" href="'+versioned('ground.css')+b'">\n<script defer src="'+
        versioned('ground.js')+b'"></script>\n</head>')
    restored=once(active,ground,b'</head>')
    aliases={'population-policy.js':'finish-policy.js','population-seating.js':'finish-seating.js',
        'cast-population.js':'cast-finish.js','home-production-model.js':'home-production-model-finish.js',
        'home-production-touch.js':'home-production-touch-finish.js',
        'home-production-diorama-population.js':'home-production-diorama-finish.js'}
    for original,added in aliases.items():
        old=re.findall(b'src="('+re.escape(original.encode())+b'(?:\\?v=[a-f0-9]+)?)"',source)
        assert len(old)==1,original
        restored=once(restored,b'src="'+versioned(added)+b'"',b'src="'+old[0]+b'"')
    assert restored==source, 'Unreviewed change to the active game HTML, inline save initialization, or dependencies'
    return {'unchangedHTMLAfterRestoringSixReviewedURLsAndRemovingGroundIncludes':True,
        'referenceHTMLSHA256':hashlib.sha256(source).hexdigest(),'aliases':aliases}


def verify(base,finish):
    before,after=inventory(base),inventory(finish)
    assert len(before)==BASE_FILES and fingerprint(before)==BASE_SHA, 'Unrecognized V4 archive'
    differences=[path for path,sha in before.items() if after.get(path)!=sha]
    assert not differences, differences
    additions=sorted(after.keys()-before.keys())
    assert 'v5/index.html' in additions and 'game/finish.html' in additions, additions
    assert all(name.startswith(('game/','v5/')) for name in additions), additions
    categories={'sprites':'game/character-3d/','gameAssets':'game/assets/','beauty':'game/beauty/',
        'daypartArt':'game/comparisons/dayparts-','V1':'v1/','V3':'v3/','V4':'v4/'}
    return {'referenceFiles':len(before),'referenceSHA256':fingerprint(before),'retainedAtIdenticalPaths':len(before),
        'preservedGroups':{group:sum(p.startswith(prefix) for p in before) for group,prefix in categories.items()},
        'activeEntry':verify_active_html(base,finish),
        'candidateFiles':len(after),'candidateSHA256':fingerprint(after),
        'newFiles':{p:after[p].hex() for p in additions}}


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('base',type=Path)
    parser.add_argument('finish',type=Path)
    parser.add_argument('--out',required=True,type=Path)
    args=parser.parse_args()
    result=verify(args.base,args.finish)
    args.out.parent.mkdir(parents=True,exist_ok=True)
    args.out.write_text(json.dumps(result,indent=2)+'\n')
    print(f"Preserved {result['retainedAtIdenticalPaths']} files; checked {len(result['newFiles'])} additions")
