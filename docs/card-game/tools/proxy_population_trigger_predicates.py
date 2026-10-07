"""Current alternatives for source-bound sequential trigger mechanisms.

Occurrence production/authentication stays with the existing capture/ledger.
These checks do not certify timing closure, information use or admission.
Only the current474 connection opts in; historical adapters remain unchanged.
"""
from collections import Counter
from contextlib import contextmanager
import hashlib
import proxy_continuation_state as state
import proxy_continuation_rules as rules
import proxy_continuation_batch as batch
import proxy_population_trigger_latching as latching
import proxy_population_trigger_sequential as sequential
import proxy_population_trigger_existing as existing
import proxy_population_public_turn as public_turn
import proxy_continuation_triggers as triggers
import proxy_continuation_challenge as challenge
import proxy_population_start_obligations as starts
import proxy_population_opportunity_ledger as ledger
from proxy_population_board_predicates import SOURCES as BOARD_SOURCES
from proxy_mandatory_policy_contract import ROOT,canonical

# Source hashes are read from the already pinned current107 catalog below.
CITY_SOURCE='67-legacy-test-card-function-and-tracking.md'
CITY_SHA='50438dff1ded3861040b2f8309761416d4859eb7846edbacf358e1cd08045311'
END_CARDS=frozenset(('M-beetle-02','W-countryside','P-desert_scorpion','I-sleepboost1'))
ARRIVAL_CARDS=frozenset(('M-antlion-04','M-antlion-05','M-beetle-01'))
FIELDS=('action_type','card_id','card_copy_id','source_instance_id','target_instance_ids','cost_instance_ids','candidate_variant','base_time_cost')


def _signature(row):return canonical({key:row.get(key) for key in FIELDS})


