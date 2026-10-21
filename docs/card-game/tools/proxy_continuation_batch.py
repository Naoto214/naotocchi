"""Opt-in shared normal outcome, atomic movement and provenance contracts.

Source-bound descriptors are semantic capabilities, never route/copy patches.
Eligible future abilities remain obligations; zero growth is not a no-trigger
certificate. Existing editions and their default registries are unchanged.
"""
import copy,hashlib,json
from contextlib import contextmanager
import proxy_continuation_state as state
import proxy_continuation_rules as rules
import proxy_continuation_candidates as candidates
import proxy_continuation_actions as actions
import proxy_continuation_end as end
import proxy_resource_value_trajectory as old
from proxy_resource_value_response import enumerate_opportunity as response_enumerator

CAPABILITIES = {'M-antlion-03': {'kind': 'triggered', 'timing': 'after_opponent_quick_play', 'ability_key': 'after_opponent_quick_play', 'reference': '55-insect-three-lines-card-text-draft.md#M-antlion-03', 'semantic_section_sha256': '6e7c40fa1fdf312d71a08acc3d2ed1ba3c814d0976b5fe0e8ec883815168d752', 'arrival_trigger': False, 'no_end_trigger': True, 'optional': True, 'no_start_trigger': True}, 'M-antlion-04': {'kind': 'triggered', 'timing': 'main_arrival', 'ability_key': 'main_arrival', 'reference': '55-insect-three-lines-card-text-draft.md#M-antlion-04', 'semantic_section_sha256': '54d3755784ec261f06aa2abf2b75ad50f6d9446a181102fe71ef9f3aa487d8fe', 'arrival_trigger': True, 'no_end_trigger': True, 'optional': True, 'no_start_trigger': True}, 'M-antlion-05': {'kind': 'triggered', 'timing': 'time_skip_arrival', 'ability_key': 'time_skip_arrival', 'reference': '55-insect-three-lines-card-text-draft.md#M-antlion-05', 'semantic_section_sha256': '7639f6236b6adf2882866e36d5fa731c5a0d03b37e243390268469e822f45192', 'arrival_trigger': True, 'no_end_trigger': True, 'optional': True, 'no_start_trigger': True}, 'M-antlion-07': {'kind': 'triggered', 'timing': 'own_challenge', 'ability_key': 'own_challenge', 'reference': '55-insect-three-lines-card-text-draft.md#M-antlion-07', 'semantic_section_sha256': '98f530e5a7d42bdc575e815e6b30ca2ba18e2b6ca625c17a2b4600653323ba33', 'arrival_trigger': False, 'no_end_trigger': True, 'optional': True, 'no_start_trigger': True}, 'P-cat_ceo': {'kind': 'triggered', 'timing': 'relationship_start', 'reference': '74-partner-18-card-text-draft.md#P-cat_ceo', 'semantic_section_sha256': '770c5b9a2207d09662177783c71fb08e60218473ea6845f5e2d1715103e28689', 'progression_trigger': False}, 'P-anglerfish': {'kind': 'triggered', 'timing': 'own_challenge', 'reference': '74-partner-18-card-text-draft.md#P-anglerfish', 'semantic_section_sha256': '728ba0efa34805c2855f6ac3ad8aff5b65cc48398016957be5102ed879ee0b81', 'progression_trigger': False}, 'P-cliff_goat': {'kind': 'triggered', 'timing': 'different_name_world_change', 'reference': '74-partner-18-card-text-draft.md#P-cliff_goat', 'semantic_section_sha256': '3b05de608e026788b29db8def9d52400c5cd853df63be75fa25f8e64f1d931b0', 'progression_trigger': False}, 'P-desert_scorpion': {'kind': 'triggered', 'timing': 'own_turn_end', 'reference': '74-partner-18-card-text-draft.md#P-desert_scorpion', 'semantic_section_sha256': '02854b0925802f1fcf7b912587f90b4a5714f4871b27eaabfb56d4683095be5c', 'progression_trigger': False}, 'M-antlion-06': {'kind': 'triggered', 'timing': 'after_own_quick_effect_applied', 'ability_key': 'quick_world_exchange', 'reference': '55-insect-three-lines-card-text-draft.md#M-antlion-06', 'optional': True, 'uses_per_instance_turn': 1, 'arrival_trigger': False, 'semantic_section_sha256': 'f90c6c72de75235ae61e3d4331690a7b7fbc8ba68087564477380173605e3f0a', 'no_end_trigger': True, 'no_start_trigger': True}, 'M-beetle-01': {'kind': 'triggered', 'timing': 'birth_arrival', 'ability_key': 'birth_arrival', 'reference': '31-beetle-stagbeetle-card-master-migration.md#M-beetle-01', 'semantic_section_sha256': '10950c03dbebb2de3db293f6f5835569e69856d2e314cc3ddaaa1335f40f9b83', 'arrival_trigger': True, 'no_end_trigger': True, 'no_start_trigger': True, 'optional': True}, 'M-beetle-02': {'kind': 'triggered', 'timing': 'own_turn_end', 'ability_key': 'own_turn_end', 'reference': '31-beetle-stagbeetle-card-master-migration.md#M-beetle-02', 'semantic_section_sha256': '6c701c54684fc9db6f4ddc658c3492d8f6e11779a58c823e40cf253143a49e5b', 'arrival_trigger': False, 'no_end_trigger': False, 'no_start_trigger': True, 'optional': True}, 'W-city': {'kind': 'triggered', 'timing': 'second_own_card', 'ability_key': 'second_own_card', 'reference': '89-world-13-card-text-draft.md#W-city', 'semantic_section_sha256': 'd6765c7261f34c2f9c75c34423b8babab7f49f77b679f9263008874853bc2479', 'arrival_trigger': False, 'no_end_trigger': True, 'no_start_trigger': True, 'optional': True}, 'W-countryside': {'kind': 'triggered', 'timing': 'own_turn_end', 'ability_key': 'own_turn_end', 'reference': '89-world-13-card-text-draft.md#W-countryside', 'semantic_section_sha256': 'c8cb1ea136431159983d4957479a895566ee1a34e675a8a9cf08e5e68d7bdca8', 'arrival_trigger': False, 'no_end_trigger': False, 'no_start_trigger': True, 'optional': True}, 'W-deepsea': {'kind': 'continuous', 'timing': 'continuous', 'ability_key': 'continuous', 'reference': '89-world-13-card-text-draft.md#W-deepsea', 'semantic_section_sha256': 'd42ef3002f697268d8b86ff05819b9b21e7d024b827d61c39d8ef88065db12d2', 'arrival_trigger': False, 'no_end_trigger': True, 'no_start_trigger': True, 'optional': True}, 'M-antlion-02': {'kind': 'activated', 'timing': 'own_turn', 'ability_key': 'activated_main', 'reference': '55-insect-three-lines-card-text-draft.md#M-antlion-02', 'semantic_section_sha256': '4432f70d28f09cb94cc60015178a8b7204e2bc7cb21b25266ff095dd67140346', 'arrival_trigger': False, 'no_end_trigger': True, 'no_start_trigger': True, 'optional': True}, 'M-antlion-08': {'kind': 'activated', 'timing': 'own_turn', 'ability_key': 'activated_main', 'reference': '55-insect-three-lines-card-text-draft.md#M-antlion-08', 'semantic_section_sha256': 'f741ca3a7bb090554d0c08efaef5fb764b47b989f06e5d6d94ef845ae13c646e', 'arrival_trigger': False, 'no_end_trigger': True, 'no_start_trigger': True, 'optional': True}, 'I-c_coin2': {'kind': 'quick', 'timing': 'quick_draw', 'ability_key': 'quick_draw', 'reference': '77-current-items-card-text-draft.md#I-c_coin2', 'semantic_section_sha256': '1e8c796d10d8836f1e762281ec46b9ddb8509fd776ec3689172d2dd2641bee69', 'arrival_trigger': False, 'no_end_trigger': True, 'no_start_trigger': True, 'optional': True}, 'G-hit-blow': {'kind': 'quick', 'timing': 'declared_top_reveal', 'reference': '87-play-batch-5-card-text-draft.md#G-hit-blow', 'semantic_section_sha256': 'eaa5aab413560fd87e67a110df7737d20219edeb185429ce3841a53f224d21bf'}, 'E-final-time': {'kind': 'quick', 'timing': 'targeted_draw_cycle', 'reference': '91-event-21-card-text-draft.md#E-final-time', 'semantic_section_sha256': '53903bdea55bc89432f49328db3116882aaaaa95c0afd07b2e1ef9df557351eb'}, 'C-bat': {'kind': 'triggered', 'timing': 'after_own_quick_on_opponent_turn', 'reference': '72-companion-26-card-text-draft.md#C-bat', 'semantic_section_sha256': 'b30496057c5aa33e95301f879052cecd435d9f9227b39fd7d32ab9661d9a5d21', 'arrival_trigger': False}, 'C-box': {'kind': 'none', 'timing': 'none', 'reference': '72-companion-26-card-text-draft.md#C-box', 'semantic_section_sha256': '3014d6d1d5f5075630495a400f5e2f85f1f7137c961e4255125609b02efd6e3c', 'arrival_trigger': False}, 'C-cat_friend': {'kind': 'activated', 'timing': 'own_turn', 'reference': '72-companion-26-card-text-draft.md#C-cat_friend', 'semantic_section_sha256': '41b133fc4248abc95361a57dda56978e1c017e76af74322ca8cbd92ce9cc8880', 'arrival_trigger': False}, 'C-chameleon': {'kind': 'continuous', 'timing': 'world_conditional', 'reference': '72-companion-26-card-text-draft.md#C-chameleon', 'semantic_section_sha256': '378303c062fa997a7ce41c4f1bc5267c4489cbb017b517008a323cd993d21918', 'arrival_trigger': False}, 'C-chicken': {'kind': 'triggered', 'timing': 'own_turn_start', 'reference': '72-companion-26-card-text-draft.md#C-chicken', 'semantic_section_sha256': 'dd38e4070287ae91da33013c018336d70216fb86a7473de0e3631402096cbec0', 'arrival_trigger': False}, 'I-poop1': {'kind': 'triggered', 'timing': 'opponent_main_removal_activation', 'no_start_trigger': True, 'no_end_trigger': True, 'reference': '77-current-items-card-text-draft.md#I-poop1', 'semantic_section_sha256': '96724ce1817cc70cb9946f7e357d70398b611a3d915070df0ceb47f117b06a9e', 'arrival_trigger': False}}
for partner in ('P-cat_ceo','P-anglerfish','P-cliff_goat','P-desert_scorpion'):
 CAPABILITIES[partner].update(no_start_trigger=True,no_end_trigger=partner!='P-desert_scorpion')
