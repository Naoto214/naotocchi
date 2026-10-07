"""Current alternatives for six source-bound sequential trigger mechanisms.

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
import proxy_population_start_obligations as starts
import proxy_population_opportunity_ledger as ledger
from proxy_population_board_predicates import SOURCES as BOARD_SOURCES
from proxy_mandatory_policy_contract import ROOT,canonical

# Source hashes are read from the already pinned current107 catalog below.
FIELDS=('action_type','card_id','card_copy_id','source_instance_id','target_instance_ids','cost_instance_ids','candidate_variant','base_time_cost')


def _signature(row):return canonical({key:row.get(key) for key in FIELDS})


def _audit(envelope,occurrence,actions,kind):
 errors=[];expected=[];reference=None
 try:
  for name,digest in BOARD_SOURCES.items():
   if hashlib.sha256((ROOT/name).read_bytes()).hexdigest()!=digest:raise ValueError('trigger predicate source changed')
  state.validate(envelope);ledger.identity(occurrence)
  c=envelope['legacy_continuation'];g=c['game_state'];source=occurrence['source_instance_id'];actor=occurrence['actor'];card=g['cards'][source]['card_id'];p=g['players'][actor];b=p['board']
  if occurrence['category']!='optional' or occurrence['origin_event_seq']>envelope['event_seq']:raise ValueError('trigger occurrence identity differs')
  if c['response_context']['chain_status']=='resolving':raise ValueError('trigger cannot activate during resolution')
  known=starts.catalog()['cards'][card];reference=known['reference'];pairs=[]
  if occurrence['source_reference']!=reference:raise ValueError('trigger source reference differs')
  if kind=='start':
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
  expected=[dict(action_type='activate_board_ability',card_id=card,card_copy_id=g['cards'][source]['card_copy_id'],source_instance_id=source,target_instance_ids=targets,cost_instance_ids=costs,candidate_variant=None,base_time_cost=0) for costs,targets in pairs]
  if Counter(map(_signature,actions))!=Counter(map(_signature,expected)):raise ValueError('current trigger semantic alternatives differ')
 except (ValueError,KeyError,TypeError,IndexError,OSError) as error:errors.append(str(error))
 return dict(schema='sequential_current_trigger_predicates.v1',current_trigger_predicates_verified=not errors,errors=errors,mechanism=kind,source_reference=reference,verified_candidate_count=len(expected),
  current_envelope_sha256=state.canonical_sha256(envelope),occurrence_sha256=state.canonical_sha256(occurrence),
  candidate_identity_grammar_proven=False,origin_authenticated=False,complete_legal_set_proven=False,information_use_proven=False,all_rule_opportunities_proven=False,policy_eligible=None,balance_admitted=None)


def audit_latched(envelope,occurrence,actions):return _audit(envelope,occurrence,actions,'latched')
def audit_start(envelope,occurrence,actions):return _audit(envelope,occurrence,actions,'start')


@contextmanager
def scope():
 native_latched=latching.current_actions;native_start=sequential.StartAdapter.enumerate
 def checked(result,envelope,occurrence,audit):
  rows,proof=result;check=audit(envelope,occurrence,rows)
  if check['errors']:raise ValueError('trigger current predicates differ: '+str(check['errors']))
  return rows,dict(proof,current_predicate_audit=check)
 def latched(envelope,occurrence):return checked(native_latched(envelope,occurrence),envelope,occurrence,audit_latched)
 def start(adapter,envelope,occurrence):return checked(native_start(adapter,envelope,occurrence),envelope,occurrence,audit_start)
 try:
  latching.current_actions=latched;sequential.StartAdapter.enumerate=start
  yield
 finally:latching.current_actions=native_latched;sequential.StartAdapter.enumerate=native_start
