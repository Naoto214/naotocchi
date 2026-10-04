"""445A input boundary. Full state exists only on the projection side."""
import copy
import hashlib
import json
from pathlib import Path
from functools import lru_cache
from proxy_resource_value_inputs import project_visible, validate_sources
from proxy_resource_value_comparison import validate_problem
from proxy_resource_value_selection import canonical_sha256 as sha
from proxy_continuation_public_history import event_projection

ROOT=Path(__file__).resolve().parents[1]
SCHEMA='naotocchi.card_game.equivalence_input.v1'
VIEW_SCHEMA='naotocchi.card_game.equivalence_view.v1'
EFFECTS=('payment_effects','stat_effects','conditional_effects')
RUNTIME={'attachments','ability_uses','public_prepared',*EFFECTS}
CONTROL={'source_phase','phase','window_kind','origin_event_seq','turn_player','priority_actor','chain_status','chain_links','consecutive_passes','response_opportunity_index','decision_kind','choice_kind'}
VIEW_KEYS={'schema','actor','public','runtime','control','rights','history','egg_state','coverage','event_seq'}
INPUT_KEYS={'schema','view','actions','baseline_problem','source_manifest'}

@lru_cache(maxsize=1)
def _sources():
 table=json.loads((ROOT/'data/proxy-normal-decision-candidate-table-114-20260918.json').read_text())
 names={'01-core-rules.md','02-main-system.md','06-action-chain-checkpoint.md','64-turn-boundaries-and-victory-timing.md','114-normal-decision-protocol-hardening.md','116-normal-decision-fallback-contract.md','119-response-window-contract.md','data/proxy-normal-decision-candidate-table-114-20260918.json'}
 names.update(a['source_text_reference'].split('#')[0] for c in table['cards'] for a in c['actions'])
 return {n:hashlib.sha256((ROOT/n).read_bytes()).hexdigest() for n in sorted(names)}

def source_manifest():return copy.deepcopy(_sources())

def _integer(value):
 if type(value) is not int or value<0:raise ValueError('invalid nonnegative integer')

