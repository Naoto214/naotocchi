"""Owner-known hand optional timing, latched into the existing06 group.

Only the registered107 opponent-play-during-challenge mechanism is added.
Reuse native candidate/payment/stat handlers and116 group selection. No card
values,463 extension, hidden opponent choices, or full information-use proof.
"""
import copy,hashlib
from contextlib import contextmanager
from threading import Lock
import proxy_continuation_state as state
import proxy_continuation_payments as payments
import proxy_continuation_quick as quick
import proxy_continuation_batch as batch
import proxy_population_opportunity_ledger as ledger
from proxy_mandatory_policy_contract import ROOT,canonical

ORDER='06-action-chain-checkpoint.md'
ORDER_SHA='7ac6d6141095d1139b8a8e072bc1523d621b7f100a57e292c08bbc97a7618c67'
DESCRIPTORS={'G-air-hockey':dict(ability_key='opponent_quick_play_during_challenge',reference='83-play-batch-3-card-text-draft.md#G-air-hockey')}
_NATIVE=payments.challenge_hand_candidates
_LOCK=Lock()


def descriptor(card):
 if hashlib.sha256((ROOT/ORDER).read_bytes()).hexdigest()!=ORDER_SHA:raise ValueError('hand timing order source changed')
 d=DESCRIPTORS[card];cap=payments.capability(card)
 if cap['reference']!=d['reference'] or cap['timing']!='challenge_stat' or cap.get('choose_parameter') is not True:raise ValueError('registered hand timing source differs')
 return dict(d,source_raw_sha256=cap['source_raw_sha256'])


def capture(before,after,event):
 for card in DESCRIPTORS:descriptor(card)
 state.validate(before);state.validate(after);prior=state.current(before);current=state.current(after)
 if type(event['seq']) is not int or event['seq']!=after['event_seq'] or after['event_seq']!=before['event_seq']+1:raise ValueError('hand timing event sequence differs')
 for suffix,value in (('before',prior),('after',current)):
  if event['game_state_'+suffix+'_sha256']!=quick.old.start.opening._stop_state_sha256(value['game_state']) or event['continuation_state_'+suffix+'_sha256']!=quick.old.start._hash(value):raise ValueError('hand timing event hash differs')
 rows=[];g=prior['game_state'];actor=event['actor'];source=event.get('source_instance_id');card=g['cards'].get(source,{}).get('card_id')
 table=quick.old.start.load_candidate_rows();battle=g.get('challenge')
 played=event['action_type'] in ('use_play','activate_response') and event.get('source_zone') not in ('board','prepared') and card in table and table[card]['card_type']=='play'
 if played:
  links=[l for l in current['activation_zone'] if l['link_id']==event.get('chain_link_id')]
  if len(links)!=1 or any(links[0].get(k)!=v for k,v in dict(actor=actor,source_instance_id=source,card_id=card,action_type='use_play').items()) or links[0].get('source_zone') in ('board','prepared') or source not in g['players'][actor]['hand']:raise ValueError('hand timing actual quick activation differs')
  if prior['response_context']['chain_status']=='resolving':raise ValueError('quick activation interrupted resolution')
  if battle and battle['status']=='comparing' and all(g['players'][a]['board']['main']==battle['participants'][a] for a in 'AB'):
   owner='B' if actor=='A' else 'A'
   for own_source in g['players'][owner]['hand']:
    own_card=g['cards'][own_source]['card_id']
    if own_card not in DESCRIPTORS:continue
    cap=descriptor(own_card);row=dict(origin_event_seq=event['seq'],source_instance_id=own_source,actor=owner,category='optional',ability_key=cap['ability_key'],source_reference=cap['reference']);ledger.identity(row);rows.append(row)
 return dict(schema='owner_hand_optional_timing_capture.v1',scope=sorted(DESCRIPTORS),occurrences=rows,
  before_envelope_sha256=state.state_hash(before),after_envelope_sha256=state.state_hash(after),event_sha256=hashlib.sha256(canonical(event)).hexdigest(),
  source_information='each_source_owners_pre_event_hand_and_public_activation',origin_authenticated=False,opportunity_completeness_proven=False)