CAPABILITIES['I-sleepboost1']=dict(kind='triggered',timing='own_turn_end',ability_key='own_turn_end',reference='77-current-items-card-text-draft.md#I-sleepboost1',semantic_section_sha256='6ba7680e749bdc12f08b93f0f7fe7d536bb7a9bfc43d577155156d371ae93511',arrival_trigger=False,no_start_trigger=True,no_end_trigger=False,optional=True)
CAPABILITIES['I-bond1']=dict(kind='replacement',timing='companion_departure',ability_key='protect_companion',reference='77-current-items-card-text-draft.md#I-bond1',semantic_section_sha256='321a29ac4ba65f55f4a5ded3ac707cfe2903ccd14dab5d2906f1114ebe21e578',arrival_trigger=False,no_start_trigger=True,no_end_trigger=True)
CAPABILITIES['E-first-date']=dict(kind='quick',timing='targeted_relationship_growth',base_time_cost=1,reference='91-event-21-card-text-draft.md#E-first-date',semantic_section_sha256='72b9b1f635773aee18f6b9a20f3d44e83537dca93fccd18542d7a2295f97d193')
actions_base_response = actions.response_inventory
RESPONSE_FULL_CURRENT=None
RESPONSE_FULL_RUNTIME=None
RELATIONSHIP_SOURCE_SHA = 'd95ee407ec1fb853a8da1102bf933a5e972e3bc6ecc0b78cfb20831e8c45ec71'


