import pathlib,hashlib,subprocess,re
ROOT=pathlib.Path(__file__).resolve().parents[1];P=pathlib.Path('/workspace/work/playtest');BASE='0433a39d2b75a3a7931d095dd18127958b0bb89a'
script=ROOT/'preview/bgm-subapps.js';target=P/'bgm-subapps.js';old=subprocess.check_output(['git','show',BASE+':bgm-subapps.js'],cwd=P)
assert target.read_bytes() in (old,script.read_bytes());target.write_bytes(script.read_bytes());tag=hashlib.sha256(script.read_bytes()).hexdigest()[:12]
for page in ['prototypes/naopoyo-time-hand-chapter1/index.html','prototypes/life-sugoroku/index.html','prototypes/card-game/index.html']:
 p=P/page;s=p.read_text();s,n=re.subn(r'bgm-subapps\.js(?:\?v=[a-f0-9]+)?', 'bgm-subapps.js?v='+tag,s);assert n==1;p.write_text(s)
print('Prepared only explicit BGM level0.36 and3 script cache refs',tag)
