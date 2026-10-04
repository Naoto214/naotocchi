"""Public-only deterministic prefixes; unresolved tails remain first-class atoms."""
import copy
from proxy_equivalence_inputs import validate_input, EFFECTS
from proxy_resource_value_selection import canonical_sha256 as sha

COVERAGE=('hand','board','discard','egg_state','reservations','runtime','rights','history','control','opaque')
ATOM_KEYS={'atom_id','kind','identity','owner','controller','zone','source','targets','text_revision','value','lifetime','order','uses','dependency_refs'}
OUTCOME_KEYS={'candidate_id','source_view_sha256','boundary','atoms','dependencies','unknowns','coverage','certain_prefix_proofs','opaque_unchanged'}


def _atom(zone,identity,value,owner=None,order=None,kind='residual'):
 return dict(atom_id=zone+':'+str(identity),kind=kind,identity=identity,owner=owner,controller=owner,zone=zone,
  source=value.get('source_instance_id') if isinstance(value,dict) else None,
  targets=value.get('target_instance_ids',[value['target_instance_id']] if 'target_instance_id' in value else []) if isinstance(value,dict) else [],
  text_revision=None,value=copy.deepcopy(value),lifetime={k:copy.deepcopy(value[k]) for k in ('deadline','round','turn_player','created_event_seq','challenge_id') if k in value} if isinstance(value,dict) else {},
  order=order,uses=value.get('uses_remaining',value.get('count')) if isinstance(value,dict) else None,dependency_refs=['context'])


def _ledger(view,manifest):
 atoms=[];p=view['public'];actor=view['actor'];other='B' if actor=='A' else 'A'
 def card(zone,c,owner,index):
  identity=c.get('instance_id',owner+':concealed-slot:'+str(c['slot']) if 'slot' in c else None)
  if identity is None:raise ValueError('missing public identity')
  a=_atom(zone,identity,c,owner,index,'card')
  # All canonical text revisions stay bound. No name-only identity or hash-only equality.
  a['text_revision']=sha(manifest);atoms.append(a)
 for index,c in enumerate(p['own_hand']):card('own_hand',c,actor,index)
 for name,owner in (('own_board',actor),('opponent_board',other)):
  for zone,cards in p[name].items():
   if zone=='partner_stage':atoms.append(_atom(name+'.partner_stage',owner,cards,owner));continue
   for i,c in enumerate(cards if isinstance(cards,list) else [cards] if cards else []):card(name+'.'+zone,c,owner,i)
 for owner in ('A','B'):
  for i,c in enumerate(p['discard'][owner]):card('discard',c,owner,i)
  for i,r in enumerate(p['reservations'][owner]):atoms.append(_atom('reservations',owner+':'+str(i),r,owner,i))
  atoms.append(_atom('egg_state',owner,view['egg_state'][owner],owner))
  atoms.append(_atom('rights',owner,view['rights'][owner],owner))
  atoms.append(_atom('growth',owner,p['growth'][owner],owner))
  atoms.append(_atom('time',owner,p['time'][owner],owner))
 for zone,values in view['runtime'].items():
  if zone=='public_prepared':
   for owner,rows in values.items():
    for i,row in enumerate(rows):atoms.append(_atom(zone,owner+':'+str(i),row,owner,i))
  else:
   for i,(identity,row) in enumerate(values.items() if isinstance(values,dict) else [(r.get('effect_id',str(j)),r) for j,r in enumerate(values)]):atoms.append(_atom(zone,identity,row,row.get('controller'),i))
 atoms.append(_atom('history','public_prefix',view['history']))
 atoms.append(_atom('control','continuation',view['control']))
 for zone in view['coverage']['opaque_regions']:atoms.append(_atom('opaque',zone,{'same_input_region':zone,'contents':'unobserved'}))
 return atoms