def classification(card):
 if card not in CAPABILITIES:raise ValueError('batch capability unproved: '+card)
 row=copy.deepcopy(CAPABILITIES[card]);body,digest=rules.source_section(row['reference'])
 if hashlib.sha256(body.encode()).hexdigest()!=row.pop('semantic_section_sha256'):
  raise ValueError('batch canonical semantic section changed: '+card)
 return dict(row,source_raw_sha256=digest)


def ready(envelope,action,history=None):
 state.validate(envelope);c=envelope['legacy_continuation'];g=c['game_state']
 if g['phase']!='normal_action' or c['pending_triggers'] or c['activation_zone'] or any(p['growth']>=100 or p['reservations'] for p in g['players'].values()):
  raise ValueError('batch upper-priority/pending boundary unproved')
 inv=candidates.audit(envelope,history or [])
 if not any(state.canonical_sha256(a)==state.canonical_sha256(action) for a in inv['legal_candidate_details']):
  raise ValueError('batch action differs from complete current inventory')
 return g,g['players'][g['turn_player']]


def outcome(envelope,action,history=None):
 g,p=ready(envelope,action,history);kind=action['action_type'];cost=0;growth=0
 if kind=='challenge':
  import proxy_continuation_challenge as challenge
  return challenge.declaration_proof(envelope,action,history)
 if kind=='relationship':
  body=(rules.ROOT/'01-core-rules.md').read_bytes()
  if hashlib.sha256(body).hexdigest()!=RELATIONSHIP_SOURCE_SHA:raise ValueError('relationship canonical rule changed')
  stage=p['board']['partner_stage'];source=p['board']['partner']
  if not p['board']['main'] or source is None or p['relationship_progressed'] or stage not in (0,1,2,3) or p['time']<1:
   raise ValueError('relationship preconditions differ')
  if action['candidate_variant']!=('0-to-1','1-to-2','2-to-3','3-to-marriage')[stage]:raise ValueError('relationship variant differs')
  # All approved partners have no progression/marriage trigger. Bind complete
  # sections rather than infer absence from a selected substring.
  cap=classification(g['cards'][source]['card_id'])
  cost=1;growth=10 if stage==3 else 0
  if p['growth']+growth>=100:raise ValueError('relationship 100 maintenance boundary requires priority proof')
  ref='01-core-rules.md';digest=RELATIONSHIP_SOURCE_SHA
 elif kind=='place_world':
  cap=classification(action['card_id']);source=action['source_instance_id'];ref=cap['reference'];digest=cap['source_raw_sha256']
  entry=next(r for r in rules.table()['cards'] if r['card_id']==action['card_id'])
  template=next(a for a in entry['actions'] if a['action_type']=='place_world')
  if template['base_time_cost']!=2 or template['source_text_reference']!=ref:raise ValueError('world payment/source differs')
  cost=2
 elif kind=='play_main':
  cap=classification(action['card_id']);cost=action['evidence']['payment_time'];source=action['source_instance_id'];ref=cap['reference'];digest=cap['source_raw_sha256']
 elif kind in ('place_partner','place_companion'):
  cap=classification(action['card_id']);source=action['source_instance_id'];ref=cap['reference'];digest=cap['source_raw_sha256']
 elif kind in ('use_item','use_play','use_event') and (action['card_id'] in ('I-c_coin2','G-hit-blow','E-final-time','E-first-date') or CAPABILITIES.get(action['card_id'],{}).get('kind') in ('payment_modifier','stat_modifier','targeted_zone_move','conditional_reward','symmetric_draw_growth','board_count_growth')):
  cap=classification(action['card_id']);source=action['source_instance_id'];ref=cap['reference'];digest=cap['source_raw_sha256']
  cost=cap.get('base_time_cost',2 if action['card_id']=='E-final-time' else 1)
  if action['card_id'] in ('I-c_coin2','G-hit-blow') and p['growth']+5>=100:raise ValueError('uncertain reveal threshold priority requires proof')
 else:raise ValueError('batch outcome unsupported: '+kind)
 return dict(contract_id='normal_immediate_outcome_v2',actor=g['turn_player'],candidate_id=action['candidate_id'],source_instance_id=source,
  payment_time=cost,certain_growth_difference=growth,source_reference=ref,source_raw_sha256=digest,capability=cap,
  view_sha256=state.canonical_sha256(state.visible(envelope,g['turn_player'])),arrival_execution_certified=False)