def _audit(envelope,occurrence,actions,kind,history=None):
 errors=[];expected=[];reference=None
 try:
  for name,digest in BOARD_SOURCES.items():
   if hashlib.sha256((ROOT/name).read_bytes()).hexdigest()!=digest:raise ValueError('trigger predicate source changed')
  state.validate(envelope);ledger.identity(occurrence)
  c=envelope['legacy_continuation'];g=c['game_state'];source=occurrence['source_instance_id'];actor=occurrence['actor'];card=g['cards'][source]['card_id'];p=g['players'][actor];b=p['board']
  if occurrence['category']!=('forced' if kind=='relationship' else 'optional') or occurrence['origin_event_seq']>envelope['event_seq']:raise ValueError('trigger occurrence identity differs')
  # Native collect/proof also observes every transition during resolution.
  # It may certify an independently empty set, never an activation opportunity.
  if c['response_context']['chain_status']=='resolving' and (kind not in ('arrival','end','city','relationship','challenge') or actions):raise ValueError('trigger cannot activate during resolution')
  known=starts.catalog()['cards'][card];reference=known['reference'];pairs=[];variant=None
  if occurrence['source_reference']!=reference:raise ValueError('trigger source reference differs')
  if kind=='challenge':
   if card not in ('M-antlion-07','P-anglerfish') or b['main' if card=='M-antlion-07' else 'partner']!=source:raise ValueError('challenge current source differs')
   cap=batch.classification(card)
   if occurrence['ability_key']!=cap['timing'] or cap['reference']!=reference:raise ValueError('challenge source contract differs')
   origins=[e for e in history if e['seq']==occurrence['origin_event_seq']]
   if len(origins)!=1:raise ValueError('challenge origin absent or ambiguous')
   origin=origins[0];battle=g.get('challenge');since=triggers._since(history,actor)
   met=bool(origin['action_type']=='challenge_declared' and origin['actor']==actor and battle and battle['status']=='comparing' and battle['declaring_actor']==actor and b['main'] is not None and b['main']==battle['participants'][actor])
   if met:
    if battle['parameter'] not in ('power','wisdom'):raise ValueError('challenge parameter unknown')
    if card=='P-anglerfish':met=b['world'] is not None and g['cards'][b['world']]['card_id']=='W-deepsea'
    else:
     changed=any(e['seq']>since and e['actor']==actor and e['action_type']=='place_world' and e.get('previous_world_instance_id') is not None and g['cards'][e['previous_world_instance_id']]['card_id']!=g['cards'][e['source_instance_id']]['card_id'] for e in history)
     met=changed and challenge.quick_effect_applied(g,history,actor,since)
     variant=battle['parameter']
   used=any(e['seq']>since and e['action_type']=='activate_response' and e.get('source_zone')=='board' and e.get('source_instance_id')==source for e in history)
   if met and not used:pairs=[(None,[b['main']])]
  elif kind=='relationship':
   if card!='P-cat_ceo' or b['partner']!=source:raise ValueError('relationship current partner differs')
   cap=batch.classification(card)
   if occurrence['ability_key']!=cap['timing'] or cap['reference']!=reference:raise ValueError('relationship source contract differs')
   origins=[e for e in history if e['seq']==occurrence['origin_event_seq']]
   if len(origins)!=1:raise ValueError('relationship origin absent or ambiguous')
   origin=origins[0];ctx=dict(c['response_context'],priority_actor=actor,origin_event_seq=occurrence['origin_event_seq'])
   met=origin['action_type']=='relationship_start' and origin.get('source_instance_id')==source and origin['actor']==actor and b['main'] is not None
   if met and not triggers._used(dict(c,response_context=ctx),history,source,card):pairs=[(None,[])]
  elif kind=='city':
   if card!='W-city' or b['world']!=source:raise ValueError('city current world differs')
   cap=batch.classification(card)
   if occurrence['ability_key']!=cap['timing'] or cap['reference']!=reference:raise ValueError('city source contract differs')
   if hashlib.sha256((ROOT/CITY_SOURCE).read_bytes()).hexdigest()!=CITY_SHA:raise ValueError('city67 source changed')
   origins=[e for e in history if e['seq']==occurrence['origin_event_seq']]
   if len(origins)!=1:raise ValueError('city origin absent or ambiguous')
   lower=public_turn.boundary(g,history)
   played=[e for e in history if e['seq']>lower and e['actor']==actor and e['action_type'] in batch.NORMAL_CARD_EVENTS and e.get('source_zone') not in ('board','prepared')]
   second=played[1] if len(played)>=2 else None
   ctx=dict(c['response_context'],priority_actor=actor,origin_event_seq=occurrence['origin_event_seq'])
   used=any(e['seq']>lower and e['action_type']=='activate_response' and e.get('source_zone')=='board' and e.get('source_instance_id')==source for e in history)
   if second is not None and second['seq']>=occurrence['origin_event_seq'] and not used:pairs=[(None,[])]
  elif kind=='end':
   if card not in END_CARDS:raise ValueError('unsupported end predicate')
   slot='main' if card=='M-beetle-02' else 'world' if card=='W-countryside' else 'partner' if card=='P-desert_scorpion' else 'prepared'
   if (source not in b[slot] if slot=='prepared' else b[slot]!=source):raise ValueError('end current source differs')
   cap=batch.classification(card)
   if occurrence['ability_key']!=cap['timing'] or cap['reference']!=reference:raise ValueError('end source contract differs')
   origins=[e for e in history if e['seq']==occurrence['origin_event_seq']]
   if len(origins)!=1:raise ValueError('end origin absent or ambiguous')
   origin=origins[0];ctx=dict(c['response_context'],priority_actor=actor,origin_event_seq=occurrence['origin_event_seq'])
   met=actor==g['turn_player'] and origin['action_type']=='open_turn_end_triggers' and origin['actor']==actor and source in origin['eligible_source_instance_ids']
   since=triggers._since(history,actor)
   current_history=[e for e in history if e['seq']>since and e['actor']==actor]
   if met:
    if card=='M-beetle-02':met=not any(e['action_type']=='main_movement' and e.get('source_instance_id')==source and e.get('candidate_variant')=='time_skip' for e in current_history)
    elif card=='I-sleepboost1':
     attachment=envelope['runtime']['attachments'].get(source)
     met=attachment is not None and attachment['controller']==actor and attachment['target_instance_id']==b['main'] and b['main'] is not None and not p['challenge_used'] and p['time']>=2
    else:
     plays=[e for e in current_history if e['action_type'] in ('attach_item','set_item','use_item','use_play','use_event','activate_response') and e.get('source_zone') not in ('board','prepared') and e.get('source_instance_id')]
     if card=='W-countryside':met=len(plays)==1
     else:
      public_plays=[e for e in plays if e['action_type']!='set_item']
      play_ids=[g['cards'][e['source_instance_id']]['card_id'] for e in public_plays]
      item_ids=[g['cards'][e['source_instance_id']]['card_id'] for e in public_plays if e['action_type'] in ('attach_item','use_item','activate_response')]
      met=b['main'] is not None and any(k.startswith('G-') for k in play_ids) and any(k.startswith('I-') for k in item_ids)
   if met and not triggers._used(dict(c,response_context=ctx,last_event_seq=envelope['event_seq']),history,source,card):pairs=[(None,[])]
  elif kind=='arrival':
   if card not in ARRIVAL_CARDS or b['main']!=source:raise ValueError('arrival current main differs')
   cap=batch.classification(card)
   if occurrence['ability_key']!=cap['timing'] or cap['reference']!=reference:raise ValueError('arrival source contract differs')
   origins=[e for e in history if e['seq']==occurrence['origin_event_seq']]
   if len(origins)!=1:raise ValueError('arrival origin absent or ambiguous')
   origin=origins[0];ctx=dict(c['response_context'],priority_actor=actor,origin_event_seq=occurrence['origin_event_seq'])
   met=origin['action_type']=='main_movement' and origin.get('source_instance_id')==source
   if met:
    if origin['actor']!=actor:raise ValueError('arrival origin actor differs')
    if card=='M-antlion-05':met=origin.get('candidate_variant')=='time_skip' and not b['prepared']
    elif card=='M-beetle-01':met=origin.get('candidate_variant')=='birth'
    else:
     visibility=[envelope['runtime']['public_prepared'][s]['face_up'] for s in b['prepared']]
     if any(type(v) is not bool for v in visibility):raise ValueError('arrival preparation visibility unknown')
     met=False not in visibility
   if met and not triggers._used(dict(c,response_context=ctx,last_event_seq=envelope['event_seq']),history,source,card):
    if card=='M-antlion-04':
     quick={r['card_id'] for r in rules.table()['cards'] if any(a['action_type'] in ('use_item','use_play','use_event') for a in r['actions'])}
     pairs=[(None,[s]) for s in p['discard'] if g['cards'][s]['card_id'] in quick]
    else:pairs=[(None,[])]
  elif kind=='start':
   if card not in ('C-chicken','I-bowtie') or occurrence['ability_key']!=known['start_kind']:raise ValueError('unsupported start predicate')
   ctx=c['response_context']
   if actor!=g['turn_player'] or ctx['window_kind']!='turn_start' or ctx['origin_event_seq']!=occurrence['origin_event_seq']:raise ValueError('start context differs')
   public=starts.public_sources(envelope)
   if source not in public or public[source]['actor']!=actor:raise ValueError('start source absent')
   if card=='C-chicken':
    if source not in b['companions']:raise ValueError('start companion slot differs')
    pairs=[(None,[])]
   else:
    if source not in b['prepared'] or source not in envelope['runtime']['attachments']:raise ValueError('start attachment absent')
    if len(p['hand'])<=2:pairs=[(None,[])]
  else:
   if card not in latching.CARDS:raise ValueError('unsupported latched predicate')
   cap=batch.classification(card)
   if cap['reference']!=reference or occurrence['ability_key']!=cap['timing']:raise ValueError('latched capability differs')
   present=(b['main']==source if card.startswith('M-') else source in b['companions'] if card=='C-bat' else b['partner']==source)
   if present and not rules.used(envelope,source,cap.get('ability_key',cap['timing'])):
    if card=='M-antlion-06' and actor==g['turn_player']:
     worlds={r['card_id'] for r in rules.table()['cards'] if r['card_type']=='world'}
     costs=[s for s in p['hand'] if g['cards'][s]['card_id'] in worlds];targets=[s for s in p['discard'] if g['cards'][s]['card_id'] in worlds]
     pairs=[([cost],[target]) for cost in costs for target in targets]
    elif card=='M-antlion-03' and actor!=g['turn_player']:
     visibility=[envelope['runtime']['public_prepared'][s]['face_up'] for s in b['prepared']]
     if any(type(value) is not bool for value in visibility):raise ValueError('prepared visibility unknown')
     if False in visibility:pairs=[([],[])]
    elif card=='C-bat' and actor!=g['turn_player']:pairs=[([],[target]) for target in b['prepared']]
    elif card=='P-cliff_goat' and b['main'] is not None:pairs=[([],[])]
  expected=[dict(action_type='activate_board_ability',card_id=card,card_copy_id=g['cards'][source]['card_copy_id'],source_instance_id=source,target_instance_ids=targets,cost_instance_ids=costs,candidate_variant=variant,base_time_cost=0) for costs,targets in pairs]
  if Counter(map(_signature,actions))!=Counter(map(_signature,expected)):raise ValueError('current trigger semantic alternatives differ')
  if kind=='city' and expected:
   wanted_origin=second['seq'] if second['seq']!=occurrence['origin_event_seq'] else None
   if any(a.get('trigger_origin_event_seq')!=wanted_origin for a in actions):raise ValueError('city second-play origin differs')
 except (ValueError,KeyError,TypeError,IndexError,OSError) as error:errors.append(str(error))
 return dict(schema='sequential_current_trigger_predicates.v1',current_trigger_predicates_verified=not errors,errors=errors,mechanism=kind,source_reference=reference,verified_candidate_count=len(expected),
  current_envelope_sha256=state.canonical_sha256(envelope),occurrence_sha256=state.canonical_sha256(occurrence),
  candidate_identity_grammar_proven=False,origin_authenticated=False,complete_legal_set_proven=False,information_use_proven=False,all_rule_opportunities_proven=False,policy_eligible=None,balance_admitted=None)