def derive_outcomes(equivalence_input: dict) -> list[dict]:
 errors=validate_input(equivalence_input)
 if errors:raise ValueError('; '.join(errors))
 x=equivalence_input;result=[];original=x['view'];actor=original['actor'];other='B' if actor=='A' else 'A'
 certs={p['safe_placement']['candidate_id'] for p in x['baseline_problem']['pairs'] if p['kind']=='certified_safe_free_development'}
 for action in sorted(x['actions'],key=lambda a:a['candidate_id']):
  v=copy.deepcopy(original);boundary=v['control'];kind=action['action_type'];cid=action['candidate_id'];proof=[];unknown=list(v['coverage']['unknowns']);extras=[];opaque_unchanged=True
  if kind=='pass':
   boundary['phase']='turn_end_response';boundary['return_target']='turn_end'
   boundary['response_context']=dict(source_phase='normal_action',phase='response_window',window_kind='after_normal_action',origin_event_seq=v['event_seq']+1,turn_player=actor,priority_actor=other,chain_status='empty',chain_links=[],consecutive_passes=1,response_opportunity_index=2,decision_kind='response_action',choice_kind='reaction_or_pass')
   extras.append(_atom('end_obligation','turn_end',{'actor':actor,'round':boundary['round'],'response_before_end':True,'ordered_contract':'64-turn-boundaries-and-victory-timing.md','revalidate_at_resolution':True}))
   proof=['06-action-chain-checkpoint.md','119-response-window-contract.md'];unknown.append('unresolved_response')
  elif kind in ('place_companion','place_partner') and cid in certs:
   hand=v['public']['own_hand'];source=next((c for c in hand if c['instance_id']==action['source_instance_id']),None)
   if source is None or source['card_id']!=action['card_id']:raise ValueError('placement public source differs')
   hand.remove(source);b=v['public']['own_board']
   if kind=='place_companion':b['companions'].append(source)
   else:b['partner']=source;b['partner_stage']=0
   v['rights'][actor]['person_placed']=True;boundary['phase']='post_placement_response';boundary['return_target']='normal_action_opportunity'
   boundary['response_context']=dict(source_phase='post_placement_response',phase='response_window',window_kind='after_normal_action',origin_event_seq=v['event_seq']+1,turn_player=actor,priority_actor=actor,chain_status='empty',chain_links=[],consecutive_passes=0,response_opportunity_index=1,decision_kind='response_action',choice_kind='reaction_or_pass')
   proof=['01-core-rules.md','116-normal-decision-fallback-contract.md','119-response-window-contract.md'];unknown.append('unresolved_response')
  elif kind in ('play_main','place_world','set_item','attach_item','use_item','use_play','use_event') and action['source_zone']=='hand':
   source=next((c for c in v['public']['own_hand'] if c['instance_id']==action['source_instance_id']),None)
   if source is None or source['card_id']!=action['card_id']:raise ValueError('declaration public source differs')
   cost=next(c['payment_time'] for c in x['baseline_problem']['candidates'] if c['candidate_id']==cid)
   if cost>v['public']['time'][actor]:raise ValueError('declaration cost exceeds public time')
   # Zone movement/payment is an atomic-prefix description, NOT a playable
   # snapshot. Source-bound arrival/departure/response tails remain obligations.
   b=v['public']['own_board'];can_move=kind!='play_main' or b['main'] is None
   if can_move:
    v['public']['own_hand'].remove(source);v['public']['time'][actor]-=cost
    if kind=='play_main':b['main']=source;v['egg_state'][actor]='external_egg'
    elif kind=='place_world':
     if b['world']:v['public']['discard'][actor].append(b['world'])
     b['world']=source
    elif kind in ('set_item','attach_item'):b['prepared'].append(source)
    else:extras.append(_atom('activation_source',source['instance_id'],source,actor))
    boundary['prefix_stage']='atomic_public_declaration_before_tail'
    unknown.append('unresolved_effect' if kind in ('use_item','use_play','use_event') else 'unresolved_arrival_or_departure')
    proof=['01-core-rules.md','02-main-system.md','06-action-chain-checkpoint.md','119-response-window-contract.md']
   else:unknown.append('generator_unsupported');opaque_unchanged=False
   # Includes target, variant and source refs; effect IDs/usage/attachments
   # cannot disappear merely because this prefix has not resolved them.
   extras.append(_atom('pending_action','unresolved',{k:action[k] for k in ('action_type','candidate_variant','card_id','source_instance_id','target_instance_ids','source_zone','source_references')}))
  else:
   # A comparison generator's limit is not a gameplay stop. Preserve pre-state
   # and the whole action as an unresolved operator; never assert a final board.
   unknown.append('generator_unsupported');opaque_unchanged=False
   extras.append(_atom('pending_action','unresolved', {k:action[k] for k in ('action_type','candidate_variant','card_id','source_instance_id','target_instance_ids','source_zone','source_references')}))
  # History is relevant to future conditions: retain the public declaration,
  # not the arbitrary candidate ID used to label a proof.
  if proof:
   v['history'].append(dict(seq=v['event_seq']+1,actor=actor,action_type=kind,source_instance_id=action['source_instance_id'],target_instance_ids=action['target_instance_ids']))
  atoms=_ledger(v,x['source_manifest'])+extras
  ids=[a['atom_id'] for a in atoms]
  if len(ids)!=len(set(ids)):raise ValueError('duplicate residual atom')
  result.append(dict(candidate_id=cid,source_view_sha256=sha(original),boundary=copy.deepcopy(boundary),atoms=atoms,
   dependencies=[dict(dependency_id='context',members=sorted(ids),complete=bool(proof),rule='same_physical_public_context_and_unchanged_opaque_regions')],
   unknowns=sorted(set(unknown)),coverage={k:'complete' for k in COVERAGE},certain_prefix_proofs=proof,opaque_unchanged=opaque_unchanged))
 return result


def validate_outcome(outcome: dict, equivalence_input: dict) -> list[str]:
 try:
  if set(outcome)!=OUTCOME_KEYS or set(outcome['coverage'])!=set(COVERAGE):return ['outcome structure differs']
  expected=next(r for r in derive_outcomes(equivalence_input) if r['candidate_id']==outcome['candidate_id'])
  return [] if outcome==expected else ['outcome differs from public prefix recomputation']
 except (KeyError,ValueError,TypeError,StopIteration):return ['invalid outcome input']