def _event(before,after,action,proof,kind):
 a=state.current(before);b=state.current(after)
 event=dict(seq=after['event_seq'],action_type=kind,actor=proof['actor'],selected_candidate=action['candidate_id'],
  source_instance_id=proof['source_instance_id'],payment_time=proof['payment_time'],source_reference=proof['source_reference'],
  candidate_variant=action['candidate_variant'],payment_effect_ids=copy.deepcopy(action['evidence'].get('payment_effect_ids',[])),game_state_before_sha256=old.start.opening._stop_state_sha256(a['game_state']),
  game_state_after_sha256=old.start.opening._stop_state_sha256(b['game_state']),continuation_state_before_sha256=old.start._hash(a),continuation_state_after_sha256=old.start._hash(b))
 if kind=='place_world':event['previous_world_instance_id']=before['legacy_continuation']['game_state']['players'][proof['actor']]['board']['world']
 return actions.bind_event(before,after,event)


def arrival_obligation(envelope,action):
 g=envelope['legacy_continuation']['game_state'];p=g['players'][g['turn_player']];cap=classification(action['card_id'])
 if not cap.get('arrival_trigger'):return None
 if action['card_id']=='M-beetle-01' and action['candidate_variant']!='birth':return None
 if action['card_id']=='M-antlion-05' and action['candidate_variant']!='time_skip':return None
 if action['card_id']=='M-antlion-05' and p['board']['prepared']:return None
 if action['card_id']=='M-antlion-04':
  if any(not envelope['runtime']['public_prepared'][s]['face_up'] for s in p['board']['prepared']):return None
  quick={r['card_id'] for r in rules.table()['cards'] if any(a['action_type'].startswith('use_') for a in r['actions'])}
  if not any(g['cards'][s]['card_id'] in quick for s in p['discard']):return None
 return dict(card_id=action['card_id'],timing=cap['timing'],source_reference=cap['reference'])


NORMAL_CARD_EVENTS={'play_main_birth','main_movement','place_companion','place_partner','person_placement','relationship_start','place_world','attach_item','set_item','use_item','use_play','use_event','activate_response'}


def turn_card_count(game,events,actor,through=None):
 starts=[e['seq'] for e in events if e['actor']==actor and e['action_type'] in ('turn_start_and_egg_draw','turn_start_and_normal_draw')]
 if not starts:raise ValueError('current turn card history unavailable')
 lower=max(starts);upper=through if through is not None else events[-1]['seq']
 return sum(e['actor']==actor and lower<e['seq']<=upper and e['action_type'] in NORMAL_CARD_EVENTS and e.get('source_zone') not in ('board','prepared') for e in events)


def response_play_occurrences(current,events,actor,quick_only=False):
 """The119 window anchor and each played-card occurrence have distinct roles."""
 g=(RESPONSE_FULL_CURRENT or current)['game_state'];anchor=current['response_context']['origin_event_seq']
 if not any(e['seq']==anchor for e in events):raise ValueError('response origin history unavailable')
 rows=old.start.load_candidate_rows();result=[]
 for event in events:
  if event['seq']<anchor or event['actor']!=actor or event['action_type'] not in NORMAL_CARD_EVENTS or event.get('source_zone') in ('board','prepared'):continue
  if quick_only:
   if event['action_type'] not in ('activate_response','use_item','use_play','use_event'):continue
   card=g['cards'].get(event.get('source_instance_id'),{}).get('card_id')
   if card not in rows:raise ValueError('quick trigger source identity unavailable')
   if not any(a['action_type'] in ('use_item','use_play','use_event') for a in rows[card]['actions']):continue
  result.append(event)
 return result