def project_equivalence_view(continuation: dict, actor: str, public_history: list) -> dict:
 e=continuation
 if set(e)!={'schema','execution_contract_id','event_seq','legacy_continuation','runtime'} or e['schema']!='naotocchi.card_game.continuation_envelope.v2' or e['execution_contract_id']!='continuation_contract_v2':raise ValueError('unsupported envelope')
 if actor not in ('A','B'):raise ValueError('invalid actor')
 _integer(e['event_seq']);c=copy.deepcopy(e['legacy_continuation']);g=c['game_state'];rt=copy.deepcopy(e['runtime'])
 if set(c)!={'game_state','response_context','activation_zone','pending_triggers','return_target'} or set(g)!={'cards','players','round','turn_player','phase'} or set(rt)!=RUNTIME:raise ValueError('unknown envelope field')
 if set(g['players'])!={'A','B'} or set(c['response_context'])!=CONTROL:raise ValueError('invalid players/control')
 _integer(g['round'])
 prepared={};located=[]
 for owner,p in g['players'].items():
  if set(p)!={'board','hand','deck','discard','reservations','time','growth','challenge_used','person_placed','relationship_progressed'}:raise ValueError('unknown player field')
  for k in ('time','growth'):_integer(p[k])
  for k in ('challenge_used','person_placed','relationship_progressed'):
   if type(p[k]) is not bool:raise ValueError('invalid public right')
  for zone in ('hand','deck','discard'):located.extend(p[zone])
  b=p['board'];located.extend([x for x in (b['main'],b['partner'],b['world']) if x]);located+=b['companions']+b['prepared']
  prepared[owner]=[]
  for slot,sid in enumerate(b['prepared']):
   meta=rt['public_prepared'][sid]
   if set(meta)!={'controller','face_up','paid_time','placed_event_seq'} or meta['controller']!=owner or type(meta['face_up']) is not bool:raise ValueError('invalid prepared metadata')
   _integer(meta['paid_time']);_integer(meta['placed_event_seq'])
   g['cards'][sid]['public_face_up']=meta['face_up'];g['cards'][sid]['public_paid_time']=meta['paid_time']
   row=dict(slot=slot,**meta)
   if owner==actor or meta['face_up']:row['source_instance_id']=sid
   prepared[owner].append(row)
 if len(located)!=len(set(located)) or any(s not in g['cards'] for s in located):raise ValueError('card location differs')
 expected={s for p in g['players'].values() for s in p['board']['prepared']}
 if set(rt['public_prepared'])!=expected:raise ValueError('prepared coverage differs')
 # Existing public runtime projection: face-up attachments and publicly used effects.
 for sid,row in rt['attachments'].items():
  if sid not in expected or not rt['public_prepared'][sid]['face_up'] or set(row)!={'controller','target_instance_id','attached_event_seq'}:raise ValueError('invalid public attachment')
 effect_keys={'effect_id','controller','source_instance_id','created_event_seq','turn_player','round','payment_kind','amount','target_instance_id','power','wisdom','challenge_id','difference','parameter'}
 for key in EFFECTS:
  if not isinstance(rt[key],list):raise ValueError('invalid effect list')
  seen=set()
  for row in rt[key]:
   if not isinstance(row,dict) or not set(row)<=effect_keys or not {'effect_id','source_instance_id','controller'}<=set(row):raise ValueError('unknown effect representation')
   if row['effect_id'] in seen:raise ValueError('duplicate effect')
   seen.add(row['effect_id'])
   for k in ('amount','power','wisdom','round','created_event_seq','difference'):
    if k in row and type(row[k]) is not int:raise ValueError('invalid effect numeric')
 for row in rt['ability_uses']:
  if set(row)!={'source_instance_id','ability_key','turn_player','round','count'}:raise ValueError('unknown usage field')
  _integer(row['round']);_integer(row['count'])
 rt['public_prepared']=prepared
 # NORMAL inputs normally have no pending links. A new pending representation
 # is preserved as unknown coverage rather than copied from possibly hidden data.
 unknown=[];pending={}
 for key in ('activation_zone','pending_triggers'):
  pending[key]=[]
  if c[key]:
   pending[key]=[{'position':i,'unprojected_obligation':True} for i in range(len(c[key]))]
   unknown.append(key+'_public_projection_unproved')
 ctx=c['response_context']
 if ctx['chain_links']:unknown.append('chain_link_projection_unproved');ctx['chain_links']=[{'position':i,'unprojected_link':True} for i in range(len(ctx['chain_links']))]
 for k in ('consecutive_passes','response_opportunity_index','origin_event_seq'):
  if ctx[k] is not None:_integer(ctx[k])
 history=[event_projection(h,actor) for h in public_history]
 return dict(schema=VIEW_SCHEMA,actor=actor,event_seq=e['event_seq'],public=project_visible(c,actor),runtime=rt,
  control=dict(round=g['round'],turn_player=g['turn_player'],phase=g['phase'],response_context=ctx,return_target=c['return_target'],**pending),
  rights={o:{k:p[k] for k in ('challenge_used','person_placed','relationship_progressed')} for o,p in g['players'].items()},history=history,
  egg_state={o:'egg' if p['board']['main'] is None else 'external_egg' for o,p in g['players'].items()},
  coverage=dict(public_projection='existing_114_119_continuation_v2',unknowns=unknown,opaque_regions=['opponent_hand','decks','opponent_concealed_prepared']))

