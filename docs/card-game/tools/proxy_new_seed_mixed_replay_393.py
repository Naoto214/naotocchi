#!/usr/bin/env python3
"""Audit current responses and replay the canonical decisions at 392."""
import argparse,copy,hashlib,json,sys
from pathlib import Path
sys.setrecursionlimit(max(sys.getrecursionlimit(),4000))
import proxy_new_seed_mixed_replay_392 as source
import proxy_new_seed_mixed_replay_391 as prior
import proxy_new_seed_start_choice_188 as board_choice
import proxy_response_window_seeded_restart as response
import proxy_new_seed_ability_activation_190 as board_activation
import proxy_new_seed_mixed_replay_379 as response_pass
import proxy_new_seed_chain_pass_172 as snapshots
import proxy_start_response_138 as start
import proxy_new_seed_start_audit_206 as hand
import proxy_new_seed_start_audit_166 as conditional
import proxy_board_trigger_audit_144 as timing
def audit_response(row):
    state = row['final_continuation_state']
    game, ctx = state['game_state'], state['response_context']
    path, actor = row['path_id'], ctx['priority_actor']
    expected = {'probe-01-b-first': ('response_window','turn_start','A','A','empty',0,0),
        'probe-02-a-first': ('post_placement_response','after_normal_action','A','A','empty',0,0)}
    if (path not in expected or
            (game['phase'], ctx['window_kind'], actor, ctx['turn_player'], ctx['chain_status'],
             ctx['consecutive_passes'], len(state['activation_zone'])) != expected[path] or
            state['pending_triggers']):
        raise ValueError('389 response boundary differs')
    owner = game['players'][actor]
    board = owner['board']
    projected = copy.deepcopy(state)
    entries = start.load_candidate_rows()
    removed = []
    for instance in owner['hand']:
        card_id = game['cards'][instance]['card_id']
        entry = entries.get(card_id)
        if entry is None:
            raise ValueError('389 unregistered hand card')
        exclusion = hand.extra_hand_exclusion(card_id, entry, game, actor)
        if exclusion is None and card_id == 'E-boss':
            section = hand.source_section('91-event-21-card-text-draft.md', card_id)
            if (board['main'] is not None or
                    'このターン、自分のメインが勝負に負けていた場合に発動できる' not in section):
                raise ValueError('389 boss opponent-turn condition differs')
            exclusion = {'card_id':card_id,'reason_code':'requires_own_main_battle_loss_this_turn',
                         'source_reference':'91-event-21-card-text-draft.md#E-boss'}
        if exclusion is None and card_id == 'G-animal-shogi':
            section = hand.source_section('83-play-batch-3-card-text-draft.md', card_id)
            if ('自分の捨て札のなかま1枚を対象' not in section or
                    any(game['cards'][x]['card_id'].startswith('C-') for x in owner['discard'])):
                raise ValueError('389 animal shogi target differs')
            exclusion = {'card_id':card_id,'reason_code':'requires_own_discarded_companion'}
        action = next((x for x in entry['actions'] if x['action_type'] in ('use_play','use_item','use_event')), None)
        if exclusion is None and action is not None and owner['time'] >= action['base_time_cost']:
            exclusion = conditional.conditional_exclusion(card_id, game, actor)
        if exclusion is None and action is not None and action['target_rule'] == 'one own main':
            filename, section_id = action['source_text_reference'].split('#', 1)
            if section_id != card_id or '自分のメイン1枚を対象' not in hand.source_section(filename, section_id):
                raise ValueError('389 own main target text differs')
            exclusion = {'card_id':card_id,'reason_code':'requires_own_main_target'}
        if exclusion:
            projected['game_state']['players'][actor]['hand'].remove(instance)
            removed.append({'source_instance_id':instance, **exclusion})
    excluded = []
    board_candidates = []
    for instance in board['companions']:
        card_id = game['cards'][instance]['card_id']
        section = hand.source_section('72-companion-26-card-text-draft.md', card_id)
        if card_id == 'C-cat_friend':
            if ('自分の捨て札の「きまぐれなねこ」以外のなかまカード1枚を対象' not in section or
                    any(game['cards'][x]['card_id'].startswith('C-') for x in owner['discard'])):
                raise ValueError('389 cat friend target differs')
            reason = 'requires_other_discarded_companion'
        elif card_id == 'C-box':
            if '能力なし。' not in section:
                raise ValueError('389 box text differs')
            reason = 'no_ability'
        elif card_id == 'C-chicken' and path == 'probe-01-b-first':
            trigger=timing.TRIGGERS.get(card_id)
            if (not owner['deck'] or trigger is None or any(fragment not in section for fragment in trigger[1:]) or
                    row['new_events'][0]['action_type']!='egg_exchange_bottom' or
                    ctx['origin_event_seq']!=row['last_valid_event_seq'] or
                    not timing.matches(card_id,'turn_start',actor,ctx['turn_player'],'turn_start',actor)):
                raise ValueError('389 chicken start trigger differs')
            board_candidates.append({'candidate_id':'response-activate-ability-'+instance,
                'candidate_family':'triggered_ability','action_type':'activate_board_ability',
                'source_instance_id':instance,'card_id':card_id,
                'source_references':['72-companion-26-card-text-draft.md#'+card_id]})
            reason=None
        elif card_id in ('C-bat','C-chicken'):
            trigger = timing.TRIGGERS.get(card_id)
            if trigger is None or any(fragment not in section for fragment in trigger[1:]):
                raise ValueError('389 board trigger text differs')
            if timing.matches(card_id,ctx['window_kind'],actor,ctx['turn_player'],
                              row['new_events'][0]['action_type'],row['new_events'][0]['actor']):
                raise ValueError('389 board trigger unexpectedly met')
            reason = 'trigger_condition_not_met'
        else:
            raise ValueError('389 unclassified companion')
        projected['game_state']['players'][actor]['board']['companions'].remove(instance)
        if reason:excluded.append({'source_instance_id':instance,'card_id':card_id,'reason_code':reason})
    partner = board['partner']
    if partner:
        card_id = game['cards'][partner]['card_id']
        section = hand.source_section('74-partner-18-card-text-draft.md',card_id)
        if card_id == 'P-cat_ceo' and '交際を始めた時、発動する' in section:
            reason = 'relationship_start_event_not_met'
        elif card_id == 'P-cliff_goat' and '初配置・同名上書き' in section and board['world'] is None:
            reason = 'different_world_replacement_not_met'
        elif card_id == 'P-anglerfish' and '自分のメインが自分からちょうせんする時' in section:
            reason = 'trigger_condition_not_met'
        else:
            raise ValueError('389 partner response timing differs')
        projected['game_state']['players'][actor]['board']['partner'] = None
        projected['game_state']['players'][actor]['board']['partner_stage'] = None
        excluded.append({'source_instance_id':partner,'card_id':card_id,'reason_code':reason})
    projected['game_state']['phase'] = 'response_window'
    projected['response_context']['phase'] = 'response_window'
    projected['response_context']['window_kind'] = 'turn_start'
    chance = start.enumerate_opportunity(projected,actor,entries)
    ids = sorted(chance['legal_candidate_ids']+[x['candidate_id'] for x in board_candidates])
    expected_ids=['response-activate-ability-A-015#1','response-pass'] if path=='probe-01-b-first' else ['response-pass']
    if ids != expected_ids or len(ids)!=len(set(ids)) or not chance['candidate_set_complete']:
        raise ValueError('389 response candidates require further proof: ' + repr(ids))
    return {'next_opportunity':game['phase'],'candidate_ids':ids,'candidate_set_complete':True,
            'hand_exclusions':removed,'hand_other_exclusions':chance['excluded_candidates'],
            'board_exclusions':excluded,'board_candidate_details':board_candidates}

