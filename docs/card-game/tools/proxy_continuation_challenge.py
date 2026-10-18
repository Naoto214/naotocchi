"""Source-bound challenge declaration, public arithmetic and result boundaries."""
import copy,hashlib,re
from contextlib import contextmanager
import proxy_continuation_batch as batch
import proxy_continuation_candidates as candidates
import proxy_continuation_state as state
import proxy_continuation_actions as actions
import proxy_continuation_payments as effects
import proxy_continuation_end as end
import proxy_resource_value_trajectory as old

M1_SHA='cb8e0aa264f85b06c4e156b3501d6ce6b019cf307000add4f1cb26b263870673'
PUBLIC_HISTORY_KEYS=('seq','action_type','actor','result','participants','parameter','declaring_actor')


def stats(envelope,actor):
 g=envelope['legacy_continuation']['game_state'];p=g['players'][actor];source=p['board']['main']
 if source is None:raise ValueError('challenge main absent')
 card=g['cards'][source]['card_id'];cap=batch.classification(card) if card in batch.CAPABILITIES else batch.rules.classification(card);body,_=batch.rules.source_section(cap['reference'])
 if card=='M-antlion-01' and hashlib.sha256(body.encode()).hexdigest()!=M1_SHA:raise ValueError('main numeric source changed')
 matches=re.findall(r'(?:[①②③④⑤⑥⑦⑧]\s+|ちから／ちえ：)(\d+)/(\d+)',body)
 if len(matches)!=1:raise ValueError('canonical main numeric pair not unique')
 values=dict(zip(('power','wisdom'),map(int,matches[0])))
 for key,delta in effects.stat_delta(envelope,source).items():values[key]+=delta
 world=p['board']['world']
 if world:
  worldcard=g['cards'][world]['card_id'];batch.classification(worldcard)
  if worldcard=='W-deepsea' and len(p['hand'])<=2:
   values={k:v+1 for k,v in values.items()}
 opponent='B' if actor=='A' else 'A';otherworld=g['players'][opponent]['board']['world']
 for companion in p['board']['companions']:
  card=g['cards'][companion]['card_id'];batch.classification(card)
  if card=='C-chameleon' and world and otherworld:
   batch.classification(g['cards'][otherworld]['card_id']);key='wisdom' if g['cards'][world]['card_id']==g['cards'][otherworld]['card_id'] else 'power';values[key]+=1
 return values


def quick_effect_applied(game,events,actor,since):
 for event in events:
  if event['seq']<=since or event['actor']!=actor or not event['action_type'].startswith('resolve'):continue
  source=event.get('source_instance_id');card=game['cards'].get(source,{}).get('card_id')
  if card not in effects.QUICK_CARDS and card not in ('I-c_coin2','G-hit-blow','E-final-time','E-first-date'):continue
  result=event.get('created_effect',event.get('result',{}))
  if result and (result.get('effect_applied') is True or result.get('effect_id') or result.get('growth_added',0)>0 or result.get('drawn_instance_ids') or result.get('revealed_card_type') or result.get('revealed_card_id')):return True
 return False


def board_candidates(current,events,source):
 game=(batch.RESPONSE_FULL_CURRENT or current)['game_state'];card=game['cards'][source]['card_id'];cap=batch.classification(card);actor=current['response_context']['priority_actor'];player=game['players'][actor];battle=game.get('challenge');origin=next((e for e in events if e['seq']==current['response_context']['origin_event_seq']),None)
 met=bool(origin and origin['action_type']=='challenge_declared' and origin['actor']==actor and battle and battle['status']=='comparing' and battle['declaring_actor']==actor and player['board']['main']==battle['participants'][actor])
 since=max((e['seq'] for e in events if e['actor']==actor and e['action_type'] in ('turn_start_and_egg_draw','turn_start_and_normal_draw')),default=0)
 used=any(e['seq']>since and e.get('source_zone')=='board' and e.get('source_instance_id')==source and e['action_type']=='activate_response' for e in events)
 if card=='P-anglerfish':met=met and player['board']['main'] is not None and player['board']['world'] is not None and game['cards'][player['board']['world']]['card_id']=='W-deepsea'
 elif card=='M-antlion-07':
  changed=any(e['seq']>since and e['actor']==actor and e['action_type']=='place_world' and e.get('previous_world_instance_id') is not None and game['cards'][e['previous_world_instance_id']]['card_id']!=game['cards'][e['source_instance_id']]['card_id'] for e in events)
  met=met and player['board']['main']==source and changed and quick_effect_applied(game,events,actor,since)
 else:raise ValueError('unregistered board challenge effect')
 details=[]
 if met and not used:
  target=battle['participants'][actor];details=[dict(candidate_id='response-activate-ability-'+source,candidate_family='triggered_ability',action_type='activate_board_ability',source_instance_id=source,card_id=card,card_copy_id=game['cards'][source]['card_copy_id'],target_instance_ids=[target],candidate_variant=battle['parameter'] if card=='M-antlion-07' else None,base_time_cost=0,source_references=[cap['reference']])]
 return details,dict(source_instance_id=source,card_id=card,reason_code='enumerated_challenge_ability' if details else 'trigger_condition_not_met',source_reference=cap['reference'],source_raw_sha256=cap['source_raw_sha256'])