def _validate_view(v):
 if set(v)!=VIEW_KEYS or v['schema']!=VIEW_SCHEMA or v['actor'] not in ('A','B'):raise ValueError('view schema differs')
 _integer(v['event_seq']);p=v['public'];control=v['control']
 if set(p)!={'information_policy','own_hand','own_board','opponent_board','growth','time','discard','reservations'} or p['information_policy']!='public_and_owner_known_only':raise ValueError('public view keys differ')
 if set(control)!={'round','turn_player','phase','response_context','return_target','activation_zone','pending_triggers'} or set(control['response_context'])!=CONTROL:raise ValueError('control keys differ')
 _integer(control['round'])
 if control['turn_player'] not in ('A','B') or not isinstance(control['phase'],str) or not isinstance(control['return_target'],str):raise ValueError('invalid continuation control')
 for k in ('origin_event_seq','consecutive_passes','response_opportunity_index'):
  if control['response_context'][k] is not None:_integer(control['response_context'][k])
 if set(v['rights'])!={'A','B'} or set(v['egg_state'])!={'A','B'} or set(v['runtime'])!=RUNTIME:raise ValueError('owner/runtime coverage differs')
 if v['coverage'].keys()!={'public_projection','unknowns','opaque_regions'} or v['coverage']['public_projection']!='existing_114_119_continuation_v2' or v['coverage']['opaque_regions']!=['opponent_hand','decks','opponent_concealed_prepared']:raise ValueError('projection coverage differs')
 if not isinstance(v['coverage']['unknowns'],list) or not all(isinstance(s,str) for s in v['coverage']['unknowns']):raise ValueError('invalid coverage unknowns')
 cards={};locations={}
 def card(c,zone):
  if 'face_down' in c:
   if set(c) not in ({'slot','face_down'},{'slot','face_down','paid_time'}) or c['face_down'] is not True:raise ValueError('unknown concealed schema')
   _integer(c['slot'])
   if 'paid_time' in c:_integer(c['paid_time'])
   return
  if set(c)!={'instance_id','card_id','card_copy_id','initial_instance_id'} or any(not isinstance(s,str) or not s for s in c.values()):raise ValueError('public card identity schema differs')
  sid=c['instance_id']
  if sid in cards:raise ValueError('duplicate public card location')
  cards[sid]=c;locations[sid]=zone
 if not isinstance(p['own_hand'],list):raise ValueError('hand must be a list')
 for c in p['own_hand']:card(c,'hand')
 for name in ('own_board','opponent_board'):
  b=p[name]
  if set(b)!={'main','companions','partner','partner_stage','world','prepared'}:raise ValueError('board keys differ')
  stage=b['partner_stage']
  if stage is not None and stage!='married' and (type(stage) is not int or stage not in range(4)):raise ValueError('partner stage differs')
  for k in ('main','partner','world'):
   if b[k] is not None:card(b[k],name+'.'+k)
  for k in ('companions','prepared'):
   if not isinstance(b[k],list):raise ValueError('board collection differs')
   for c in b[k]:card(c,name+'.'+k)
 for owner in ('A','B'):
  if set(v['rights'][owner])!={'challenge_used','person_placed','relationship_progressed'} or any(type(z) is not bool for z in v['rights'][owner].values()):raise ValueError('invalid public rights')
  for key in ('time','growth'):
   if set(p[key])!={'A','B'}:raise ValueError('resource owners differ')
   _integer(p[key][owner])
  for c in p['discard'][owner]:card(c,'discard')
  b=p['own_board' if owner==v['actor'] else 'opponent_board']
  if v['egg_state'][owner]!=('egg' if b['main'] is None else 'external_egg'):raise ValueError('egg location differs')
 for row in v['history']:
  if event_projection(row,v['actor'])!=row:raise ValueError('history contains nonpublic fields')
 for key in EFFECTS:
  seen=set()
  for r in v['runtime'][key]:
   base={'effect_id','controller','source_instance_id','created_event_seq','turn_player','round'}
   required=base|({'payment_kind','amount'} if key=='payment_effects' else {'target_instance_id','power','wisdom'} if key=='stat_effects' else {'target_instance_id','amount','difference'})
   optional={'challenge_id','parameter'} if key=='stat_effects' else set()
   if not required<=set(r) or not set(r)<=required|optional or r['effect_id'] in seen:raise ValueError('effect schema or identity differs')
   seen.add(r['effect_id'])
   if r['controller'] not in ('A','B') or r['turn_player'] not in ('A','B'):raise ValueError('effect controller differs')
   for k in ('created_event_seq','round','amount','difference','power','wisdom'):
    if k in r and type(r[k]) is not int:raise ValueError('effect numeric differs')
 return cards,locations


