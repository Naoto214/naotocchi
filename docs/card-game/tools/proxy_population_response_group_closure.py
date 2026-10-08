"""Local response suppression from actual consumed group receipts.

Reuses current group enumeration, ledger algebra and full closure delta checks.
Supplied occurrence production and choice origins remain unauthenticated.
"""
import proxy_continuation_state as state
import proxy_population_start_obligations as starts
import proxy_population_trigger_sequential as sequential
import proxy_population_trigger_observation as observation
import proxy_population_trigger_closure_effect as closure
import proxy_population_board_group_effect as board_activation
import proxy_population_positive_activation_effect as positive_activation
from proxy_population_resolution_semantics import event_digest
from proxy_mandatory_policy_contract import canonical


def audit(envelope,history,inventory,journal,records,trace,wanted):
 errors=[];verified=[];unproved=[];receipts={}
 try:
  state.validate(envelope);sequential.audit_ledger(journal)
  c=envelope['legacy_continuation'];g=c['game_state'];ctx=c['response_context'];actor=ctx['priority_actor'];p=g['players'][actor];b=p['board']
  if g['phase'] not in ('response_window','turn_end_response','post_placement_response') or ctx['chain_status'] not in ('empty','building') or c['pending_triggers']:raise ValueError('not an ordinary closed-group response')
  if journal['turn_player']!=g['turn_player'] or inventory['actor']!=actor or canonical(inventory['response_context'])!=canonical(ctx):raise ValueError('closed-group response identity differs')
  owned=set(p['hand'])|{s for s in (b['main'],b['partner'],b['world'],*b['companions'],*b['prepared']) if s is not None}
  if type(wanted) is not list or len(wanted)!=len(set(wanted)) or set(wanted)-owned:raise ValueError('closed-group requested source differs')
  if not trace or canonical(trace[-1])!=canonical(envelope):raise ValueError('closed-group actual trace endpoint differs')
  public=starts.public_sources(envelope)
  for source in wanted:
   if source not in public or public[source]['actor']!=actor:
    unproved.append(dict(source_instance_id=source,reason='outside_public_board_closure'));continue
   matching=[(key,row) for key,row in journal['occurrences'].items() if row['occurrence']['source_instance_id']==source and row['occurrence']['actor']==actor and row['occurrence']['origin_event_seq']==ctx['origin_event_seq']]
   if len(matching)!=1 or matching[0][1]['status'] not in ('activated','declined','ineligible') or any(row['occurrence']['source_instance_id']==source and row['status'] in ('pending','deferred') for row in journal['occurrences'].values()):
    unproved.append(dict(source_instance_id=source,reason='current_group_consumption_unproved'));continue
   key,row=matching[0]
   activated=row['status']=='activated'
   candidates=[r for r in records if len(r['events'])==1 and (
    (r['events'][0]['action_type']=='activate_response' and r['chosen'].get('action')=='activate' and r['chosen'].get('occurrence_id')==key) if activated else
    (r['events'][0]['action_type'] in closure.KINDS and key in r['events'][0]['occurrence_ids']))]
   if len(candidates)!=1:raise ValueError('closed-group actual receipt absent or ambiguous')
   record=candidates[0];before=record['before_envelope'];after=record['after_envelope'];event=record['events'][0];seq=event['seq']
   if seq>envelope['event_seq']:raise ValueError('closed-group receipt is in the future')
   for saved in (before,after):
    actual=[e for e in trace if e['event_seq']==saved['event_seq']]
    if len(actual)!=1 or canonical(actual[0])!=canonical(saved):raise ValueError('closed-group actual state binding differs')
   actual=[e for e in history if e['seq']==seq]
   if len(actual)!=1 or event_digest(actual[0])!=event_digest(event):raise ValueError('closed-group actual event binding differs')
   saved=record['after_ledger']
   if canonical(journal['journal'][:len(saved['journal'])])!=canonical(saved['journal']) or canonical(saved['occurrences'].get(key))!=canonical(row):raise ValueError('closed-group current ledger continuation differs')
   if canonical(g['cards'][source])!=canonical(before['legacy_continuation']['game_state']['cards'][source]):raise ValueError('closed-group physical source changed')
   if seq not in receipts:
    prior_history=[e for e in history if e['seq']<=before['event_seq']]
    expected=sequential.inventory(before,record['before_ledger'],observation.Adapter(prior_history))
    if canonical(expected)!=canonical(record['inventory']):raise ValueError('closed-group current enumeration differs')
    if activated:
     board_check=board_activation.audit(before,after,event,record);positive_check=positive_activation.audit(before,after,event,record)
     applicable=[(proof,flag) for proof,flag in ((board_check,'supplied_board_group_verified'),(positive_check,'supplied_positive_activation_verified')) if proof['applicable']]
     if len(applicable)!=1:raise ValueError('closed-group activation mechanism differs')
     check,flag=applicable[0]
    else:check=closure.audit(before,after,event,record);flag='supplied_trigger_closure_verified'
    if check['errors'] or check[flag] is not True:raise ValueError('closed-group full delta differs')
    receipts[seq]=check
   if any(a.get('source_instance_id')==source for a in inventory['legal_candidate_details']):raise ValueError('closed-group source reoffered')
   verified.append(source)
 except (ValueError,KeyError,TypeError,IndexError,AttributeError,OSError) as error:errors.append(str(error))
 return dict(schema='response_closed_group_predicates.v1',response_group_closure_verified=not errors,errors=errors,verified_source_ids=sorted(verified),unproved_sources=unproved,closure_delta_audits=[v for v in receipts.values() if v['schema']=='supplied_trigger_closure_delta.v1'],activation_delta_audits=[v for v in receipts.values() if v['schema']!='supplied_trigger_closure_delta.v1'],
  current_envelope_sha256=state.canonical_sha256(envelope),scope='current_origin_consumed_public_sources_only',occurrence_origin_authenticated=False,choice_origin_authenticated=False,history_authenticated=False,all_rule_opportunities_proven=False,policy_eligible=None,balance_admitted=None)
