"""Generate source review crops without changing any runtime artwork."""
import argparse, hashlib, json, math, subprocess
from pathlib import Path
from PIL import Image, ImageDraw

HERE=Path(__file__).resolve().parent

def coordinates(game):
    js="""import{selectRecoveredScene as s,ART_CANDIDATES as c} from './home-production-manifest.mjs';
    import{DAYPARTS as d} from './home-dayparts.mjs';let f=s('forest');
    console.log(JSON.stringify({spec:f,art:{...d.forest,waterfall:c.find(a=>a.id===f.candidate).src}}));"""
    return json.loads(subprocess.check_output(['node','--input-type=module','-e',js],cwd=game))

def edges(poly):
    return zip(poly,poly[1:]+poly[:1])

def distance(p,a,b):
    dx=b[0]-a[0];dy=b[1]-a[1]
    t=max(0,min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy)))
    return math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy)

def review(game,out):
    source=coordinates(game); spec=source['spec']
    shapes=json.loads(subprocess.check_output(['node','-p',"JSON.stringify(require('./geometry.cjs').polygons.c)"],cwd=HERE))
    sheet=Image.new('RGB',(3*302,5*179+31),'#192923');labels=ImageDraw.Draw(sheet)
    for i,title in enumerate(('Whole scene / reviewed area','Original pixels / crop','Cyan = B shoulder, yellow = C bay')):
        labels.text((i*302+6,9),title,fill='white')
    files=[]
    for row,(name,filename) in enumerate(source['art'].items()):
        path=game/filename;art=Image.open(path).convert('RGB');w,h=art.size
        left,top,right,bottom=(.50,.50,.79,.67)
        crop=art.crop((round(left*w),round(top*h),round(right*w),round(bottom*h)))
        # Keep the artwork's native proportions in every panel.
        crop.thumbnail((295,146))
        outline=crop.copy();painter=ImageDraw.Draw(outline)
        def project(x,z):
            return ((x-left)/(right-left)*crop.width,(z-top)/(bottom-top)*crop.height)
        for shape,color in zip(shapes,('#57f4eb','#ffe65f')):
            pts=[project(*p) for p in shape];painter.line(pts+[pts[0]],fill=color,width=2)
        y=30+row*179;whole=art.copy();whole.thumbnail((290,145));pen=ImageDraw.Draw(whole)
        pen.rectangle((left*whole.width,top*whole.height,right*whole.width,bottom*whole.height),outline='#f6e171')
        for col,panel in enumerate((whole,crop,outline)):
            sheet.paste(panel,(col*302+(302-panel.width)//2,y+4))
        labels.text((7,y+151),name+' / '+str(w)+' x '+str(h),fill='white')
        files.append({'paint':name,'path':filename,'dimensions':[w,h],'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
    sheet.save(out/'geometry-art-review.jpg',quality=90)
    def native(p): return [p[0]*1024,p[1]*1536]
    margins={}
    for name,poly in zip(('B shoulder','C bay'),shapes):
        a=[native(p) for p in poly];margins[name]={}
        for group in ('exclude','foreground'):
            sets=[[native(p) for p in f] for f in spec[group]]
            # Convex patches and separated silhouettes were also inspected in the full source.
            margins[name][group]=min(min(distance(v,p,q) for v in a for f in sets for p,q in edges(f)),
                                     min(distance(v,p,q) for f in sets for v in f for p,q in edges(a)))
        margins[name]['forbiddenLandmarks']=min(distance(native(v),p,q) for v in spec['forbidden'] for p,q in edges(a))
    data={'coordinateSystem':'normalized cover artwork x,z; y down','referencePixels':[1024,1536],
          'minimumEdgeDistancePx':margins,'patches':shapes,'artwork':files}
    (out/'geometry-art.json').write_text(json.dumps(data,indent=2)+'\n')


if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('game',type=Path);p.add_argument('out',type=Path)
    args=p.parse_args();review(args.game,args.out)