def _validate_actions(actions,v,baseline):
 cards,locations=_validate_view(v)
 table=json.loads((ROOT/'data/proxy-normal-decision-candidate-table-114-20260918.json').read_text())
 by_card={r['card_id']:r for r in table['cards']};scores={s['candidate_id']:s for s in baseline['candidates']}
 keys={'candidate_id','source_family','source_id','source_zone','source_instance_id','card_id','action_type','candidate_variant','target_instance_ids','enumeration_unit_id','disposition','reason_codes','evidence','source_references'}
 for a in actions:
  if set(a)!=keys or a['disposition']!='admitted' or a['reason_codes']!=[]:raise ValueError('action schema differs')
  kind=a['action_type'];sid=a['source_instance_id'];variant=a['candidate_variant'];targets=a['target_instance_ids'];cid=a['candidate_id']
  if not isinstance(targets,list) or len(targets)!=len(set(targets)) or any(t not in cards for t in targets):raise ValueError('targets not bound to public instances')
  unit,offset=json.JSONDecoder().raw_decode(a['enumeration_unit_id'])
  if unit!=[a[k] for k in ('source_family','source_zone','source_id','action_type','candidate_variant','target_instance_ids')]:raise ValueError('enumeration descriptor differs')
  suffix=a['enumeration_unit_id'][offset:]
  if suffix and (kind not in ('set_item','attach_item') or not suffix.startswith(':')):raise ValueError('unexpected enumeration suffix')
  if kind=='pass':
   if cid!='pass' or sid is not None or a['card_id'] is not None or variant!='pass' or targets or a['source_id']!='pass' or a['source_family']!='standing_pass' or a['source_zone']!='synthetic':raise ValueError('pass identity differs')
   continue
  if kind in ('challenge','relationship'):
   if sid is not None or a['card_id'] is not None or targets or a['source_zone']!='synthetic' or a['source_id']!=kind+':'+v['actor'] or cid!='candidate-'+kind+'-'+v['actor']+'-'+variant:raise ValueError('standing action identity differs')
   continue
  if sid not in cards or cards[sid]['card_id']!=a['card_id'] or cards[sid]['card_copy_id']!=scores[cid]['card_copy_id'] or a['source_id']!=sid:raise ValueError('action physical source differs')
  if (a['source_zone']=='hand' and locations[sid]!='hand') or (a['source_zone']=='board' and not locations[sid].startswith('own_board.')):raise ValueError('action source zone differs')
  templates=[t for t in by_card.get(a['card_id'],{}).get('actions',[]) if t['action_type']==kind and variant in t['candidate_variants']]
  if len(templates)!=1 or templates[0]['source_text_reference'] not in a['source_references']:raise ValueError('canonical action template differs')
  if kind=='play_main':expected='candidate-play-main-'+sid+'-'+variant
  elif kind in ('place_companion','place_partner'):expected='candidate-'+kind.replace('_','-')+'-'+sid+(''.join('-replace-'+t for t in targets))
  else:
   expected='candidate-'+kind+'-'+sid+''.join('-target-'+t for t in targets)
   if templates[0]['target_rule']=='declare one of seven card types; no card target':expected+='-declare-'+variant
   elif variant in ('seven_or_eight_cards','nine_or_more_cards'):expected+='-'+variant
  modifiers=a['evidence'].get('cost_modifiers',[])
  if modifiers:expected+='-discount-'+modifiers[0]['source_instance_id']
  if cid!=expected:raise ValueError('canonical action ID differs')
  if 'payment_time' in a['evidence'] and a['evidence']['payment_time']!=scores[cid]['payment_time']:raise ValueError('payment evidence differs')

def build_input(view: dict, inventory: dict, baseline_problem: dict, source_manifest: dict) -> dict:
 if inventory.get('candidate_set_complete') is not True or inventory.get('legal_candidate_ids')!=baseline_problem.get('legal_candidate_ids'):raise ValueError('incomplete inventory')
 x=dict(schema=SCHEMA,view=copy.deepcopy(view),actions=copy.deepcopy(inventory['legal_candidate_details']),baseline_problem=copy.deepcopy(baseline_problem),source_manifest=copy.deepcopy(source_manifest))
 errors=validate_input(x)
 if errors:raise ValueError('; '.join(errors))
 return x

def validate_input(value: dict) -> list[str]:
 try:
  if set(value)!=INPUT_KEYS or value['schema']!=SCHEMA:return ['input schema differs']
  v=value['view'];p=value['baseline_problem']
  if set(v)!=VIEW_KEYS or v['schema']!=VIEW_SCHEMA:return ['view schema differs']
  errors=validate_problem(p)
  if errors:return errors
  _validate_actions(value['actions'],v,p)
  actions=value['actions'];ids=[a['candidate_id'] for a in actions]
  if len(ids)!=len(set(ids)) or sorted(ids)!=p['legal_candidate_ids']:return ['action coverage differs']
  # Compare the pre-existing v2 public view, not a full-state digest.
  prior=dict(schema='naotocchi.card_game.continuation_view.v2',legacy_view=v['public'],runtime=v['runtime'])
  if sha(prior)!=p['view_sha256']:return ['baseline public view differs']
  if p['seed_context']['actor']!=v['actor'] or p['seed_context']['round']!=v['control']['round']:return ['context differs']
  if value['source_manifest']!=source_manifest():return ['canonical source manifest differs']
  errors=validate_sources(value['source_manifest'],ROOT)
  for a in actions:
   if not {'candidate_id','action_type','candidate_variant','source_instance_id','target_instance_ids','source_references','source_zone','card_id'}<=set(a):return ['action detail incomplete']
   if any(r.split('#')[0] not in value['source_manifest'] for r in a['source_references']):return ['action source not bound']
  return errors
 except (KeyError,TypeError,ValueError):return ['malformed equivalence input']
