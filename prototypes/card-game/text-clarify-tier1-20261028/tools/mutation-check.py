import subprocess,sys,re
M=[('effects.mjs',"e.n==='submarine'?3+Number(l.variant)*2:e.n","e.n==='submarine'?3+Number(l.variant):e.n"),
('remaining-rules.mjs',"[{op:'search',n:2,min:1,max:1}],{condition:'eventPersonPlaced'","[{op:'search',n:2,min:1,max:1}],{eventActor:'any',condition:'eventPersonPlaced'"),
('rules.mjs',"{variants:[0,1,2],extraTime:'variant'}","{variants:[0,1,2]}")]
M0=[('effects.mjs',"case 'sourceUnequipped':return !b.prepared.some(e=>!e.faceDown&&e.target===l.source);","case 'sourceUnequipped':return true;"),
('late-conditions.mjs',"ev.destination==='discard'&&ev.transition==='transform'","ev.destination==='discard'"),
('main-rules.mjs',"condition:all(v('companions','gte',1),v('partner','eq',1),v('world','eq',1))}),","condition:all(v('companions','gte',1),v('partner','eq',1))}),"),
('remaining-rules.mjs',"[{op:'battleStat',n:-2}],{eventActor:'opponent'","[{op:'battleStat',n:-2}],{eventActor:'any'"),
('effects.mjs',"case 'time2':return p.time===2;","case 'time2':return p.time===3;"),
('late-conditions.mjs',"case 'targetSelectedApplied':return ev.source===l.target&&","case 'targetSelectedApplied':return true||"),
('effects.mjs',"case 'discardHasEventName':return !!l.event?.source&&","case 'discardHasEventName':return true||"),
('remaining-rules.mjs',"{condition:'eventPersonPlaced',duration:'nextEnd'}","{condition:'eventPersonPlaced',duration:'nextStart'}"),
('remaining-rules.mjs',"select:[pay('ownDiscard',{type:'main'})]","select:[pay('ownDiscard',{})]"),
('rules.mjs',"replace:'stay',optional:true,limit:'round',condition:'sourceUnequipped'","replace:'stay',optional:true,limit:'turn',condition:'sourceUnequipped'"),
]
import os
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','..'))
for f,a,b in M+M0:
    src=open(f).read()
    if a not in src: print('MISSING',f,a[:50]); continue
    open(f,'w').write(src.replace(a,b,1))
    r=subprocess.run(['node','--test','tests/tier1-direct.test.mjs'],capture_output=True,text=True)
    open(f,'w').write(src)
    fails=[l for l in r.stdout.splitlines() if l.startswith('not ok') and not re.match(r'not ok (1|4) ',l)]
    print(len(fails),'caught' if fails else 'MISSED',f,b[:60],'|',fails[:2])
