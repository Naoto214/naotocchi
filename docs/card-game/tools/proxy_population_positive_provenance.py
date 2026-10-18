"""Source-bound positive transitions to end-history evidence.

A replayed transition is necessary, not sufficient: supported source semantics,
actual growth and typed lifetime creation must agree. Unknowns fail closed.
"""
import copy
import proxy_continuation_state as state
import proxy_continuation_batch as batch
import proxy_continuation_end as end
import proxy_population_trigger_latching as latching

# Existing107 positive mechanisms, not a general assumption about all effects.
MECHANISMS={'C-bat':'zone_return','M-antlion-06':'zone_return',
            'M-antlion-03':'stat_this_turn','P-cliff_goat':'payment_this_turn'}
EFFECT_FIELDS=('payment_effects','stat_effects','conditional_effects')


def typed_effects(envelope):
 rows={}
 for field in EFFECT_FIELDS:
  for effect in envelope['runtime'][field]:
   key=effect['effect_id']
   if key in rows:raise ValueError('duplicate typed lifetime identity')
   rows[key]=dict(field=field,effect=copy.deepcopy(effect))
 return rows


def event_proof(before,after,event,verify,history):
 state.validate(before);state.validate(after)
 source=event.get('source_instance_id');game=before['legacy_continuation']['game_state']
 card=game['cards'].get(source,{}).get('card_id')
 if card not in MECHANISMS or card not in latching.CARDS:raise ValueError('positive source semantics unproved')
 kind=event['action_type']
 if kind not in ('activate_response','resolve_board_ability'):raise ValueError('positive event kind unproved')
 if after['event_seq']!=before['event_seq']+1 or event['seq']!=after['event_seq']:raise ValueError('positive event boundary differs')
 raw={k:v for k,v in event.items() if k not in end.BIND_KEYS}
 if verify(before,after,raw,history) is not True:raise ValueError('positive transition replay unproved')
 end.old._verify_generated(state.current(before),state.current(after),[copy.deepcopy(raw)])
 cap=batch.classification(card)
 if raw['source_reference']!=cap['reference']:raise ValueError('positive source reference differs')
 prior={a:game['players'][a]['growth'] for a in 'AB'}
 final={a:after['legacy_continuation']['game_state']['players'][a]['growth'] for a in 'AB'}
 if any(type(n) is not int or not 0<=n<=100 for n in [*prior.values(),*final.values()]):raise ValueError('positive growth value unproved')
 delta={a:final[a]-prior[a] for a in 'AB'}
 # Each registered mechanism changes zones, stats or payment, never growth.
 if any(delta.values()):raise ValueError('positive source cannot certify growth change')
 old=typed_effects(before);new=typed_effects(after)
 if any(new.get(k)!=v for k,v in old.items()):raise ValueError('positive event changed prior typed lifetime')
 created={k:v for k,v in new.items() if k not in old}
 duration='activation_until_resolution' if kind=='activate_response' else 'none'
 if kind=='activate_response':
  if created:raise ValueError('positive activation created unproved effect')
  dependency=dict(origin_event_seq=raw['trigger_origin_event_seq'],chain_link_id=raw['chain_link_id'])
 else:
  link=before['legacy_continuation']['activation_zone'][-1]
  if (link['source_instance_id'],link['card_id'],link['link_id'])!=(source,card,raw['chain_link_id']):raise ValueError('positive resolution dependency differs')
  dependency=dict(chain_link_id=link['link_id'],activation_receipt=copy.deepcopy(link['activation_receipt']))
  applied=raw['result']['effect_applied']
  if type(applied) is not bool:raise ValueError('positive application status unproved')
  mechanism=MECHANISMS[card]
  expected=1 if applied and mechanism!='zone_return' else 0
  if len(created)!=expected:raise ValueError('positive typed effect creation differs')
  if created:
   field='stat_effects' if mechanism=='stat_this_turn' else 'payment_effects'
   for row in created.values():
    effect=row['effect']
    if row['field']!=field or effect['source_instance_id']!=source or effect['created_event_seq']!=event['seq'] or effect['turn_player']!=game['turn_player'] or effect['round']!=game['round']:raise ValueError('positive typed lifetime source differs')
   if raw['result'].get('effect_id') not in created:raise ValueError('positive effect result binding differs')
   duration='verified_runtime_this_turn'
 return dict(event_seq=event['seq'],kind=kind,card_id=card,source_reference=cap['reference'],
  source_raw_sha256=cap['source_raw_sha256'],certain_growth_difference=delta[event['actor']],
  growth_deltas=delta,growth_before=prior,growth_after=final,duration=duration,
  event_sha256=state.canonical_sha256(raw),before_envelope_sha256=state.state_hash(before),
  after_envelope_sha256=state.state_hash(after),dependencies=dependency,created_effects=created,
  semantic_mechanism=MECHANISMS[card],scope='verified_positive_transition_only')