ROOT=Path(__file__).resolve().parents[1]
SOURCE_SHA='71406f4ab5fc6d8192af89dfda43e0954380fdbcf243d5b3355f7730107b4916'
AUDIT=ROOT/'data/proxy-new-seed-mixed-audit-393-20260929.json'
OUTPUT=ROOT/'data/proxy-new-seed-mixed-replay-393-20260929.json'
def canonical_bytes(value):return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()
def load_rows():
 raw=source.OUTPUT.read_bytes()
 if hashlib.sha256(raw).hexdigest()!=SOURCE_SHA or raw!=source.canonical_bytes(source.build_report()):raise ValueError('393 source raw/canonical differs')
 rows=json.loads(raw)['results'];previous={x['path_id']:x for x in json.loads(prior.OUTPUT.read_bytes())['results']}
 if len(rows)!=4 or len(previous)!=4:raise ValueError('393 source inventory')
 return rows,previous
def audit_route(row,previous):
 base={'path_id':row['path_id'],'source_last_valid_event_seq':row['last_valid_event_seq'],'source_game_state_sha256':row['final_game_state_sha256'],'source_continuation_state_sha256':row['final_continuation_state_sha256']}
 if start.canonical_sha256(row['final_continuation_state'])!=row['final_continuation_state_sha256'] or start.opening._stop_state_sha256(row['final_continuation_state']['game_state'])!=row['final_game_state_sha256']:raise ValueError('393 source hashes')
 if row['path_id'] in ('probe-01-b-first','probe-02-a-first'):
  if row['new_events'] or len(previous['new_events'])!=1:raise ValueError('393 held response provenance')
  projected=copy.deepcopy(row);projected['new_events']=copy.deepcopy(previous['new_events'])
  return {**base,**audit_response(projected)}
 return {**base,'next_opportunity':row['final_continuation_state']['game_state']['phase'],'audit_pending':True}
