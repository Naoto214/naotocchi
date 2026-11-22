"""Print a standalone V11 renderer-only or V12 same-projection-only patch against the pinned official home."""
from argparse import ArgumentParser
from difflib import unified_diff
from hashlib import sha256
from pathlib import Path
import shutil
import subprocess
import sys
from tempfile import TemporaryDirectory

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
RENDER="home-production-diorama.js"
MODEL="home-production-model.js"
WORLD="home-production-world.mjs"
FILES=(RENDER,MODEL,WORLD,"index.html")


def difference(name,before,after):
    return "".join(unified_diff(before.splitlines(keepends=True),after.splitlines(keepends=True),
                                fromfile="a/"+name,tofile="b/"+name))


def renderer_v11(source):
    script="const fs=require('node:fs');process.stdout.write(require(process.argv[1]).patchFoot(fs.readFileSync(0,'utf8')))"
    return subprocess.check_output(["node","-e",script,str(HERE.parent/"home-mobility-v11/foot.cjs")],
                                   input=source,text=True)


def build(part):
    with TemporaryDirectory(prefix="foot-port-parts-") as d:
        temp=Path(d)
        orig={name:(ROOT/name).read_text() for name in FILES}
        baseline="bff63b9db6fd22334fbf776090a318bc671ce5aa"
        for name in FILES:
            pin=subprocess.check_output(["git","rev-parse",baseline+":"+name],cwd=ROOT,text=True).strip()
            current=subprocess.check_output(["git","hash-object",str(ROOT/name)],text=True).strip()
            if current!=pin:
                raise ValueError("Unexpected original home source: "+name)
            shutil.copyfile(ROOT/name,temp/name)
        subprocess.run(["git","apply","--check",str(HERE/"foot-only.patch")],cwd=temp,check=True)
        subprocess.run(["git","apply",str(HERE/"foot-only.patch")],cwd=temp,check=True)
        full={name:(temp/name).read_text() for name in FILES}
        part_a=renderer_v11(orig[RENDER])
        chosen=orig.copy()
        if part=="v11":
            chosen[RENDER]=part_a
        else:
            # Apply just the world-import and model-descriptor changes to the original painter.
            # Verify that the two transformations commute on the exact official source.
            delta=difference(RENDER,part_a,full[RENDER])
            (temp/RENDER).write_text(orig[RENDER])
            subprocess.run(["patch","--batch","--silent","--fuzz=0","-p1"],cwd=temp,
                                input=delta,text=True,check=True,capture_output=True)
            chosen[RENDER]=(temp/RENDER).read_text()
            assert renderer_v11(chosen[RENDER])==full[RENDER]
            chosen[MODEL],chosen[WORLD]=full[MODEL],full[WORLD]
        for name in (RENDER,MODEL):
            token=lambda s:name+"?v="+sha256(s.encode()).hexdigest()[:12]
            assert chosen["index.html"].count(token(orig[name]))==1
            chosen["index.html"]=chosen["index.html"].replace(token(orig[name]),token(chosen[name]))
        return "".join(difference(name,orig[name],chosen[name]) for name in FILES)


if __name__=="__main__":
    parser=ArgumentParser(description=__doc__)
    parser.add_argument("part",choices=["v11","v12"])
    options=parser.parse_args()
    sys.stdout.write(build(options.part))
