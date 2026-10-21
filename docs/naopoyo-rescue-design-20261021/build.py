from pathlib import Path
import base64, json, html, hashlib, math, sys
from PIL import Image
ROOT=Path(__file__).resolve().parent
ASSETS=Path(sys.argv[1]) if len(sys.argv)>1 else ROOT.parents[1]/'assets/characters'
OUT=ROOT
SPECIES=['dog','clownfish','penguin','frog','butterfly','dandelion']
LABELS=['DOG','CLOWNFISH','PENGUIN','FROG','BUTTERFLY','DANDELION']
def img(s,n,x,y,w,h=None):
    b=(ASSETS/s/(str(n).zfill(2)+'.png')).read_bytes()
    bb=Image.open(ASSETS/s/(str(n).zfill(2)+'.png')).getbbox()
    l,t,r,bottom=bb;l=max(0,l-2);t=max(0,t-2);r=min(128,r+2);bottom=min(128,bottom+2)
    return f'<svg x="{x}" y="{y}" width="{w}" height="{h or w}" viewBox="{l} {t} {r-l} {bottom-t}" preserveAspectRatio="xMidYMid meet"><image width="128" height="128" href="data:image/png;base64,{base64.b64encode(b).decode()}" style="image-rendering:pixelated"/></svg>'
def text(x,y,t,size=16,color='#294a50',weight=400,anchor='start'):
    return f'<text x="{x}" y="{y}" font-size="{size}" fill="{color}" font-weight="{weight}" text-anchor="{anchor}">{html.escape(str(t))}</text>'
def rect(x,y,w,h,c,r=0,stroke='none'):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{c}" stroke="{stroke}"/>'
def ellipse(x,y,rx,ry,c):return f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="{c}"/>'
def path(d,c,stroke='none',sw=1):return f'<path d="{d}" fill="{c}" stroke="{stroke}" stroke-width="{sw}" stroke-linejoin="round" stroke-linecap="round"/>'
def star(x,y,r,c='#fff1ac'):
    return path(f'M {x} {y-r} Q {x+r*.2} {y-r*.2} {x+r} {y} Q {x+r*.2} {y+r*.2} {x} {y+r} Q {x-r*.2} {y+r*.2} {x-r} {y} Q {x-r*.2} {y-r*.2} {x} {y-r}',c)
def condition(s='dog',op='≥',n='02',layout='bottom'):
    y=70 if layout=='bottom' else 3
    if s is None:return rect(3,y,94,27,'#fffdf2',5,stroke='#82968a')+text(50,y+21,op+n,25,weight=700,anchor='middle')
    if layout=='split':
        return rect(3,3,29,29,'#fffdf2',5)+img(s,6,3,3,29)+rect(34,70,63,27,'#fffdf2',5)+text(66,90,op+n,25,weight=700,anchor='middle')
    return rect(3,y,94,27,'#fffdf2',5,stroke='#82968a')+img(s,6,4,y-1,29)+text(65,y+21,op+n,25,weight=700,anchor='middle')
def exit_icon(kind='arch',s='dog',op='≤',n='01',layout='bottom'):
    if kind=='old':
        a=path('M11 95 V45 Q11 7 50 7 Q89 7 89 45 V95 Z','#76a89d')+path('M23 91 V47 Q23 21 50 21 Q77 21 77 47 V91 Z','#3a6465')+star(50,53,17)+text(50,0,'≤01',17,anchor='middle',weight=700)
        return a
    if kind=='hex':
        a=path('M25 5 H75 L94 34 85 66 H15 L6 34 Z','#315e67')+path('M23 18 V56 H55','none','#f7f2d5',4)+path('M37 35 H78 M64 20 L79 35 64 50','none','#fff9ce',8.5)
    else:
        a=ellipse(50,62,42,6,'#acc8b9')+path('M12 67 V38 Q12 3 50 3 Q88 3 88 38 V67 Z','#78a99b')+path('M23 65 V39 Q23 14 50 14 Q77 14 77 39 V65 Z','#315e62')+ellipse(50,39,22,22,'url(#glow)')+star(50,38,17)+path('M24 63 H76','none','#d6e7ce',3)
    if layout=='top':a=f'<g transform="translate(0 30) scale(1 .58)">{a}</g>'
    return a+condition(s,op,n,layout)