def choose_board(row,proof):
 if proof['candidate_ids']!=['response-activate-ability-A-015#1','response-pass'] or len(proof['board_candidate_details'])!=1 or not proof['candidate_set_complete']:raise ValueError('393 board inventory')
 state=copy.deepcopy(row['final_continuation_state']);state.update(source_event_seq=row['last_valid_event_seq'],last_event_seq=row['last_valid_event_seq'],source_game_state_sha256=row['final_game_state_sha256'],continuation_state_sha256=row['final_continuation_state_sha256'])
 if start._hash(state)!=row['final_continuation_state_sha256']:raise ValueError('393 prehash')
 adapted=copy.deepcopy(proof);adapted['hand_conditional_exclusions']=proof['hand_exclusions'];adapted['hand_candidate_ids']=['response-pass']
 opportunity=board_choice.opportunity(state,adapted);order=next(x for x in start.load_source()['results'] if x['path_id']==row['path_id'])['order_id']
 decision=response.resolve_response_choice({'order_id':order,'actor_turn_index':state['game_state']['round'],'round':state['game_state']['round']},opportunity)
 if decision['selected_candidate']!='response-activate-ability-A-015#1' or decision['resolution_mode']!='response_seeded_fallback' or decision['legal_candidate_ids']!=proof['candidate_ids']:raise ValueError('393 response fallback')
 return state,decision
def run_route(row,proof):
 path=row['path_id']
 if path not in ('probe-01-b-first','probe-02-a-first'):return source.held(row,'pending_current_'+row['final_continuation_state']['game_state']['phase']+'_audit')
 if path=='probe-02-a-first':
  if proof['candidate_ids']!=['response-pass'] or not proof['candidate_set_complete']:raise ValueError('393 unique pass')
  return response_pass.run_route(row,proof)
 state,decision=choose_board(row,proof)
 after,event=board_activation.activate_board_ability(state,decision,{'candidate_ids':[decision['selected_candidate']],'source_instance_id':'A-015#1'})
 if after['response_context']['window_kind']!='turn_start' or after['response_context']['chain_status']!='building' or len(after['activation_zone'])!=1:raise ValueError('393 start chain')
 return {'path_id':path,'source_last_valid_event_seq':row['last_valid_event_seq'],'source_game_state_sha256':row['final_game_state_sha256'],'source_continuation_state_sha256':row['final_continuation_state_sha256'],'last_valid_event_seq':after['last_event_seq'],'final_game_state_sha256':start.opening._stop_state_sha256(after['game_state']),'final_continuation_state_sha256':after['continuation_state_sha256'],'final_continuation_state':start._payload(after),'stop_reason_code':'unproved_current_chain_response_candidates','new_decisions':[decision],'new_events':[event],'new_snapshots':[snapshots.snapshot(after)],'completed':False,'balance_sample_count':0}
def validate(row,result):
 seq=row['last_valid_event_seq'];g=row['final_game_state_sha256'];c=row['final_continuation_state_sha256'];events=result['new_events'];shots=result['new_snapshots']
 if len(events)!=len(shots):raise ValueError('393 event count')
 for event,shot in zip(events,shots):
  if event['seq']!=seq+1 or shot['event_seq']!=event['seq'] or event['game_state_before_sha256']!=g or event['continuation_state_before_sha256']!=c or event['game_state_after_sha256']!=shot['game_state_sha256'] or event['continuation_state_after_sha256']!=shot['continuation_state_sha256'] or start.opening._stop_state_sha256(shot['game_state'])!=shot['game_state_sha256'] or start.canonical_sha256(shot['continuation_state'])!=shot['continuation_state_sha256']:raise ValueError('393 hash chain')
  seq=event['seq'];g=shot['game_state_sha256'];c=shot['continuation_state_sha256']
 if (seq,g,c)!=(result['last_valid_event_seq'],result['final_game_state_sha256'],result['final_continuation_state_sha256']):raise ValueError('393 final hash')
def build_reports():
 rows,previous=load_rows();proofs=[audit_route(r,previous[r['path_id']]) for r in rows];results=[run_route(r,p) for r,p in zip(rows,proofs)]
 for r,v in zip(rows,results):validate(r,v)
 if sum(len(x['new_events']) for x in results)!=2:raise ValueError('393 event inventory')
 return ({'schema':'naotocchi.card_game.proxy_new_seed_mixed_audit_393.v1','source_raw_sha256':SOURCE_SHA,'planned':4,'completed':0,'new_events':0,'independent_balance_sample_count':0,'results':proofs},{'schema':'naotocchi.card_game.proxy_new_seed_mixed_replay_393.v1','source_raw_sha256':SOURCE_SHA,'planned':4,'completed':0,'new_decisions':2,'new_events':2,'new_snapshots':2,'independent_balance_sample_count':0,'results':results})
def main():
 p=argparse.ArgumentParser();p.add_argument('--check',action='store_true');args=p.parse_args();a,r=build_reports()
 for path,value in ((AUDIT,a),(OUTPUT,r)):
  raw=canonical_bytes(value)
  if args.check:
   if path.read_bytes()!=raw:raise SystemExit('393 canonical mismatch '+str(path))
  else:path.write_bytes(raw)
 print('393: response candidate pipeline and two transitions verified')
if __name__=='__main__':main()