def current_actions(envelope,occurrence,history):
 ledger.identity(occurrence);state.validate(envelope);c=state.current(envelope);g=c['game_state'];actor=occurrence['actor'];source=occurrence['source_instance_id'];card=g['cards'][source]['card_id'];cap=descriptor(card)
 if occurrence['category']!='optional' or occurrence['ability_key']!=cap['ability_key'] or occurrence['source_reference']!=cap['reference']:raise ValueError('hand occurrence descriptor differs')
 origins=[e for e in history if e['seq']==occurrence['origin_event_seq']]
 if len(origins)!=1:raise ValueError('hand occurrence actual origin missing or ambiguous')
 origin=origins[0];other='B' if actor=='A' else 'A'
 if origin['actor']!=other or origin['action_type'] not in ('use_play','activate_response') or origin.get('source_zone') in ('board','prepared'):raise ValueError('hand occurrence origin differs')
 proof=dict(complete=True,source_reference=cap['reference'],source_raw_sha256=cap['source_raw_sha256'],origin_authenticated=False)
 if source not in g['players'][actor]['hand']:return [],dict(proof,reason='original_hand_source_departed')
 if not any(l['link_id']==origin.get('chain_link_id') and l['actor']==other and l['action_type']=='use_play' and l['source_instance_id']==origin.get('source_instance_id') for l in c['activation_zone']):return [],dict(proof,reason='origin_chain_already_closed')
 prior_current=batch.RESPONSE_FULL_CURRENT;prior_runtime=batch.RESPONSE_FULL_RUNTIME
 try:
  batch.RESPONSE_FULL_CURRENT=c;batch.RESPONSE_FULL_RUNTIME=envelope['runtime']
  rows,reason=_NATIVE(c,actor,source,quick.old.start.load_candidate_rows()[card],[origin],envelope['runtime'])
 finally:batch.RESPONSE_FULL_CURRENT=prior_current;batch.RESPONSE_FULL_RUNTIME=prior_runtime
 return rows,dict(proof,reason=reason['reason_code'])


def activate(envelope,action,occurrence,history,initial):
 rows,_=current_actions(envelope,occurrence,history)
 if canonical(action) not in [canonical(r) for r in rows]:raise ValueError('stale hand trigger choice')
 source=occurrence['source_instance_id'];actor=occurrence['actor'];origin=next(e for e in history if e['seq']==occurrence['origin_event_seq'])
 bridge=copy.deepcopy(envelope);bridge['legacy_continuation']['response_context'].update(priority_actor=actor,origin_event_seq=origin['seq'])
 prior=payments.challenge_hand_candidates
 def local(current,owner,s,entry,events,runtime):
  if s==source and owner==actor:return _NATIVE(current,owner,s,entry,[origin],runtime)
  return prior(current,owner,s,entry,events,runtime)
 try:
  payments.challenge_hand_candidates=local
  inventory=quick.actions.response_inventory(bridge,initial,history)
  after,generated=quick.activate(bridge,dict(selected_action=action,candidate_set_evidence=inventory),dict(public_events=history),initial)
 finally:payments.challenge_hand_candidates=prior
 if len(generated)!=1:raise ValueError('hand trigger activation is not atomic')
 event={k:v for k,v in generated[0].items() if k not in payments.end.BIND_KEYS}
 before=state.current(envelope);event.update(game_state_before_sha256=quick.old.start.opening._stop_state_sha256(before['game_state']),continuation_state_before_sha256=quick.old.start._hash(before),trigger_origin_event_seq=origin['seq'],source_zone='hand')
 quick.old._verify_generated(before,state.current(after),[event])
 return after,[quick.actions.bind_event(envelope,after,event)]


def verify_activation(before,after,event,occurrence,history,initial):
 """Conditional native re-execution; caller authenticates the captured origin."""
 try:
  action=next(a for a in current_actions(before,occurrence,history)[0] if a['candidate_id']==event['selected_candidate'])
  expected,generated=activate(before,action,occurrence,history,initial)
  raw=lambda e:{k:v for k,v in e.items() if k not in payments.end.BIND_KEYS}
  return canonical(expected)==canonical(after) and canonical(raw(generated[0]))==canonical(raw(event))
 except (ValueError,KeyError,TypeError,StopIteration,IndexError):return False


@contextmanager
def scope():
 if not _LOCK.acquire(blocking=False):raise ValueError('hand timing scope concurrency/reentry forbidden')
 prior=payments.challenge_hand_candidates
 def closed(current,actor,source,entry,events,runtime):
  card=current['game_state']['cards'][source]['card_id']
  if card not in DESCRIPTORS:return prior(current,actor,source,entry,events,runtime)
  cap=descriptor(card)
  return [],dict(card_id=card,reason_code='hand_optional_trigger_owned_by_sequential_ledger',source_reference=cap['reference'],source_raw_sha256=cap['source_raw_sha256'])
 try:payments.challenge_hand_candidates=closed;yield
 finally:payments.challenge_hand_candidates=prior;_LOCK.release()