def gate(kind='owl',opened=False,layout='bottom',occupant=False,species='dog'):
    c='#94a990' if opened else '#b99a70'
    a=rect(7,30,10,37,c,3)+rect(83,30,10,37,c,3)+rect(7,27,86,9,'#8e765e',3)
    if opened:
        a+=path('M19 38 L27 42 V62 L19 66 M81 38 L73 42 V62 L81 66','none','#92765b',4)+path('M35 63 L50 58 65 63 M35 53 L50 48 65 53','none','#a6c0a1',3)
    else:
        a+=rect(20,38,28,27,'#d3b082',2)+rect(52,38,28,27,'#d3b082',2)+path('M26 42 V61 M41 42 V61 M59 42 V61 M74 42 V61','none','#9a7b5b',3)+rect(45,47,10,8,'#665946',2)
    if kind=='owl':a+=img('companions','owl',31,0,38,35)
    elif kind=='spirit':a+=img('god',3,31,0,38,35)
    else:a+=path('M38 4 H62 V17 Q62 27 50 32 Q38 27 38 17 Z','#547b70')+path('M44 16 L49 21 57 12','none','#f6edc9',3)
    if layout=='top':a=f'<g transform="translate(0 29) scale(1 .58)">{a}</g>'
    if occupant:a+=img('dog',2,24,24,52)
    return a+condition(species,'≥','02',layout)+(rect(72,3,25,21,'#fffdf2',3)+text(84,19,'02',16,weight=700,anchor='middle') if occupant else '')
def tile(body,x,y,size=100):return f'<g transform="translate({x} {y}) scale({size/100})">'+rect(0,0,100,100,'#e8eee0',12)+body+'</g>'
def actor(s,n,depth=False):
    a=ellipse(50,75,35,9,'#c3d4c0') if depth else ''
    if depth:a+=ellipse(50,67,40,26,'url(#shell)')
    a+=img(s,n,10,4,80,70)
    if depth:a+=path('M21 41 Q22 27 34 22','none','#ffffffaa',4)
    return a+rect(56,73,41,26,'#fffdf2',5)+text(76,94,str(n).zfill(2),25,weight=700,anchor='middle')
def sheet(name,title,subtitle,content,h=850):
    defs='<defs><radialGradient id="glow"><stop stop-color="#f7eaa6" stop-opacity=".6"/><stop offset="1" stop-color="#f7eaa6" stop-opacity="0"/></radialGradient><radialGradient id="shell" cx="30%" cy="20%"><stop stop-color="#fff" stop-opacity=".5"/><stop offset="1" stop-color="#92b6b0" stop-opacity=".13"/></radialGradient></defs>'
    s=f'<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="{h}" viewBox="0 0 1200 {h}" font-family="DejaVu Sans,sans-serif">'+defs+rect(0,0,1200,h,'#f5f3e9')+text(42,40,'NAOPOYO / VISUAL STUDY  ·  21 OCT 2026',12,'#758980',700)+text(42,86,title,32,weight=700)+text(42,118,subtitle,15,'#71847c')+content+text(42,h-24,'DESIGN ONLY  /  Original character PNGs preserved  /  PR #412 runtime unchanged',12,'#71847c')+'</svg>'
    (OUT/(name+'.svg')).write_text(s)
    return s