def declaration_proof(envelope,action,history=None):
 g,p=batch.ready(envelope,action,history);actor=g['turn_player'];other='B' if actor=='A' else 'A'
 if action['action_type']!='challenge' or action['candidate_variant'] not in ('power','wisdom') or p['challenge_used'] or not all(g['players'][o]['board']['main'] for o in ('A','B')) or g.get('challenge') is not None:raise ValueError('challenge declaration preconditions differ')
 # 414 forbids a future reward or an assumed unopposed comparison in this
 # immediate score. The declaration itself changes neither growth nor time.
 plan=(batch.rules.ROOT/'plans/2026-10-01-normal-decision-resource-pilot-design.md').read_text()
 if '相手が反応しない仮定' not in plan or '未来のちょうせん報酬' not in plan:raise ValueError('challenge immediate scoring source differs')
 source=p['board']['main'];ref='02-main-system.md'
 return dict(contract_id='challenge_declaration_v1',actor=actor,candidate_id=action['candidate_id'],source_instance_id=source,payment_time=0,certain_growth_difference=0,source_reference=ref,source_raw_sha256=hashlib.sha256((batch.rules.ROOT/ref).read_bytes()).hexdigest(),capability=dict(kind='challenge_declaration',future_reward_not_scored=True),view_sha256=state.canonical_sha256(state.visible(envelope,actor)),arrival_execution_certified=False)


def declare(envelope,action,history=None):
 proof=declaration_proof(envelope,action,history);before=state.current(envelope);g=before['game_state'];actor=g['turn_player'];after=copy.deepcopy(envelope);after['event_seq']+=1;c=after['legacy_continuation'];seq=after['event_seq']
 c['game_state']['players'][actor]['challenge_used']=True;c['game_state']['challenge']=dict(challenge_id=f'challenge-{seq}',declaring_actor=actor,participants={o:g['players'][o]['board']['main'] for o in ('A','B')},parameter=action['candidate_variant'],status='comparing',started_event_seq=seq,result=None)
 actions._placement_window(after,actor);c['game_state']['phase']='response_window';c['response_context']['source_phase']='challenge_declaration';c['return_target']='challenge_comparison'
 event=effects.transition_event(envelope,after,'challenge_declared',actor,source_instance_id=proof['source_instance_id'],selected_candidate=action['candidate_id'],declaring_actor=actor,participants=copy.deepcopy(c['game_state']['challenge']['participants']),parameter=action['candidate_variant'],source_reference=proof['source_reference'])
 return after,[event]


def compare(envelope):
 c=state.current(envelope);g=c['game_state'];battle=g.get('challenge');ctx=c['response_context']
 if g['phase']!='challenge_comparison' or not battle or battle['status']!='comparing' or c['activation_zone'] or c['pending_triggers'] or ctx['consecutive_passes']!=2:raise ValueError('challenge comparison boundary not closed')
 after=copy.deepcopy(envelope);after['event_seq']+=1;p=after['legacy_continuation'];current=battle['participants']=={o:g['players'][o]['board']['main'] for o in ('A','B')}
 values={o:stats(envelope,o)[battle['parameter']] for o in ('A','B')} if current else None
 winner=None if not current or values['A']==values['B'] else max(values,key=values.get);loser=('B' if winner=='A' else 'A') if winner else None
 reward=5+effects.consume_win_rewards(after,battle,winner,values) if winner else 0
 if winner:p['game_state']['players'][winner]['growth']+=reward
 result=dict(challenge_id=battle['challenge_id'],declaring_actor=battle['declaring_actor'],participants=copy.deepcopy(battle['participants']),parameter=battle['parameter'],outcome='aborted' if not current else 'draw' if winner is None else 'win_loss',values=values,winner=winner,loser=loser,growth_added=reward)
 p['game_state']['challenge'].update(status='resolved',result=result);actions._placement_window(after,g['turn_player']);p['game_state']['phase']='response_window';p['response_context']['source_phase']='challenge_result';p['return_target']='challenge_end'
 event=effects.transition_event(envelope,after,'challenge_compared',winner or g['turn_player'],result=result,source_reference='65-challenge-participants-and-resolution.md')
 return effects.forced_result(envelope,after,event)