from contextlib import contextmanager
@contextmanager
def scope(verify_transition):
 """Join full-history validation to positive evidence, restoring both ports."""
 prior=end.verify_new_events;provenance=end.old.reached.provenance
 prior_duration=provenance.RUNTIME_DURATION_VERIFIER;certified={}
 def verify_history(events,shots,envelopes):
  certified.clear()
  proofs=prior(events,shots,envelopes)
  byseq={e['event_seq']:e for e in envelopes}
  if len(byseq)!=len(envelopes):raise ValueError('positive duplicate history boundary')
  event_map={e['seq']:e for e in events}
  if len(event_map)!=len(events):raise ValueError('positive duplicate history event')
  for event in events:
   kind=event['action_type'];source=event.get('source_instance_id');seq=event['seq']
   if kind not in ('activate_response','resolve_board_ability') or seq-1 not in byseq:continue
   before=byseq[seq-1];card=before['legacy_continuation']['game_state']['cards'].get(source,{}).get('card_id')
   if card not in latching.CARDS:continue
   if seq not in byseq:raise ValueError('positive after boundary absent')
   proof=event_proof(before,byseq[seq],event,verify_transition,[e for e in events if e['seq']<seq])
   if any(p['event_seq']==seq for p in proofs):raise ValueError('positive provenance responsibility duplicated')
   closures=[]
   for identity,created in proof['created_effects'].items():
    previous=created;closed=None
    for point in range(seq+1,max(byseq)+1):
     if point not in byseq or point not in event_map:raise ValueError('positive lifetime history gap')
     current=typed_effects(byseq[point]).get(identity)
     if current==previous:continue
     transition=event_map[point]
     checker=end.RUNTIME_TRANSITION_VERIFIER
     if checker is None or checker(byseq[point-1],byseq[point],transition,[e for e in events if e['seq']<point]) is not True:raise ValueError('positive lifetime transition unproved')
     if current is not None:raise ValueError('positive lifetime identity changed or reappeared')
     closed=dict(event_seq=point,event_sha256=state.canonical_sha256(transition),action_type=transition['action_type'])
     previous=current
    if closed is not None:closures.append(dict(effect_id=identity,**closed))
   proof['lifetime_closures']=closures
   proof['lifetime_closed']=len(closures)==len(proof['created_effects'])
   if proof['duration']=='verified_runtime_this_turn' and proof['lifetime_closed']:
    certified[state.canonical_sha256(event)]=proof['duration']
   proofs.append(proof)
  return proofs
 def duration(event,rule):
  if state.canonical_sha256(event) in certified:return certified[state.canonical_sha256(event)]==rule['duration']
  return prior_duration(event,rule) if prior_duration is not None else False
 try:
  end.verify_new_events=verify_history;provenance.RUNTIME_DURATION_VERIFIER=duration
  yield
 finally:end.verify_new_events=prior;provenance.RUNTIME_DURATION_VERIFIER=prior_duration