all_sheets=[]
body=''
notes=['Warm silhouette / core candidate','Sea identity / core candidate','Strong contrast / core candidate','Clear metamorphosis / core candidate','Larva to wings / expansion','Bud, flower, seeds / expansion']
for i,s in enumerate(SPECIES):
 x=42+(i%3)*380;y=155+(i//3)*285
 body+=rect(x,y,356,262,'#fffdf7',20)+text(x+20,y+34,LABELS[i],19,weight=700)+tile(actor(s,6),x+116,y+52,124)+text(x+20,y+211,notes[i],14)+text(x+20,y+237,'Existing 01–08 assets · no redesign',12,'#7e8d83')
all_sheets.append(('01-candidates',sheet('01-candidates','Six familiar species, one shared world','First release recommendation: dog + clownfish + penguin + frog.',body,780)))
body=''
for i,s in enumerate(SPECIES):
 y=158+i*101;body+=text(42,y+47,LABELS[i],14,weight=700)
 for n in range(1,9):
  x=220+(n-1)*116;body+=tile(actor(s,n),x,y,85)+text(x+43,y-9,str(n).zfill(2),12,'#71847c',anchor='middle')
body+=text(42,825,'ALL 48 STAGES AT 42 px / actual cell size',18,weight=700)
for i,s in enumerate(SPECIES):
 y=850+i*56;body+=text(42,y+28,LABELS[i],13,weight=700)
 for n in range(1,9):body+=tile(actor(s,n),220+(n-1)*80,y,42)
all_sheets.append(('02-growth',sheet('02-growth','01 → 08, exactly as they already are','Keep life stages and attached details. A clear number supports small-screen recognition.',body,1230)))
body=''
for i,(kind,label,desc) in enumerate([('old','A0 · ORIGINAL','Original arch geometry; label exceeds the cell.'),('arch','A · RESTORED + FITTED','Recommended: star arch + in-cell condition.'),('hex','B · CURRENT','Current hexagon + outward arrow.')]):
 x=42+i*390;body+=rect(x,156,366,520,'#fffdf7',18)+text(x+20,193,label,20,weight=700)+tile(exit_icon(kind),x+73,235,220)+text(x+20,495,'42 px cell',14)+tile(exit_icon(kind),x+150,469,42)+text(x+20,557,desc.split(';')[0],12)+text(x+20,585,'Rescue: the matching actor leaves the board.',12,'#71847c')
all_sheets.append(('03-exits',sheet('03-exits','A glowing star means “home”','Restore the old exit character; keep all new labels inside the cell.',body,740)))
body=''
for i,(kind,label) in enumerate([('spirit','A · EXISTING SPIRIT (god / 03)'),('owl','B · EXISTING OWL (recommended)'),('symbol','C · SHIELD SYMBOL')]):
 x=42+i*390;body+=rect(x,154,366,540,'#fffdf7',18)+text(x+18,187,label,15,weight=700)
 body+=tile(gate(kind),x+28,225,140)+tile(gate(kind,True),x+198,225,140)+text(x+98,397,'CLOSED',12,anchor='middle')+text(x+268,397,'OPEN',12,anchor='middle')
 body+=tile(gate(kind),x+110,430,42)+tile(gate(kind,True),x+210,430,42)+text(x+18,520,'42 px: guardian stays, center opens.',13)+text(x+18,550,'Passage only. No actor is consumed.',13)+text(x+18,580,'Condition stays visible after opening.',13)
all_sheets.append(('04-guardians',sheet('04-guardians','A guardian opens a passage','Three proposals. The spirit and owl are existing official characters, not newly invented ones.',body,760)))
body=''
for i,(layout,label) in enumerate([('bottom','A · BOTTOM STRIP / recommended'),('top','B · TOP STRIP'),('split','C · SPLIT CORNERS')]):
 x=42+i*390;body+=rect(x,154,366,520,'#fffdf7',18)+text(x+18,189,label,15,weight=700)+tile(gate('owl',False,layout),x+35,225,135)+tile(exit_icon('arch',layout=layout),x+197,225,135)+tile(gate('owl',True,layout,True),x+90,406,72)+tile(exit_icon('arch',layout=layout),x+215,423,42)+text(x+18,529,'Species + comparator + two-digit stage',13)+text(x+18,558,'=02 exactly   ≥02 at least   ≤02 at most',12)+text(x+18,589,'Occupant level stays at upper right.',13)
all_sheets.append(('05-labels',sheet('05-labels','Conditions should read as one phrase','Use a consistent species portrait (06) for the icon; never substitute the required stage image.',body,740)))
body=''
for i,s in enumerate(['dog','clownfish','frog']):
 x=42+i*390;body+=rect(x,154,366,490,'#fffdf7',18)+text(x+18,188,s.upper(),18,weight=700)+tile(actor(s,3),x+29,230,140)+tile(actor(s,3,True),x+197,230,140)+text(x+98,406,'ORIGINAL',12,anchor='middle')+text(x+267,406,'2.5D WRAPPER',12,anchor='middle')+tile(actor(s,3),x+105,443,42)+tile(actor(s,3,True),x+219,443,42)+text(x+18,538,'Same PNG. Add a base shadow and soft rim.',12)+text(x+18,569,'Squash briefly on merge / split only.',12)
all_sheets.append(('06-display',sheet('06-display','Keep the art. Add just a little softness.','Recommended: original pixel art + contact shadow; reserve the glossy wrapper as an option.',body,710)))
def phone(x,y,kind='owl',width=390):
 a=rect(x,y,width,620,'#fffdf7',24,stroke='#dbe1d5')+text(x+20,y+36,'NAOPOYO',16,weight=700)+text(x+20,y+70,'10  ·  Everyone goes home',21,weight=700)+text(x+20,y+99,'Merge, open the gate, split, then rescue.',12,'#71847c')
 bx=x+27;by=y+140;cell=42
 for row in range(6):
  for col in range(8):a+=rect(bx+col*cell,by+row*cell,cell,cell,'#e7eddf' if (row+col)%2 else '#edf2e6',3)
 for col,row in [(3,3),(4,3),(5,3)]:a+=tile(rect(4,7,92,87,'#b6c7a8',10)+rect(10,9,80,8,'#dbe5ce',2),bx+col*cell,by+row*cell,cell)
 for col,s in [(1,'dog'),(2,'dog')]:a+=tile(actor(s,1),bx+col*cell,by+2*cell,cell)
 a+=tile(actor('clownfish',1),bx+cell,by+4*cell,cell)+tile(gate(kind,species=None),bx+3*cell,by+2*cell,cell)+tile(exit_icon('arch','dog'),bx+7*cell,by+2*cell,cell)+tile(exit_icon('arch','clownfish','=', '01'),bx+7*cell,by+4*cell,cell)
 a+=tile(path('M15 70 L28 38 40 70 M40 70 L53 38 65 70 M65 70 L78 38 90 70','#c6a67d'),bx+4*cell,by+2*cell,cell)
 a+=text(x+27,y+419,'3 actors remaining',12,'#71847c')+text(x+290,y+419,'0 moves',12,'#71847c')
 for i,t in enumerate(['Undo','Restart','Hint']):a+=rect(x+27+i*115,y+444,106,44,'#f2f3e8',10,stroke='#d9e1d2')+text(x+80+i*115,y+471,t,13,anchor='middle')
 a+=text(x+27,y+523,'Star arch = rescue',13)+text(x+27,y+549,'Guardian gate = passage',13)+text(x+27,y+583,'Static art study · not a playable stage',11,'#869389')
 return a
body=phone(42,155,'owl')+phone(450,155,'symbol')+text(872,190,'ACTUAL CELL',17,weight=700)+tile(gate(),874,220,42)+text(932,247,'42 px',16)+text(872,300,'390 px viewport',15)+text(872,328,'8 columns × 6 rows',15)+text(872,356,'336 px board',15)+text(872,405,'Same stage-10 positions.',13)+text(872,432,'English study labels only;',13)+text(872,456,'game text is unchanged.',13)+text(872,510,'At 375 px: cell ≈ 40.4 px.',13)+text(872,538,'At 430 px: cell ≈ 47.4 px.',13)+text(872,590,'Review on your iPhone',15,weight=700)+text(872,618,'at normal zoom.',13)
all_sheets.append(('07-iphone',sheet('07-iphone','The design must survive a real-sized board','Two static 390 px layouts: owl gate and symbol gate. Existing stage-10 coordinates retained.',body,840)))
sections=[]
jp=['候補6種族','01〜08の成長比較','出口：旧型・復活案・現行','番人付き扉の3案','条件札の3配置','既存画像と2.5D風表示','iPhone盤面モックアップ']
for (name,svg),label in zip(all_sheets,jp):sections.append(f'<section id="{name}"><h2>{label}</h2><img src="{name}.svg" alt="{label}"></section>')
page='''<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>なおぽよ デザイン比較</title><style>*{box-sizing:border-box}body{margin:0;background:#f5f3e9;color:#294a50;font:16px system-ui,sans-serif}main{max-width:1200px;margin:auto;padding:24px}h1{font-size:28px}p{line-height:1.8}nav{display:flex;gap:10px;flex-wrap:wrap}a{color:#315e62}section{margin:40px 0}section>img{width:100%;height:auto;border-radius:16px} .actual{width:390px;max-width:none;overflow:hidden} .phone-scroll{overflow:auto}.note{background:#fffdf7;border-radius:16px;padding:18px} @media(max-width:500px){main{padding:16px}section{overflow:auto}section>img{min-width:780px}}</style><main><h1>なおぽよ・レスキュー デザイン比較</h1><p>正式キャラをそのまま使い、門と出口を見分けやすく。比較専用で、ゲーム本体には未反映です。</p><div class="note"><b>推奨：</b>いぬ・カクレクマノミ・ペンギン・かえるの4種族から開始。星のアーチ出口＋ふくろうの門＋下部条件札。キャラは既存ドット絵＋薄い接地影を基本にします。</div><p>画像内の英語は比較用の注記です。実装時の日本語表示は維持します。拡大比較と下の実寸盤面を見比べてください。</p><nav>'''+''.join(f'<a href="#{n}">{j}</a>' for (n,_),j in zip(all_sheets,jp))+'</nav>'+''.join(sections)+'''<h2>390px幅・実寸の盤面</h2><p>横にスクロールできます。端末幅によって画像が縮小されない実寸表示です。</p><div class="phone-scroll"><div class="actual">'''+f'<svg xmlns="http://www.w3.org/2000/svg" width="390" height="620" font-family="sans-serif"><defs><radialGradient id="glow"><stop stop-color="#fff2b3" stop-opacity=".6"/><stop offset="1" stop-color="#fff2b3" stop-opacity="0"/></radialGradient></defs>{phone(0,0)}</svg>'+'</div></div><p>選ぶ項目：①番人 A/B/C ②出口 A/B ③条件札 A/B/C。初期4種族の追加・入れ替えも可能です。</p></main></html>'
(OUT/'index.html').write_text(page)
standalone=page.replace('section>img','section>svg')
for (name,svg),label in zip(all_sheets,jp):standalone=standalone.replace(f'<img src="{name}.svg" alt="{label}">',svg)
(OUT/'comparison.html').write_text(standalone)
print('7 SVG comparison boards + HTML created')
