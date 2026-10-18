"""Source-local response alternatives from registered native mechanism helpers.

Not a second rules engine: a helper's matching rows certify only its registered
expansion. Unhandled sources are listed, never silently certified as absent.
Actual history authentication and complete legality remain separate gates.
"""
import hashlib
from collections import Counter
import proxy_continuation_state as state
import proxy_continuation_batch as batch
import proxy_continuation_quick as quick
import proxy_continuation_triggers as triggers
import proxy_population_paid_draw as paid
from proxy_population_candidate_expansions import TABLE_PATH,TABLE_SHA
from proxy_mandatory_policy_contract import ROOT,canonical


def audit(envelope,events,inventory):
 errors=[];verified=[];unproved=[];expected={};actual={}
 prior_current=batch.RESPONSE_FULL_CURRENT;prior_runtime=batch.RESPONSE_FULL_RUNTIME
 try:
  if hashlib.sha256((ROOT/TABLE_PATH).read_bytes()).hexdigest()!=TABLE_SHA:raise ValueError('114 candidate table source changed')
  state.validate(envelope);current=state.current(envelope);g=current['game_state'];ctx=current['response_context'];actor=ctx['priority_actor'];p=g['players'][actor]
  if g['phase'] not in ('response_window','post_placement_response','turn_end_response') or ctx['chain_status'] not in ('empty','building') or current['pending_triggers']:raise ValueError('not an ordinary response expansion entry')
  if inventory['actor']!=actor or canonical(inventory['response_context'])!=canonical(ctx):raise ValueError('response identity differs')
  batch.RESPONSE_FULL_CURRENT=current;batch.RESPONSE_FULL_RUNTIME=envelope['runtime']
  table=quick.old.start.load_candidate_rows()
  for source in p['hand']:
   rows,reason=quick.hand_candidates(current,events,actor,source,table[g['cards'][source]['card_id']])
   if reason is None:
    unproved.append(dict(source_instance_id=source,reason='native_fallback_hand_route_not_checked_here'))
   else:expected[source]=rows
  slots=[(slot,p['board'][slot]) for slot in ('main','partner','world')]+[('companions',s) for s in p['board']['companions']]+[('prepared',s) for s in p['board']['prepared']]
  for slot,source in slots:
   if source is None:continue
   card=g['cards'][source]['card_id']
   if card not in paid.DESCRIPTORS and card not in triggers.SUPPORTED_EFFECTS:
    unproved.append(dict(source_instance_id=source,reason='board_route_not_checked_here'));continue
   if slot=='prepared' and source not in envelope['runtime']['attachments']:
    unproved.append(dict(source_instance_id=source,reason='prepared_non_attachment_route_not_checked_here'));continue
   expected[source]=triggers.board_candidates(current,events,source,slot,envelope['runtime'])[0]
  for source,rows in expected.items():
   actual[source]=[r for r in inventory['legal_candidate_details'] if r.get('source_instance_id')==source]
   if Counter(map(canonical,rows))!=Counter(map(canonical,actual[source])):raise ValueError('registered response alternatives differ: '+source)
   verified.append(source)
 except (ValueError,KeyError,TypeError,IndexError,OSError) as error:errors.append(str(error))
 finally:batch.RESPONSE_FULL_CURRENT=prior_current;batch.RESPONSE_FULL_RUNTIME=prior_runtime
 return dict(schema='registered_response_candidate_expansions.v1',registered_expansions_verified=not errors,errors=errors,
  verified_source_ids=sorted(verified),unproved_sources=unproved,table_sha256=TABLE_SHA,
  expected_candidate_count=sum(map(len,expected.values())),actual_candidate_count=sum(map(len,actual.values())),
  complete_legal_set_proven=False,information_use_proven=False,all_rule_opportunities_proven=False,
  origin_authenticated=False,policy_eligible=None,balance_admitted=None)