def guard_applied_effect(current,event,history,link=None):
 """Reject positive unconnected effect-applied obligations, without new windows."""
 if not event['action_type'].startswith('resolve'):return
 g=current['game_state'];actor=event['actor'];p=g['players'][actor];main=p['board']['main']
 if actor!=g['turn_player'] or main is None:return
 card=g['cards'][main]['card_id'];cap=CAPABILITIES.get(card)
 if not cap or cap['timing']!='after_own_quick_effect_applied':return
 classification(card)
 if not any(g['cards'][s]['card_id'].startswith('W-') for s in p['hand']) or not any(g['cards'][s]['card_id'].startswith('W-') for s in p['discard']):return
 source=event.get('source_instance_id');quickcard=g['cards'].get(source,{}).get('card_id');rows=old.start.load_candidate_rows()
 if quickcard not in rows or not any(a['action_type'] in ('use_item','use_play','use_event') for a in rows[quickcard]['actions']):return
 if link is None:
  link=next((e for e in reversed(history) if e.get('chain_link_id')==event.get('chain_link_id') and e.get('source_instance_id')==source and e['action_type'] in ('activate_response','use_item','use_play','use_event')),None)
 if link is None:raise ValueError('post-resolution obligation quick-play provenance unavailable: '+card+' '+cap['reference'])
 if link.get('source_zone') in ('board','prepared') or link['action_type'] not in ('activate_response','use_item','use_play','use_event'):return
 receipt=event.get('created_effect',event.get('result',{}))
 if receipt.get('effect_applied') is False:return
 positive=receipt.get('effect_applied') is True or receipt.get('effect_id') or receipt.get('growth_added',0)>0 or any(receipt.get(k) for k in ('drawn_instance_id','drawn_instance_ids','drawn_instance_ids_by_actor','revealed_card_type','revealed_card_id','revealed_instance_id','returned_discard_to_deck_bottom','returned_instance_id','target_instance_id'))
 reason='eligible' if positive else 'effect application unproved'
 raise ValueError('post-resolution obligation '+reason+': '+card+' '+cap['reference'])


def guard_resolution_result(envelope,result,history):
 prior=envelope['legacy_continuation'];prefix=list(history)
 for index,event in enumerate(result['new_events']):
  current=(result['new_envelopes'][index]['legacy_continuation'] if 'new_envelopes' in result else result['new_snapshots'][index]['continuation_state'])
  link=next((l for l in prior['activation_zone'] if l.get('link_id')==event.get('chain_link_id') and l.get('source_instance_id')==event.get('source_instance_id')),None)
  guard_applied_effect(current,event,prefix,link);prefix.append(event);prior=current


def response_capability(current,events,source,slot):
 g=(RESPONSE_FULL_CURRENT or current)['game_state'];ctx=current['response_context'];actor=ctx['priority_actor'];p=g['players'][actor];card=g['cards'][source]['card_id'];cap=classification(card)
 origin=next((e for e in events if e['seq']==ctx['origin_event_seq']),None)
 if origin is None:raise ValueError('response origin history unavailable')
 eligible=False
 if card=='W-city':
  eligible=actor==g['turn_player'] and any(turn_card_count(g,events,actor,e['seq'])==2 for e in response_play_occurrences(current,events,actor))
 elif card=='M-antlion-03':
  eligible=actor!=g['turn_player'] and bool(response_play_occurrences(current,events,g['turn_player'],quick_only=True)) and any(not RESPONSE_FULL_RUNTIME['public_prepared'][s]['face_up'] for s in p['board']['prepared'])
 elif card=='M-antlion-06':
  for event in events:
   if event['seq']>=ctx['origin_event_seq']:guard_applied_effect(dict(current,game_state=g),event,[e for e in events if e['seq']<event['seq']])
 elif card=='P-cliff_goat':
  previous=origin.get('previous_world_instance_id');eligible=origin['action_type']=='place_world' and origin['actor']==actor and p['board']['main'] is not None and previous is not None and g['cards'][previous]['card_id']!=g['cards'][origin['source_instance_id']]['card_id']
 elif card in ('M-antlion-04','M-antlion-05','M-beetle-01'):
  eligible=origin['action_type']=='main_movement' and origin.get('source_instance_id')==source and cap['arrival_trigger']
 elif cap['timing'] not in ('own_turn_end','own_challenge','continuous'):
  raise ValueError('response capability trigger condition unavailable: '+card)
 if eligible:raise ValueError('eligible board activation/response obligation: '+card)
 return dict(source_instance_id=source,card_id=card,reason_code='trigger_condition_not_met',source_reference=cap['reference'],source_raw_sha256=cap['source_raw_sha256'])


