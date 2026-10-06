"""06 reverse-chain and no-interruption check on supplied actual transitions.

No effect executor, legality proof, input authentication or admission. A matching
native replay alone does not imply this rule boundary; inspect every stack/event.
"""
import hashlib
from proxy_mandatory_policy_contract import ROOT,canonical
SOURCE='06-action-chain-checkpoint.md'
SOURCE_SHA='7ac6d6141095d1139b8a8e072bc1523d621b7f100a57e292c08bbc97a7618c67'


def audit(step):
 errors=[];applicable=False;top_id=None;outer_count=None
 try:
  if hashlib.sha256((ROOT/SOURCE).read_bytes()).hexdigest()!=SOURCE_SHA:raise ValueError('resolution order source changed')
  before=step['source_envelope']['legacy_continuation'];ctx=before['response_context']
  applicable=ctx['chain_status']=='resolving'
  if applicable:
   links=before['activation_zone'];ids=[link['link_id'] for link in links]
   if not links or len(ids)!=len(set(ids)) or canonical(ctx['chain_links'])!=canonical(ids):raise ValueError('source resolution stack differs')
   if step['decision'] is not None:raise ValueError('ordinary choice interrupts resolution')
   top=links[-1];top_id=top['link_id'];outer=links[:-1];outer_count=len(outer)
   events=step['events'];envelopes=step['envelopes']
   if not events or len(events)!=len(envelopes):raise ValueError('resolution transition coverage differs')
   resolved=False
   for event,envelope in zip(events,envelopes):
    after=envelope['legacy_continuation'];context=after['response_context']
    # Current atomic resolver steps have one resolution event. Other kinds
    # would need their own rule-backed order contract, never an inferred no-op.
    if not event['action_type'].startswith('resolve') or resolved:raise ValueError('resolution interrupted or multiple links consumed')
    if any(event[field]!=top[key] for field,key in (('chain_link_id','link_id'),('actor','actor'),('source_instance_id','source_instance_id'))):raise ValueError('resolved event does not identify top link')
    if canonical(after['activation_zone'])!=canonical(outer) or canonical(context['chain_links'])!=canonical(ids[:-1]):raise ValueError('ordered outer links changed or omitted')
    if context['chain_status']!=('resolving' if outer else 'empty'):raise ValueError('remaining chain status differs')
    resolved=True
   if canonical(step['final_envelope'])!=canonical(envelopes[-1]):raise ValueError('resolution final boundary differs')
 except (ValueError,KeyError,TypeError,IndexError,OSError) as error:errors.append(str(error))
 return dict(schema='source_resolution_order_06.v1',applicable=applicable,resolution_order_verified=applicable and not errors,
  errors=errors,top_link_id=top_id,outer_link_count=outer_count,source_sha256={SOURCE:SOURCE_SHA},
  effect_semantics_proven=False,legality_proven=False,all_rule_opportunities_proven=False,
  origin_authenticated=False,policy_eligible=None,balance_admitted=None)
