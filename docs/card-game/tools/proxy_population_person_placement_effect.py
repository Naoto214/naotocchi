"""01/06/72/74/77 supplied person placement delta; discard order unproved."""
import copy,hashlib
from collections import Counter
import proxy_population_payment_consumption as identity
import proxy_population_start_obligations as starts
import proxy_population_resolution_order as order
import proxy_continuation_batch as batch
import proxy_continuation_state as state
from proxy_population_resolution_semantics import event_digest
from proxy_mandatory_policy_contract import ROOT,canonical

PARTNERS=('P-cat_ceo','P-anglerfish','P-cliff_goat','P-desert_scorpion')
COMPANIONS=('C-bat','C-box','C-cat_friend','C-chameleon','C-chicken')

def audit(before,after,event):
 errors=[];applicable=event.get('action_type') in ('place_partner','place_companion','relationship_start','person_placement');prior=None;old=None
 try:
  if applicable:
   if hashlib.sha256((ROOT/'01-core-rules.md').read_bytes()).hexdigest()!=batch.RELATIONSHIP_SOURCE_SHA or hashlib.sha256((ROOT/order.SOURCE).read_bytes()).hexdigest()!=order.SOURCE_SHA:raise ValueError('person placement core source changed')
   catalog=starts.catalog()['cards'];c=before['legacy_continuation'];g=c['game_state'];actor=g['turn_player'];p=g['players'][actor];source=event['source_instance_id'];seq=event['seq'];partner=event['action_type'] in ('place_partner','relationship_start')
   if event['actor']!=actor or g['phase']!='normal_action' or c['activation_zone'] or c['pending_triggers'] or c['response_context']['chain_status']!='empty' or c['response_context']['chain_links'] or g.get('challenge') is not None or p['person_placed'] is not False:raise ValueError('person placement boundary differs')
   if type(seq) is not int or seq!=before['event_seq']+1 or after['event_seq']!=seq:raise ValueError('person placement sequence differs')
   prior=identity.field_entry_instance(before,after,event,'partner' if partner else 'companions');card=g['cards'][prior]['card_id']
   if card not in (PARTNERS if partner else COMPANIONS) or event['source_reference']!=catalog[card]['reference']:raise ValueError('person placement source differs')
   if type(event['payment_time']) is not int or event['payment_time']!=0 or type(p['time']) is not int or p['time']<0 or event.get('payment_effect_ids',[])!=[]:raise ValueError('person placement payment differs')
   old=event.get('replaced_instance_id');board=p['board']
   if partner:
    if board['partner'] is not None or old is not None:raise ValueError('person partner slot differs')
   elif old is None:
    if len(board['companions'])>=3:raise ValueError('person companion capacity differs')
   elif len(board['companions'])!=3 or old not in board['companions'] or event.get('departure_source_reference')!='01-core-rules.md' or event.get('departure_source_sha256')!=batch.RELATIONSHIP_SOURCE_SHA:raise ValueError('person replacement receipt differs')
   expected=copy.deepcopy(before);expected['event_seq']=seq;ec=expected['legacy_continuation'];ep=ec['game_state']['players'][actor]
   if source not in g['cards']:ec['game_state']['cards'][source]=copy.deepcopy(g['cards'][prior])
   attached=[];moved={owner:[] for owner in ('A','B')}
   if old is not None:
    for item,row in before['runtime']['attachments'].items():
     if row['target_instance_id']!=old:continue
     owner=row['controller'];public=before['runtime']['public_prepared'][item]
     if owner!=actor or public['controller']!=owner or public['face_up'] is not True:raise ValueError('person departure equipment relation differs')
     expected['legacy_continuation']['game_state']['players'][owner]['board']['prepared'].remove(item)
     del expected['runtime']['attachments'][item];del expected['runtime']['public_prepared'][item];moved[owner].append(item);attached.append(item)
    if event.get('discarded_equipment_instance_ids')!=sorted(attached):raise ValueError('person departure equipment receipt differs')
    ep['board']['companions'].remove(old);moved[actor].append(old)
    for family in ('stat_effects','conditional_effects'):expected['runtime'][family]=[row for row in expected['runtime'][family] if row['target_instance_id']!=old]
   for owner in ('A','B'):
    previous=g['players'][owner]['discard'];actual=after['legacy_continuation']['game_state']['players'][owner]['discard']
    if actual[:len(previous)]!=previous or Counter(actual[len(previous):])!=Counter(moved[owner]):raise ValueError('person departure discard conservation differs')
    expected['legacy_continuation']['game_state']['players'][owner]['discard']=copy.deepcopy(actual)
   ep['hand'].remove(prior);ep['person_placed']=True
   if partner:
    ep['board'].update(partner=source,partner_stage=0)
    if card=='P-cat_ceo' and board['main'] is not None:ec['pending_triggers']=[f'mandatory:{seq}:{source}']
   else:ep['board']['companions'].append(source)
   ec['game_state']['phase']='post_placement_response';ec['return_target']='normal_action_opportunity'
   ec['response_context']=dict(source_phase='post_placement_response',phase='response_window',window_kind='after_normal_action',origin_event_seq=seq,turn_player=actor,priority_actor=actor,chain_status='empty',chain_links=[],consecutive_passes=0,response_opportunity_index=1,decision_kind='response_action',choice_kind='reaction_or_pass')
   if canonical(after)!=canonical(expected):raise ValueError('person placement full delta differs')
 except (ValueError,KeyError,TypeError,IndexError,AttributeError,OSError) as error:errors.append(str(error))
 return dict(schema='supplied_person_placement_delta.v1',applicable=applicable,errors=errors,supplied_person_placement_verified=applicable and not errors,prior_hand_instance_id=prior,replaced_instance_id=old,
  event_sha256=event_digest(event),before_envelope_sha256=state.canonical_sha256(before),after_envelope_sha256=state.canonical_sha256(after),discard_arrival_order_proven=False,activation_history_proven=False,incarnation_origin_proven=False,all_rule_opportunities_proven=False,policy_eligible=None,balance_admitted=None)