def transition(envelope,action,history=None):
 proof=outcome(envelope,action,history);g,p=ready(envelope,action,history);actor=proof['actor'];kind=action['action_type']
 for x in g['players'].values():
  if x['board']['world']:classification(g['cards'][x['board']['world']]['card_id'])
 after=copy.deepcopy(envelope);after['event_seq']+=1;b=after['legacy_continuation']['game_state']['players'][actor]
 if kind=='relationship':
  stage=b['board']['partner_stage'];b['board']['partner_stage']='married' if stage==3 else stage+1
  b['time']-=1;b['growth']+=proof['certain_growth_difference'];b['relationship_progressed']=True
  eventkind='relationship_marriage' if stage==3 else 'relationship_progress'
 elif kind=='place_world':
  if history is None:raise ValueError('world placement needs verified turn history')
  previous_world=b['board']['world']
  if previous_world:
   classification(g['cards'][previous_world]['card_id']);b['discard'].append(previous_world)
  b['hand'].remove(action['source_instance_id']);b['board']['world']=action['source_instance_id'];b['time']-=proof['payment_time'];eventkind='place_world'
 elif kind=='place_partner':
  if b['board']['partner'] or b['person_placed']:raise ValueError('new relationship source differs')
  source=action['source_instance_id'];b['hand'].remove(source);b['board'].update(partner=source,partner_stage=0);b['person_placed']=True;eventkind='relationship_start'
  if action['card_id']=='P-cat_ceo' and b['board']['main']:after['legacy_continuation']['pending_triggers']=[f"mandatory:{after['event_seq']}:{source}"]
 elif kind=='place_companion':
  if b['person_placed'] or len(b['board']['companions'])>=3:raise ValueError('companion replacement requires shared departure proof')
  source=action['source_instance_id'];b['hand'].remove(source);b['board']['companions'].append(source);b['person_placed']=True;eventkind='person_placement'
 elif kind=='play_main':
  source=action['source_instance_id'];current=b['board']['main']
  if current:
   for equipment,row in list(after['runtime']['attachments'].items()):
    if row['target_instance_id']!=current:continue
    cap=rules.classification(g['cards'][equipment]['card_id'])
    if cap['timing'] not in ('own_turn_start','own_turn_end'):raise ValueError('movement equipment departure obligations unproved')
   after=state.detach_target(after,current);g=after['legacy_continuation']['game_state'];b=g['players'][g['turn_player']]
   classification(g['cards'][current]['card_id']) if g['cards'][current]['card_id'] in CAPABILITIES else rules.classification(g['cards'][current]['card_id'])
   b['discard'].append(current)
   if 'stat_effects' in after['runtime']:after['runtime']['stat_effects']=[r for r in after['runtime']['stat_effects'] if r['target_instance_id']!=current]
   if 'conditional_effects' in after['runtime']:after['runtime']['conditional_effects']=[r for r in after['runtime']['conditional_effects'] if r['target_instance_id']!=current]
  b['hand'].remove(source);b['board']['main']=source;b['time']-=proof['payment_time'];eventkind='main_movement'
  if action['evidence'].get('payment_effect_ids'):
   after['runtime']['payment_effects']=[r for r in after['runtime']['payment_effects'] if r['effect_id'] not in action['evidence']['payment_effect_ids']]
 else:raise ValueError('batch transition unsupported: '+kind)
 actions._placement_window(after,actor)
 # Existing response contract returns to this named opportunity, not a phase.
 after['legacy_continuation']['return_target']='normal_action_opportunity'
 state.validate(after);return after,[_event(envelope,after,action,proof,eventkind)]