def finish(envelope):
 c=state.current(envelope);g=c['game_state'];battle=g.get('challenge')
 if g['phase']!='challenge_end' or not battle or battle['status']!='resolved' or c['activation_zone'] or c['pending_triggers'] or c['response_context']['consecutive_passes']!=2:raise ValueError('challenge end boundary not closed')
 after=copy.deepcopy(envelope);after['event_seq']+=1;effects.clear_challenge(after,battle['challenge_id']);p=after['legacy_continuation'];p['game_state'].pop('challenge',None);p['game_state']['phase']='normal_action';p['return_target']='normal_action_opportunity'
 event=effects.transition_event(envelope,after,'challenge_finished',g['turn_player'],result=copy.deepcopy(battle['result']),source_reference='65-challenge-participants-and-resolution.md')
 return effects.forced_result(envelope,after,event)


def normalize_result(envelope,result):
 battle=envelope['legacy_continuation']['game_state'].get('challenge')
 if battle is None:return result
 result=copy.deepcopy(result)
 for index,(event,shot) in enumerate(zip(result['new_events'],result['new_snapshots'])):
  if not event['action_type'].startswith('resolve') or shot['continuation_state']['activation_zone'] or shot['continuation_state']['game_state']['phase']!='normal_action':continue
  c=shot['continuation_state'];actor=c['game_state']['turn_player'];seq=event['seq'];c['game_state']['phase']='response_window';c['return_target']='challenge_comparison' if battle['status']=='comparing' else 'challenge_end'
  c['response_context']=dict(source_phase='challenge_declaration' if battle['status']=='comparing' else 'challenge_result',phase='response_window',window_kind='after_normal_action',origin_event_seq=seq,turn_player=actor,priority_actor=actor,chain_status='empty',chain_links=[],consecutive_passes=0,response_opportunity_index=1,decision_kind='response_action',choice_kind='reaction_or_pass')
  updated=dict(c,last_event_seq=seq);result['new_snapshots'][index]=old._snapshot(updated);event['game_state_after_sha256']=old.start.opening._stop_state_sha256(c['game_state']);event['continuation_state_after_sha256']=old.start._hash(c)
  if isinstance(event.get('result'),dict) and 'return_target' in event['result']:event['result']['return_target']=c['return_target']
  if 'new_envelopes' in result:result['new_envelopes'][index]['legacy_continuation']=copy.deepcopy(c)
  if index==len(result['new_events'])-1:result['final_continuation_state']=copy.deepcopy(c)
 return result


def public_history(game,history):
 known={'challenge_declared','challenge_compared','challenge_finished'}
 if any('challenge' in e['action_type'] and e['action_type'] not in known for e in history):raise ValueError('unclassified challenge history')
 since=max((e['seq'] for e in history if e['action_type'] in ('turn_start_and_egg_draw','turn_start_and_normal_draw')),default=0)
 return sorted({e['result']['loser'] for e in history if e['seq']>since and e['action_type']=='challenge_compared' and e.get('result',{}).get('outcome')=='win_loss'})


