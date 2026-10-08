"""Compose existing typed-row proof with the entire supplied effect delta.

No executor replay. A supplied resolution choice is bound to its receipt here;
its policy, actual use of permitted information and origin remain separate.
"""
import copy
import proxy_continuation_state as state
import proxy_population_effect_creation as creation
import proxy_population_resolution_delta as tail
import proxy_population_effect_application_runtime as ruling
from proxy_mandatory_policy_contract import canonical

CARDS=frozenset(('E-fateful-transform','E-big-illness','G-beach-volley','G-baseball-batting','G-air-hockey','G-basketball-3d','M-antlion-03','P-cliff_goat','M-antlion-07','P-anglerfish'))


def audit(before,after,event,decisions):
 errors=[];applicable=False;row_proof=None;choice_bound=False
 try:
  c=before['legacy_continuation'];g=c['game_state'];links=c['activation_zone'];link=links[-1] if links else None
  card=link.get('card_id') if link else None;claimed=g['cards'].get(event.get('source_instance_id'),{}).get('card_id')
  applicable=(c['response_context']['chain_status']=='resolving' and card in CARDS) or (event.get('action_type','').startswith('resolve') and claimed in CARDS)
  if applicable:
   if not link or card not in CARDS:raise ValueError('typed full resolution source differs')
   row_proof=creation.audit(before,after,event)
   if row_proof['errors'] or not row_proof['typed_creation_verified']:raise ValueError('typed row prerequisite differs: '+str(row_proof['errors']))
   source=link['source_instance_id'];actor=link['actor'];board=link['source_zone']=='board';met=row_proof['created_effect_count']==1
   if board and event.get('source_zone')!='board':raise ValueError('typed board receipt zone differs')
   if type(decisions) is not list:raise ValueError('typed resolution decisions differ')
   if card=='M-antlion-03' and met:
    if len(decisions)!=1:raise ValueError('typed parameter decision absent or duplicated')
    choice=decisions[0];context=choice['seed_context'];parameter=choice['selected_action']['option']['parameter']
    if context['actor']!=actor or context['choice_kind']!='board_turn_stat_parameter:'+link['link_id'] or parameter not in ('power','wisdom') or parameter!=event['result']['parameter']:raise ValueError('typed parameter decision/receipt differs')
    choice_bound=True
   elif decisions:raise ValueError('extra typed resolution decision')
   if card in creation.POSITIVE:
    receipt=dict(effect_applied=met)
    if met:
     receipt['effect_id']=after['runtime'][row_proof['effect_family']][-1]['effect_id']
     if card=='M-antlion-03':receipt['parameter']=parameter
    if canonical(event['result'])!=canonical(receipt):raise ValueError('typed positive result fields differ')
   evidence=None
   if not board and not met:
    ruling.verify_source();target=link['target_instance_ids'][0]
    part=dict(operation='target_recheck',target_instance_id=target,status='not_applied',reason='target_no_longer_legal',source_reference=row_proof['source_reference'])
    evidence=dict(contract='effective_application_474.v1',source_sha256=ruling.RULING_SHA,source_instance_id=source,chain_link_id=link['link_id'],resolved=True,activation_reference=dict(chain_link_id=link['link_id'],source_instance_id=source,origin_authenticated=False),parts=[part],parts_complete=True,status='not_applied')
   if ('application_evidence' in event)!=(evidence is not None) or evidence is not None and canonical(event['application_evidence'])!=canonical(evidence):raise ValueError('typed nonapplication evidence differs')
   expected=copy.deepcopy(before);expected['event_seq']=event['seq']
   # Each family was independently derived/fully compared by creation.audit.
   # Copy only these certified families, never other runtime fields.
   for name in creation.FAMILIES:expected['runtime'][name]=copy.deepcopy(after['runtime'][name])
   if not board:expected['legacy_continuation']['game_state']['players'][actor]['discard'].append(source)
   tail.finish(expected,before,event)
   if canonical(after)!=canonical(expected):raise ValueError('typed effect changed unrelated state or source destination')
 except (ValueError,KeyError,TypeError,IndexError,AttributeError,OSError) as error:errors.append(str(error))
 return dict(schema='supplied_typed_resolution_delta.v1',applicable=applicable,errors=errors,
  supplied_typed_resolution_verified=applicable and not errors,typed_row_proof=row_proof,supplied_parameter_receipt_bound=choice_bound and not errors,
  before_envelope_sha256=state.canonical_sha256(before),after_envelope_sha256=state.canonical_sha256(after),
  activation_proven=False,choice_proven=False,origin_authenticated=False,all_rule_opportunities_proven=False,
  legacy_reservation_closure_proven=False,policy_eligible=None,balance_admitted=None)