@contextmanager
def scope(evidence=None):
 originals=(copy.deepcopy(rules.CAPABILITIES),candidates._scores,actions.apply,end.end_classification,end.verify_new_events,actions.response_inventory,old.reached_response.enumerate_opportunity,rules.classification,candidates.ADMITTED_ID_ADAPTER,candidates._borrow_problem,candidates.UNIT_ADJUDICATOR,end.END_INVENTORY_CANONICALIZER)
 try:
  end.END_INVENTORY_CANONICALIZER=end.canonical_end_inventory
  for card in CAPABILITIES:classification(card)
  rules.CAPABILITIES.update(copy.deepcopy(CAPABILITIES))
  rules.classification=lambda card:classification(card) if card in CAPABILITIES else originals[7](card)
  candidates.ADMITTED_ID_ADAPTER=qualify_ids;candidates.UNIT_ADJUDICATOR=adjudicate_source_unit
  def borrow(envelope,inventory,inputs):
   try:return originals[9](envelope,inventory,inputs)
   except ValueError as error:
    if str(error) in ('229 paid permanent effect unclassified','229 paid action unclassified','candidate_id_collision','candidate identity collision'):return None
    raise
  candidates._borrow_problem=borrow
  def scores(envelope,inventory):
   extra=[a for a in inventory['legal_candidate_details'] if a['action_type'] in ('relationship','challenge') or
    (a['action_type'] in ('play_main','place_world','use_item','use_play','use_event') and a['card_id'] in CAPABILITIES) or
    (a['action_type']=='place_partner' and a['card_id']=='P-cat_ceo' and envelope['legacy_continuation']['game_state']['players'][envelope['legacy_continuation']['game_state']['turn_player']]['board']['main']) or
    (a['action_type'] in ('place_companion','place_partner') and any(p['board']['world'] for p in envelope['legacy_continuation']['game_state']['players'].values()))]
   proofs=[outcome(envelope,a,inventory['public_history']) for a in extra];delegated=copy.deepcopy(inventory)
   delegated['legal_candidate_details']=[a for a in delegated['legal_candidate_details'] if a not in extra]
   existing,certs=originals[1](envelope,delegated);byid={s['candidate_id']:s for s in existing}
   g=envelope['legacy_continuation']['game_state'];p=g['players'][g['turn_player']]
   for a,proof in zip(extra,proofs):
    source=proof['source_instance_id'];cost=proof['payment_time']
    byid[a['candidate_id']]=dict(candidate_id=a['candidate_id'],avoid_loss_or_abort=0,maintain_or_prevent_100=0,
     certain_growth_difference=proof['certain_growth_difference'],time_after_certain_resolution=p['time']-cost,payment_time=cost,consumed_card_count=int(a['action_type'].startswith('use_')),card_copy_id=g['cards'][source]['card_copy_id'] if source else '')
    if evidence is not None:evidence.append(dict(event_seq=envelope['event_seq'],proof=proof))
    if a['action_type'] in ('place_companion','place_partner') and not(a['card_id']=='P-cat_ceo' and p['board']['main']):
     cert=old.start.opening._placement_for_card(a['source_instance_id'],g['cards'][a['source_instance_id']],rules.table(),p['board'])
     if cert is not None and cert['candidate_id']==a['candidate_id']:certs.append(cert)
   return [byid[a['candidate_id']] for a in inventory['legal_candidate_details']],certs
  def apply(envelope,record,inputs):
   action=record.get('selected_action',{})
   has_world=any(p['board']['world'] for p in envelope['legacy_continuation']['game_state']['players'].values())
   if action.get('action_type')=='place_partner' and action.get('card_id')!='P-cat_ceo' and not has_world:return originals[2](envelope,record,inputs)
   if action.get('action_type')=='place_companion' and not has_world:return originals[2](envelope,record,inputs)
   if action.get('action_type')!='relationship' and not(action.get('action_type') in ('play_main','place_world','place_partner','place_companion') and action.get('card_id') in CAPABILITIES):return originals[2](envelope,record,inputs)
   rebuilt=candidates.select(envelope,record['inventory'],record['context'],record['policy_id'],inputs)
   if rebuilt!=record:raise ValueError('batch decision reconstruction differs')
   return transition(envelope,action,inputs.get('public_events'))
  def endclass(card):
   if card in CAPABILITIES and CAPABILITIES[card].get('no_end_trigger'):return classification(card)
   return originals[3](card)
  def verify(events,shots,runtime):
   byseq={e['event_seq']:e for e in runtime};projected=copy.deepcopy(events);proofs=[]
   for event,row in zip(events,projected):
    if event['seq'] in byseq and event['seq']-1 in byseq:
     link=next((l for l in byseq[event['seq']-1]['legacy_continuation']['activation_zone'] if l.get('link_id')==event.get('chain_link_id') and l.get('source_instance_id')==event.get('source_instance_id')),None)
     guard_applied_effect(byseq[event['seq']]['legacy_continuation'],event,[e for e in events if e['seq']<event['seq']],link)
    if event['action_type'] not in ('main_movement','relationship_progress','relationship_marriage','relationship_start','person_placement','place_world'):continue
    prior=byseq[event['seq']-1];actual=byseq[event['seq']]
    history=[e for e in events if e['seq']<event['seq']]
    inv=candidates.audit(prior,history);action=next((a for a in inv['legal_candidate_details'] if a['candidate_id']==event['selected_candidate']),None)
    if action is None:raise ValueError('batch history action absent')
    expected,generated=transition(prior,action,[e for e in events if e['seq']<event['seq']]);raw={k:v for k,v in generated[0].items() if k not in end.BIND_KEYS}
    if expected!=actual or raw!=event:raise ValueError('batch independent provenance replay differs')
    proof=outcome(prior,action,history);proofs.append(dict(event_seq=event['seq'],card_id=prior['legacy_continuation']['game_state']['cards'][proof['source_instance_id']]['card_id'],kind=event['action_type'],source_reference=proof['source_reference'],source_raw_sha256=proof['source_raw_sha256'],certain_growth_difference=proof['certain_growth_difference']))
   return originals[4](projected,shots,runtime)+proofs
  candidates._scores=scores;actions.apply=apply;end.end_classification=endclass;end.verify_new_events=verify
  old.reached_response.enumerate_opportunity=lambda current,events:originals[6](current,events,capability_classifier=response_capability)
  # Use the equipment-aware bridge directly; its generic inventory now has
  # independent source-bound board classifiers before any internal projection.
  # The outer worlds.scope response wrapper belongs to an earlier coverage
  # edition. Current coverage delegates through the shared equipment bridge.
  def response(envelope,initial,events):
   global RESPONSE_FULL_CURRENT,RESPONSE_FULL_RUNTIME
   previous=RESPONSE_FULL_CURRENT;previous_runtime=RESPONSE_FULL_RUNTIME;RESPONSE_FULL_CURRENT=previous or state.current(envelope);RESPONSE_FULL_RUNTIME=previous_runtime or envelope['runtime']
   try:
    if not envelope['runtime']['public_prepared']:return old._generic_response_opportunity(state.current(envelope),initial,events)
    return actions_base_response(envelope,initial,events)
   finally:RESPONSE_FULL_CURRENT=previous;RESPONSE_FULL_RUNTIME=previous_runtime
  actions.response_inventory=response
  yield
 finally:
  rules.CAPABILITIES.clear();rules.CAPABILITIES.update(originals[0]);candidates._scores=originals[1];actions.apply=originals[2];end.end_classification=originals[3];end.verify_new_events=originals[4];actions.response_inventory=originals[5];old.reached_response.enumerate_opportunity=originals[6];rules.classification=originals[7];candidates.ADMITTED_ID_ADAPTER=originals[8];candidates._borrow_problem=originals[9];candidates.UNIT_ADJUDICATOR=originals[10];end.END_INVENTORY_CANONICALIZER=originals[11]


