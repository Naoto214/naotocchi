"""Independent107 deal/first-turn projection into the fresh connected trace.

An auditor, not a dealer or selector. No sampled material, source producer call,
policy promotion, saved-proof authentication, or external input provenance.
"""
import copy,hashlib
import proxy_population_opening as opening
from proxy_mandatory_policy_contract import canonical


def digest(value):return hashlib.sha256(canonical(value)).hexdigest()

def same(actual,expected,label):
 if canonical(actual)!=canonical(expected):raise ValueError('initial obligations differ: '+label)

def snapshot(game):return {k:copy.deepcopy(v) for k,v in game.items() if k!='cards'}


def audit(record,bundle):
 errors=[];actor=None;selected=None;initial_hash=None;final_hash=None
 try:
  opening.verify_sources() # Existing immutable01/02/64/107/465 source anchors.
  prefix=record['opening'];mid=record['binding']['match_id']
  rows=[r for r in bundle['matches'] if r['match_id']==mid]
  if len(rows)!=1:raise ValueError('initial obligations match absent or ambiguous')
  row=rows[0];groups=[g for g in bundle['groups'] if g['group_id']==row['group_id']]
  if len(groups)!=1:raise ValueError('initial obligations group absent or ambiguous')
  group=groups[0];actor=row['first_player']
  if actor not in ('A','B'):raise ValueError('initial obligations actor unknown')
  cards={};players={};orders={}
  for owner in ('A','B'):
   ordered=group['full_order_'+owner]
   if len(ordered)!=40:raise ValueError('initial obligations deck denominator differs')
   ids=[c['initial_instance_id'] for c in ordered];orders[owner]=ids
   if len(set(ids))!=40 or any(s in cards for s in ids):raise ValueError('initial obligations duplicate physical source')
   cards.update({c['initial_instance_id']:copy.deepcopy(c) for c in ordered})
   players[owner]=dict(time=0,growth=20,hand=ids[:5],deck=ids[5:],discard=[],
    board=dict(main=None,companions=[],partner=None,partner_stage=None,world=None,prepared=[]),
    reservations=[],challenge_used=False,person_placed=False,relationship_progressed=False)
  initial=dict(round=0,turn_player=None,phase='before_match',players=players,cards=cards)
  same(prefix['initial']['initial_game_state'],initial,'manifest ordered initial deal')
  same(prefix['initial']['first_player'],actor,'first player')
  intermediate=copy.deepcopy(initial);intermediate.update(round=1,turn_player=actor,phase='egg_exchange_choice')
  intermediate['players'][actor].update(time=1,hand=orders[actor][:6],deck=orders[actor][6:])
  same(prefix['normal_draw_intermediate'],intermediate,'first ordinary draw')
  choice=copy.deepcopy(intermediate);choice['players'][actor].update(hand=orders[actor][:7],deck=orders[actor][7:])
  application=prefix['mandatory_record']['local_record']['application'];boundary=application['boundary']
  same(boundary['choice_game_state'],choice,'first egg draw')
  ids=sorted(cards[s]['card_copy_id'] for s in orders[actor][:7])
  same(boundary['candidate_ids'],ids,'first seven physical choices')
  selected=application['selected_candidate'];matches=[s for s in orders[actor][:7] if cards[s]['card_copy_id']==selected]
  if len(matches)!=1:raise ValueError('initial obligations selected physical source differs')
  returned=matches[0];after=copy.deepcopy(choice);after['players'][actor]['hand'].remove(returned);after['players'][actor]['deck'].append(returned)
  same(application['local_after_game_state'],after,'private egg bottom movement')
  after['phase']='response_window';final=prefix['final_envelope'];c=final['legacy_continuation']
  same(c,dict(game_state=after,activation_zone=[],pending_triggers=[],return_target='normal_action_opportunity',
   response_context=dict(source_phase='response_window',phase='response_window',window_kind='turn_start',origin_event_seq=2,turn_player=actor,priority_actor=actor,chain_status='empty',chain_links=[],consecutive_passes=0,response_opportunity_index=1,decision_kind='response_action',choice_kind='reaction_or_pass')),'first response boundary')
  same(final['event_seq'],2,'first response sequence')
  same(final['runtime'],dict(attachments={},ability_uses=[],public_prepared={}),'initial public source absence')
  address=[actor,1,actor,'turn_start',0,'egg_exchange_bottom','selection',0]
  same(prefix['opening_obligations'],dict(schema='initial_turn_obligations_466.v1',scope='107_initial_prefix_only',rules=['01-core-rules.md','02-main-system.md','64-turn-boundaries-and-victory-timing.md'],turn_counts={a:1 if a==actor else 0 for a in ('A','B')},steps=[dict(kind='first_turn_reset',actor=actor,time=1),dict(kind='ordinary_draw',actor=actor,instance_id=orders[actor][5]),dict(kind='egg_additional_draw',actor=actor,instance_id=orders[actor][6]),dict(kind='mandatory_choice',address=address,candidate_ids=ids),dict(kind='response_boundary',actor=actor,event_seq=2)],opening_reservations=[],opening_board_trigger_sources=[]),'initial opportunity sequence')
  states=[snapshot(g) for g in (initial,choice,after)]
  same(prefix['snapshots'],[dict(seq=i,state_sha256=digest(g),state=g) for i,g in enumerate(states)],'initial actual snapshots')
  events=[]
  for seq,kind,source in ((1,'turn_start_and_egg_draw',None),(2,'egg_exchange_bottom',returned)):
   events.append(dict(seq=seq,round=1,actor=actor,action_type=kind,decision_id=None if seq==1 else mid+':first-egg-choice',source_instance_id=source,payment=dict(time=0,hand_to_discard=[],prepared_to_discard=[],deck_to_bottom=[]),targets=[],chain=None,reservations_created=[],reservations_consumed=[],instance_transitions=[],state_before_sha256=digest(states[seq-1]),state_after_sha256=digest(states[seq])))
  same(prefix['events'],events,'initial actual events')
  initial_hash=digest(initial);final_hash=digest(final)
 except (ValueError,KeyError,TypeError,IndexError,AttributeError,OSError) as error:errors.append(str(error))
 return dict(schema='bound107_initial_obligations.v1',initial_deal_and_first_opportunities_verified=not errors,errors=errors,
  actor=actor,initial_game_state_sha256=initial_hash,final_envelope_sha256=final_hash,
  scope='supplied_manifest_to_initial_response_only',source_manifest_sha256=opening.SOURCES_SHA,
  external_input_provenance_verified=False,all_rule_opportunities_proven=False,information_use_proven=False,
  policy_eligible=None,balance_admitted=None,preflight_ready=False)