def audit_latched(envelope,occurrence,actions):return _audit(envelope,occurrence,actions,'latched')
def audit_start(envelope,occurrence,actions):return _audit(envelope,occurrence,actions,'start')
def audit_arrival(envelope,occurrence,actions,history):return _audit(envelope,occurrence,actions,'arrival',history)
def audit_end(envelope,occurrence,actions,history):return _audit(envelope,occurrence,actions,'end',history)
def audit_city(envelope,occurrence,actions,history):return _audit(envelope,occurrence,actions,'city',history)
def audit_relationship(envelope,occurrence,actions,history):return _audit(envelope,occurrence,actions,'relationship',history)
def audit_challenge(envelope,occurrence,actions,history):return _audit(envelope,occurrence,actions,'challenge',history)


@contextmanager
def scope():
 native_latched=latching.current_actions;native_start=sequential.StartAdapter.enumerate;native_existing=existing.ExistingAdapter.enumerate
 def checked(result,envelope,occurrence,audit):
  rows,proof=result;check=audit(envelope,occurrence,rows)
  if check['errors']:raise ValueError('trigger current predicates differ: '+str(check['errors']))
  return rows,dict(proof,current_predicate_audit=check)
 def latched(envelope,occurrence):return checked(native_latched(envelope,occurrence),envelope,occurrence,audit_latched)
 def start(adapter,envelope,occurrence):return checked(native_start(adapter,envelope,occurrence),envelope,occurrence,audit_start)
 def arrival(adapter,envelope,occurrence):
  result=native_existing(adapter,envelope,occurrence)
  card=envelope['legacy_continuation']['game_state']['cards'][occurrence['source_instance_id']]['card_id']
  audit=audit_arrival if card in ARRIVAL_CARDS else audit_end if card in END_CARDS else audit_city if card=='W-city' else audit_relationship if card=='P-cat_ceo' else audit_challenge if card in ('M-antlion-07','P-anglerfish') else None
  if audit is None:return result
  return checked(result,envelope,occurrence,lambda e,o,a:audit(e,o,a,adapter.history))
 try:
  latching.current_actions=latched;sequential.StartAdapter.enumerate=start;existing.ExistingAdapter.enumerate=arrival
  yield
 finally:latching.current_actions=native_latched;sequential.StartAdapter.enumerate=native_start;existing.ExistingAdapter.enumerate=native_existing
