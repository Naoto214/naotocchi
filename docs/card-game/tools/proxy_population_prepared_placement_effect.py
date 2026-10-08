"""01/06/55/77 supplied preparation/equipment placement, without execution."""
import copy,hashlib,re
import proxy_population_payment_consumption as identity
import proxy_population_start_obligations as starts
import proxy_population_resolution_order as order
import proxy_continuation_batch as batch
import proxy_continuation_rules as rules
import proxy_continuation_state as state
from proxy_population_resolution_semantics import event_digest
from proxy_mandatory_policy_contract import ROOT,canonical

CARDS=('I-poop1','I-bowtie','I-bond1','I-sleepboost1')

def audit(before,after,event):
 errors=[];applicable=event.get('action_type') in ('set_item','attach_item');prior=None;cost=None;discount=None
 try:
  if applicable:
   if hashlib.sha256((ROOT/'01-core-rules.md').read_bytes()).hexdigest()!=batch.RELATIONSHIP_SOURCE_SHA or hashlib.sha256((ROOT/order.SOURCE).read_bytes()).hexdigest()!=order.SOURCE_SHA:raise ValueError('prepared placement core source changed')
   catalog=starts.catalog()['cards'];c=before['legacy_continuation'];g=c['game_state'];actor=g['turn_player'];p=g['players'][actor];source=event['source_instance_id'];seq=event['seq'];concealed=event['action_type']=='set_item'
   if event['actor']!=actor or g['phase']!='normal_action' or c['activation_zone'] or c['pending_triggers'] or c['response_context']['chain_status']!='empty' or c['response_context']['chain_links'] or g.get('challenge') is not None or len(p['board']['prepared'])>=3:raise ValueError('prepared placement boundary differs')
   if type(seq) is not int or seq!=before['event_seq']+1 or after['event_seq']!=seq:raise ValueError('prepared placement sequence differs')
   if any(player['reservations'] for player in g['players'].values()):raise ValueError('legacy prepared price modifiers unproved')
   prior=identity.field_entry_instance(before,after,event,'prepared');card=g['cards'][prior]['card_id']
   if card not in CARDS or concealed!=(card=='I-poop1') or event['source_reference']!=catalog[card]['reference']:raise ValueError('prepared placement source differs')
   body,_=rules.source_section(catalog[card]['reference']);printed=re.findall(r'^時: (\d+) / 使用方法: (しかける|みにつける)',body,re.M)
   if len(printed)!=1 or printed[0][1]!=('しかける' if concealed else 'みにつける'):raise ValueError('prepared printed payment absent')
   cost=int(printed[0][0]);targets=event['target_instance_ids'];mods=event.get('cost_modifiers',[])
   if type(targets) is not list or type(mods) is not list:raise ValueError('prepared receipt types differ')
   if concealed:
    if targets:raise ValueError('concealed placement cannot attach')
   else:
    board=p['board'];allowed=([board['main']] if card=='I-sleepboost1' else board['companions'] if card=='I-bond1' else [board['main'],board['partner']]+board['companions'])
    if len(targets)!=1 or targets[0] is None or targets[0] not in allowed:raise ValueError('equipment target differs')
   if mods:
    main=p['board']['main'];reference=catalog['M-antlion-01']['reference'];expected_mod=dict(source_instance_id=main,ability_key='set_discount',source_reference=reference)
    if not concealed or main is None or g['cards'][main]['card_id']!='M-antlion-01' or mods!=[expected_mod]:raise ValueError('prepared discount source differs')
    if any(row['source_instance_id']==main and row['ability_key']=='set_discount' and row['turn_player']==actor and row['round']==g['round'] for row in before['runtime']['ability_uses']):raise ValueError('prepared discount already used')
    discount=main;cost=max(0,cost-1)
   if type(p['time']) is not int or p['time']<cost or type(event['payment_time']) is not int or event['payment_time']!=cost:raise ValueError('prepared actual payment differs')
   expected=copy.deepcopy(before);expected['event_seq']=seq;ec=expected['legacy_continuation'];ep=ec['game_state']['players'][actor]
   if source not in g['cards']:ec['game_state']['cards'][source]=copy.deepcopy(g['cards'][prior])
   ep['hand'].remove(prior);ep['board']['prepared'].append(source);ep['time']-=cost
   expected['runtime']['public_prepared'][source]=dict(controller=actor,face_up=not concealed,paid_time=cost,placed_event_seq=seq)
   if not concealed:expected['runtime']['attachments'][source]=dict(controller=actor,target_instance_id=targets[0],attached_event_seq=seq)
   if discount is not None:expected['runtime']['ability_uses'].append(dict(source_instance_id=discount,ability_key='set_discount',turn_player=actor,round=g['round'],count=1))
   ec['game_state']['phase']='post_placement_response';ec['return_target']='normal_action'
   ec['response_context']=dict(source_phase='post_placement_response',phase='response_window',window_kind='after_normal_action',origin_event_seq=seq,turn_player=actor,priority_actor=actor,chain_status='empty',chain_links=[],consecutive_passes=0,response_opportunity_index=1,decision_kind='response_action',choice_kind='reaction_or_pass')
   if canonical(after)!=canonical(expected):raise ValueError('prepared placement full delta differs')
 except (ValueError,KeyError,TypeError,IndexError,AttributeError,OSError) as error:errors.append(str(error))
 return dict(schema='supplied_prepared_placement_delta.v1',applicable=applicable,errors=errors,supplied_prepared_placement_verified=applicable and not errors,prior_hand_instance_id=prior,payment_time=cost,discount_source_instance_id=discount,
  event_sha256=event_digest(event),before_envelope_sha256=state.canonical_sha256(before),after_envelope_sha256=state.canonical_sha256(after),activation_history_proven=False,incarnation_origin_proven=False,all_rule_opportunities_proven=False,policy_eligible=None,balance_admitted=None)
