"""Read-only representative oracle; never imports or starts a population runner."""
import sys,json,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3]
TOOLS=ROOT/'docs/card-game/tools'
sys.path.insert(0,str(TOOLS))
import proxy_continuation_rules as rules
import proxy_continuation_challenge as challenge
import proxy_hit_blow_response_142 as hit
ids=['M-beetle-01','M-antlion-01'];out={'main':[],'stats':[],'hit':[]}
for old in [None,*ids]:
 for dest in ids:
  for time in [0,1,2]:
   variant='birth' if old is None else 'time_skip' if old==dest else 'transform'
   value=rules.main_transition(old,dest,variant,time,ids)
   out['main'].append(dict(old=old,dest=dest,time=time,legal=value['legal'],cost=value['payment_time']))
for main in ids:
 for hands in [0,2,3]:
  for world in [False,True]:
   for both in [False,True]:
    for chameleon in [False,True]:
     g={'cards':{'m':{'card_id':main},'w':{'card_id':'W-deepsea'},'w2':{'card_id':'W-deepsea'},'c':{'card_id':'C-chameleon'}},'players':{'A':{'hand':['h']*hands,'board':{'main':'m','world':'w' if world else None,'companions':['c'] if chameleon else []}},'B':{'board':{'world':'w2' if both else None}}}}
     e={'legacy_continuation':{'game_state':g},'runtime':{'stat_effects':[]}}
     out['stats'].append(dict(main=main,hands=hands,world=world,both=both,chameleon=chameleon,value=challenge.stats(e,'A')))
for top in ['M-beetle-01','C-box','I-c_coin2']:
 for declare in ['main','companion','item']:
  link=dict(action_type='use_play',card_id='G-hit-blow',candidate_variant=declare,target_instance_ids=[],payment={'time':1},actor='A',source_instance_id='source')
  p=dict(deck=['top','next'],hand=[],discard=[],growth=20)
  s=dict(game_state=dict(players={'A':p},cards={'top':{'card_id':top},'next':{'card_id':'W-deepsea'}}),activation_zone=[link])
  hit.apply_hit_blow_effect(s,link)
  out['hit'].append(dict(top=top,declare=declare,value=p))
out['provenance']={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in [Path(rules.__file__),Path(challenge.__file__),Path(hit.__file__)]}
print(json.dumps(out,ensure_ascii=False,indent=2))