@contextmanager
def scope(initial):
 original_apply=actions.apply;original_response=actions.response_inventory;original_verify=end.verify_new_events;original_history=candidates.HISTORY_ADAPTER;original_result=actions.RESOLUTION_RESULT_ADAPTER;original_projection=candidates.PUBLIC_HISTORY_PROJECTION;original_runtime=end.RUNTIME_TRANSITION_VERIFIER
 try:
  candidates.HISTORY_ADAPTER=public_history;candidates.PUBLIC_HISTORY_PROJECTION=__import__('proxy_continuation_public_history').event_projection;actions.RESOLUTION_RESULT_ADAPTER=normalize_result
  def apply(e,r,i):
   if r.get('selected_action',{}).get('action_type')=='challenge':
    rebuilt=candidates.select(e,r['inventory'],r['context'],r['policy_id'],i)
    if rebuilt!=r:raise ValueError('challenge normal decision reconstruction differs')
    return declare(e,r['selected_action'],i.get('public_events'))
   after,events=original_apply(e,r,i);battle=e['legacy_continuation']['game_state'].get('challenge')
   if battle and r.get('selected_action',{}).get('action_type')=='response_pass' and after['legacy_continuation']['response_context']['consecutive_passes']==2 and not after['legacy_continuation']['activation_zone']:
    target='challenge_comparison' if battle['status']=='comparing' else 'challenge_end';after['legacy_continuation']['game_state']['phase']=target;after['legacy_continuation']['return_target']=target;raw=events[0];current=state.current(after);raw['game_state_after_sha256']=old.start.opening._stop_state_sha256(current['game_state']);raw['continuation_state_after_sha256']=old.start._hash(current)
    if 'result' in raw:raw['result']['return_target']=target
    events=[actions.bind_event(e,after,raw)]
   return after,events
  actions.apply=apply
  def response(e,i,h):
   if e['legacy_continuation']['game_state'].get('challenge') is None:return original_response(e,i,h)
   projected=copy.deepcopy(e);projected['legacy_continuation']['game_state'].pop('challenge',None);projected['runtime']['stat_effects']=[row for row in projected['runtime']['stat_effects'] if 'challenge_id' not in row];projected_events=copy.deepcopy(h);current=state.current(projected);projected_events[-1]['game_state_after_sha256']=old.start.opening._stop_state_sha256(current['game_state']);projected_events[-1]['continuation_state_after_sha256']=old.start._hash(current)
   previous=batch.RESPONSE_FULL_CURRENT;previous_runtime=batch.RESPONSE_FULL_RUNTIME;batch.RESPONSE_FULL_CURRENT=state.current(e);batch.RESPONSE_FULL_RUNTIME=e['runtime']
   try:result=original_response(projected,i,projected_events)
   finally:batch.RESPONSE_FULL_CURRENT=previous;batch.RESPONSE_FULL_RUNTIME=previous_runtime
   return dict(result,challenge_boundary=copy.deepcopy(e['legacy_continuation']['game_state']['challenge']),envelope_sha256=state.state_hash(e))
  actions.response_inventory=response
  def verify(events,shots,runtime):
   proofs=original_verify(events,shots,runtime);byseq={e['event_seq']:e for e in runtime}
   for event in events:
    kind=event['action_type']
    if kind not in ('challenge_declared','challenge_compared','challenge_finished'):continue
    prior=byseq[event['seq']-1];actual=byseq[event['seq']]
    if kind=='challenge_declared':
     inv=candidates.audit(prior,[e for e in events if e['seq']<event['seq']]);a=next((a for a in inv['legal_candidate_details'] if a['candidate_id']==event['selected_candidate']),None)
     if a is None:raise ValueError('historical challenge declaration absent')
     expected,generated=declare(prior,a,[e for e in events if e['seq']<event['seq']]);raw={k:v for k,v in generated[0].items() if k not in end.BIND_KEYS}
    else:
     result=compare(prior) if kind=='challenge_compared' else finish(prior);expected=result['new_envelopes'][0];raw=result['new_events'][0]
    if expected!=actual or raw!=event:raise ValueError('challenge independent provenance replay differs')
    # A comparison's reward actor can differ from its declaring actor. Store
    # rewards in separate source-bound result events rather than mislabel them.
    growth=event.get('result',{}).get('growth_added',0) if kind=='challenge_compared' else 0
    if growth and event['result']['winner']!=event['actor']:raise ValueError('challenge reward provenance actor differs')
    source=event.get('source_instance_id');card=prior['legacy_continuation']['game_state']['cards'][source]['card_id'] if source else None;ref=event['source_reference'];digest=hashlib.sha256((batch.rules.ROOT/ref).read_bytes()).hexdigest()
    proofs.append(dict(event_seq=event['seq'],kind=kind,card_id=card,source_reference=ref,source_raw_sha256=digest,certain_growth_difference=growth,duration='none'))
   return proofs
  def runtime_verify(before,after,event,history=None):
   if event['action_type'] in ('challenge_finished','challenge_compared'):
    result=finish(before) if event['action_type']=='challenge_finished' else compare(before);return result['new_envelopes'][0]==after and result['new_events'][0]==event
   return original_runtime(before,after,event,history) if original_runtime else False
  end.RUNTIME_TRANSITION_VERIFIER=runtime_verify
  end.verify_new_events=verify
  yield
 finally:actions.apply=original_apply;actions.response_inventory=original_response;end.verify_new_events=original_verify;candidates.HISTORY_ADAPTER=original_history;actions.RESOLUTION_RESULT_ADAPTER=original_result;candidates.PUBLIC_HISTORY_PROJECTION=original_projection;end.RUNTIME_TRANSITION_VERIFIER=original_runtime