def adjudicate_source_unit(envelope,unit):
 import proxy_continuation_payments as payments
 if unit['card_id'] not in payments.BOARD_COUNT_CARDS or unit['action_type']!='use_play':return None
 descriptor=payments.BOARD_COUNT_CARDS[unit['card_id']];payments.capability(unit['card_id']);template=unit['template'];game=envelope['legacy_continuation']['game_state'];actor=game['turn_player'];count=payments.board_count(game,actor)
 if template['target_rule']!='no target' or template['base_time_cost']!=descriptor['base_time_cost'] or template['source_text_reference']!=descriptor['reference']:raise ValueError('board count registered contract differs')
 variant=unit['candidate_variant'];reasons=[]
 if variant not in ('seven_or_eight_cards','nine_or_more_cards'):raise ValueError('board count variant unknown')
 met=descriptor['minimum']<=count<descriptor['bonus_minimum'] if variant=='seven_or_eight_cards' else count>=descriptor['bonus_minimum']
 if not met:reasons.append('board_count_requirement_unmet')
 if game['players'][actor]['time']<descriptor['base_time_cost']:reasons.append('insufficient_time')
 return [candidates._detail(unit,reasons,f"candidate-use_play-{unit['source_instance_id']}-{variant}",board_card_count=count,payment_time=descriptor['base_time_cost'])]


def qualify_ids(envelope,rows,history=None):
 if history:guard_applied_effect(envelope['legacy_continuation'],history[-1],history[:-1])
 import proxy_continuation_payments as payments
 result=[];rebuilt=set();game=envelope['legacy_continuation']['game_state'];actor=game['turn_player'];player=game['players'][actor]
 for original in rows:
  if original['card_id'] not in payments.TARGETED_CARDS or original['action_type']!='use_play':
   result.append(copy.deepcopy(original));continue
  key=(original['source_instance_id'],original['action_type'])
  if key in rebuilt:continue
  rebuilt.add(key);descriptor=payments.TARGETED_CARDS[original['card_id']]
  targets=payments.equipment_targets(game,envelope['runtime'],actor,original['card_id']) if not descriptor.get('requires_world',True) or player['board']['world'] else []
  reasons=[]
  if descriptor.get('requires_world',True) and not player['board']['world']:reasons.append('requires_own_world')
  if player['time']<descriptor['base_time_cost']:reasons.append('insufficient_time')
  if not targets:reasons.append('required_public_equipment_target_absent')
  for target in targets or [None]:
   row=copy.deepcopy(original);row['target_instance_ids']=[target] if target else []
   row['enumeration_unit_id']=json.dumps([row['source_family'],row['source_zone'],row['source_id'],row['action_type'],row['candidate_variant'],row['target_instance_ids']],ensure_ascii=False,separators=(',',':'))
   row.update(reason_codes=list(reasons),disposition='excluded' if reasons else 'admitted',candidate_id=None if reasons else f"candidate-{row['action_type']}-{row['source_instance_id']}-target-{target}",evidence={'payment_time':descriptor['base_time_cost']})
   result.append(row)
 for row in result:
  if row['disposition']=='admitted' and row['action_type'] in ('use_event','use_play','use_item'):
   template=next(a for r in rules.table()['cards'] if r['card_id']==row['card_id'] for a in r['actions'] if a['action_type']==row['action_type'])
   if template['timing']!='normal_action_opportunity':
    row.update(disposition='excluded',candidate_id=None,reason_codes=['outside_registered_action_timing']);row['evidence']['registered_timing']=template['timing'];continue
   import proxy_continuation_conditions as conditions
   game=envelope['legacy_continuation']['game_state'];actor=game['turn_player'];proof=conditions.prove(row['card_id'],game,actor)
   if proof is not None and proof['status']=='unmet':
    row.update(disposition='excluded',candidate_id=None,reason_codes=[conditions.PREREQUISITES[row['card_id']]['reason']]);row['evidence']['condition_proof']=proof;continue
   if row['card_id']=='G-beach-volley':
    proof=__import__('proxy_continuation_public_history').companion_applied(game,history or [],actor)
    if not proof['condition_met']:
     row.update(disposition='excluded',candidate_id=None,reason_codes=['requires_applied_companion_ability_this_turn']);row['evidence']['condition_proof']=proof;continue
   if row['card_id']=='E-final-time' and history is not None:
    import proxy_continuation_quick as quick
    details,reason=quick.hand_candidates(state.current(envelope),history,actor,row['source_instance_id'],old.start.load_candidate_rows()[row['card_id']])
    if not any(d['target_instance_ids']==row['target_instance_ids'] for d in details):
     row.update(disposition='excluded',candidate_id=None,reason_codes=[reason['reason_code']]);row['evidence']['condition_proof']=reason;continue
  if row['disposition']!='admitted' or row['action_type']!='use_play' or row['card_id']!='G-hit-blow':continue
  classification(row['card_id']);entry=next(r for r in rules.table()['cards'] if r['card_id']==row['card_id']);template=next(a for a in entry['actions'] if a['action_type']=='use_play')
  if template['target_rule']!='declare one of seven card types; no card target' or row['candidate_variant'] not in template['candidate_variants'] or row['target_instance_ids']:raise ValueError('declaration ID source differs')
  row['candidate_id']=f"candidate-use_play-{row['source_instance_id']}-declare-{row['candidate_variant']}"
 return result
