"""Check the 3,920-file accepted package before examining any V5 additions."""
import argparse
import hashlib
import json
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
