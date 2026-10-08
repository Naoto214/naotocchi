"""Independent public equipment operands and supplied79 removal semantics."""
import copy
import proxy_continuation_state as state
import proxy_continuation_rules as rules
import proxy_population_start_obligations as starts
import proxy_population_resolution_delta as tail
import proxy_population_effect_application_runtime as ruling
from proxy_mandatory_policy_contract import canonical

def targets(envelope,actor,card):
 """Current target recheck; world presence is a separate activation condition."""
 if actor not in ('A','B') or card not in ('G-archery-3d','G-asteroids-classic'):raise ValueError('equipment target rule unknown')
 starts.catalog();g=envelope['legacy_continuation']['game_state'];runtime=envelope['runtime'];owner=actor if card=='G-asteroids-classic' else 'B' if actor=='A' else 'A';board=g['players'][owner]['board'];table={r['card_id']:r for r in rules.table()['cards']};result=[]
 if len(board['prepared'])!=len(set(board['prepared'])):raise ValueError('equipment target duplicate prepared source')
 for source in board['prepared']:
  public=runtime['public_prepared'][source]
  if type(public['face_up']) is not bool or public['controller']!=owner:raise ValueError('equipment public metadata differs')
  if not public['face_up']:
   if source in runtime['attachments']:raise ValueError('concealed equipment has public attachment')
   continue
  attached=runtime['attachments'].get(source)
  if not attached or attached['controller']!=owner or attached['target_instance_id'] not in [s for s in (board['main'],board['partner'],*board['companions']) if s is not None]:raise ValueError('equipment attachment unproved')
  printed=table[g['cards'][source]['card_id']];costs=[a['base_time_cost'] for a in printed['actions'] if a['action_type']=='attach_item']
  if any(type(cost) is not int or cost<0 for cost in costs):raise ValueError('equipment printed cost unknown')
  if printed['card_type']=='item' and any(cost<=2 if card=='G-archery-3d' else cost>=3 for cost in costs):result.append(source)
 return result

def audit(before,after,event):
 errors=[];applicable=False;reference=None;legal=None
 try:
  c=before['legacy_continuation'];g=c['game_state'];ctx=c['response_context'];links=c['activation_zone'];link=links[-1] if links else None;claimed=g['cards'].get(event.get('source_instance_id'),{}).get('card_id')
  applicable=(ctx['chain_status']=='resolving' and link is not None and link.get('card_id')=='G-archery-3d') or (str(event.get('action_type','')).startswith('resolve') and claimed=='G-archery-3d')
  if applicable:
   reference=starts.catalog()['cards']['G-archery-3d']['reference']
   if not link or link.get('card_id')!='G-archery-3d' or event.get('action_type')!='resolve_targeted_zone_move' or ctx['chain_status']!='resolving' or ctx['consecutive_passes']!=2 or ctx['chain_links']!=[r['link_id'] for r in links]:raise ValueError('equipment effect dispatch differs')
   actor=link['actor'];source=link['source_instance_id'];seq=event['seq'];selected=link['target_instance_ids']
   if actor not in ('A','B') or link.get('source_zone','hand')!='hand' or link['action_type']!='use_play' or type(selected) is not list or len(selected)!=1 or link['candidate_variant'] is not None:raise ValueError('equipment effect link differs')
   if g['cards'][source]['card_id']!='G-archery-3d' or g['cards'][source]['card_copy_id']!=link['card_copy_id']:raise ValueError('equipment effect physical identity differs')
   if type(seq) is not int or seq!=before['event_seq']+1 or after['event_seq']!=seq or event['actor']!=actor or event['source_instance_id']!=source or event['chain_link_id']!=link['link_id'] or event['source_reference']!=reference:raise ValueError('equipment effect receipt identity differs')
   target=selected[0];legal=target in targets(before,actor,'G-archery-3d');receipt=dict(target_instance_id=target,effect_applied=True) if legal else None
   if canonical(event['created_effect'])!=canonical(receipt):raise ValueError('equipment effect result differs')
   if legal:
    if 'application_evidence' in event:raise ValueError('unexpected equipment application evidence')
   else:
    ruling.verify_source();evidence=dict(contract='effective_application_474.v1',source_sha256=ruling.RULING_SHA,source_instance_id=source,chain_link_id=link['link_id'],resolved=True,activation_reference=dict(chain_link_id=link['link_id'],source_instance_id=source,origin_authenticated=False),parts=[dict(operation='target_recheck',target_instance_id=target,status='not_applied',reason='target_no_longer_legal',source_reference=reference)],parts_complete=True,status='not_applied')
    if canonical(event['application_evidence'])!=canonical(evidence):raise ValueError('equipment nonapplication evidence differs')
   expected=copy.deepcopy(before);expected['event_seq']=seq;eg=expected['legacy_continuation']['game_state'];eg['players'][actor]['discard'].append(source)
   if legal:
    owner='B' if actor=='A' else 'A';p=eg['players'][owner];p['board']['prepared'].remove(target);p['discard'].append(target);del expected['runtime']['public_prepared'][target];del expected['runtime']['attachments'][target]
   tail.finish(expected,before,event)
   if canonical(after)!=canonical(expected):raise ValueError('equipment effect changed unrelated state or wrong destination')
 except (ValueError,KeyError,TypeError,IndexError,AttributeError,OSError) as error:errors.append(str(error))
 return dict(schema='supplied_archery_equipment_semantics.v1',applicable=applicable,errors=errors,supplied_archery_verified=applicable and not errors,target_legal=legal,source_reference=reference,
  before_envelope_sha256=state.canonical_sha256(before),after_envelope_sha256=state.canonical_sha256(after),
  activation_proven=False,printed_cost_authenticated=False,origin_authenticated=False,all_rule_opportunities_proven=False,legacy_reservation_closure_proven=False,policy_eligible=None,balance_admitted=None)
