import copy
import json
import subprocess
import sys
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SCRIPT=Path(__file__).with_name('proxy_new_seed_mixed_replay_405.py')

class Replay405Tests(unittest.TestCase):
    def test_b_turns_distinguish_round_ten_first_and_second(self):
        self.assertTrue(SCRIPT.exists(), '405 B-turn and R10 replay is missing')
        subprocess.run([sys.executable,str(SCRIPT),'--check'],check=True)
        data=json.loads((ROOT/'data/proxy-new-seed-mixed-replay-405-20260930.json').read_bytes())
        self.assertEqual(4,len(data['results']))
        self.assertEqual(0,data['completed']);self.assertEqual(2,data['rules_stopped'])
        self.assertEqual(0,data['independent_balance_sample_count'])
        self.assertEqual(data['new_events'],data['new_snapshots'])
        for row in data['results']:
            game=row['final_continuation_state']['game_state']
            self.assertEqual(10,game['round'])
            if row['path_id'].endswith('b-first'):
                self.assertFalse(row['completed'])
                self.assertEqual('response_window',game['phase'])
                self.assertEqual('incomplete_legal_candidates',row['stop_reason_code'])
                self.assertFalse(row['rules_stop']['candidate_set_complete'])
                self.assertEqual('E-final-time',row['rules_stop']['unresolved_card_id'])
                self.assertTrue(row['rules_stop']['public_eligible_discard_targets'])
                self.assertNotIn('r10_final_comparison',[x['action_type'] for x in row['new_events']])
            else:
                self.assertFalse(row['completed'])
                self.assertEqual(('A','egg_exchange_choice'),(game['turn_player'],game['phase']))
        for kind in ('audit','replay'):
            p=ROOT/f'data/proxy-new-seed-mixed-{kind}-405-20260930.json'
            self.assertEqual((json.dumps(json.loads(p.read_bytes()),ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode(),p.read_bytes())

    def test_round_ten_first_continues_and_second_compares_growth_only(self):
        self.assertTrue(SCRIPT.exists(), '405 R10 adapter is missing')
        sys.path.insert(0,str(SCRIPT.parent))
        import proxy_new_seed_mixed_replay_405 as replay
        audit,data=replay.build_reports()
        route=next(x for x in data['results'] if x['path_id']=='probe-01-a-first')
        proof=next(x['audit'] for x in next(x for x in audit['results'] if x['path_id']==route['path_id'])['steps'] if x['audit']['next_opportunity']=='turn_end')
        shot=next(x for x in route['new_snapshots'] if x['event_seq']==proof['source_last_valid_event_seq'])
        base={'path_id':route['path_id'],'last_valid_event_seq':shot['event_seq'],'final_game_state_sha256':shot['game_state_sha256'],'final_continuation_state_sha256':shot['continuation_state_sha256'],'final_continuation_state':copy.deepcopy(shot['continuation_state'])}
        for first in ('A','B'):
            row=copy.deepcopy(base)
            # First player comes from the immutable manifest, so use the paired
            # path with the same seat naming convention for this synthetic case.
            row['path_id']='probe-01-'+first.lower()+'-first'
            state=row['final_continuation_state'];state['game_state'].update(turn_player=first,round=10)
            state['response_context']['turn_player']=first
            row['final_game_state_sha256']=replay.contracts.start.opening._stop_state_sha256(state['game_state'])
            row['final_continuation_state_sha256']=replay.contracts.start.canonical_sha256(state)
            p=replay.terminal.proof_for_row(row,{**proof,**replay.contracts.boundary(row)})
            result=replay.terminal.replay_end(row,p)
            self.assertFalse(result['completed'])
            self.assertEqual(10,result['final_continuation_state']['game_state']['round'])
            self.assertEqual(['turn_end_completed','turn_start_and_egg_draw'],[e['action_type'] for e in result['new_events']])
        second=copy.deepcopy(base);second['path_id']='probe-01-b-first'
        second['final_continuation_state']['game_state']['round']=10
        second['final_game_state_sha256']=replay.contracts.start.opening._stop_state_sha256(second['final_continuation_state']['game_state'])
        second['final_continuation_state_sha256']=replay.contracts.start.canonical_sha256(second['final_continuation_state'])
        for growth,winner in (({'A':25,'B':20},'A'),({'A':20,'B':25},'B'),({'A':25,'B':25},'draw')):
            self.assertEqual(winner,replay.terminal.compare_growth(growth))
        # B is the current actor in this fixture; A-first makes B the last actor.
        second['path_id']='probe-01-a-first'
        p=replay.terminal.proof_for_row(second,{**proof,**replay.contracts.boundary(second)});result=replay.terminal.replay_end(second,p)
        self.assertTrue(result['completed']);self.assertEqual(['r10_final_comparison'],[e['action_type'] for e in result['new_events']])
        replay.contracts.validate_chain(second,result)
        bad=copy.deepcopy(base);bad['final_continuation_state']['pending_triggers']=[{'unknown':'trigger'}]
        bad['final_continuation_state_sha256']=replay.contracts.start.canonical_sha256(bad['final_continuation_state'])
        with self.assertRaises(ValueError):replay.terminal.proof_for_row(bad,proof)
        badproof=copy.deepcopy(proof);badproof['growth_trace'][-1]['growth']['A']+=1
        with self.assertRaises(ValueError):replay.terminal.proof_for_row(base,badproof)
        broken=copy.deepcopy(route);broken['new_events'][-1]['game_state_before_sha256']='0'*64
        with self.assertRaises(ValueError):replay.contracts.validate_chain(next(x for x in replay.load_rows() if x['path_id']==route['path_id']),broken)

    def test_coin_after_prior_pass_keeps_full_seeded_decision(self):
        sys.path.insert(0,str(SCRIPT.parent))
        import proxy_new_seed_mixed_replay_405 as replay
        audit,data=replay.build_reports()
        found=False
        for row in data['results']:
            original=next(x for x in replay.load_rows() if x['path_id']==row['path_id'])
            for event in row['new_events']:
                if event['action_type']!='activate_response' or event.get('source_instance_id')!='A-033#1':continue
                before=original if event['seq']==original['last_valid_event_seq']+1 else next(x for x in row['new_snapshots'] if x['event_seq']==event['seq']-1)
                if before is original:state=replay.contracts.current(original)
                else:
                    state=copy.deepcopy(before['continuation_state']);state.update(last_event_seq=before['event_seq'],source_event_seq=before['event_seq'],continuation_state_sha256=before['continuation_state_sha256'])
                if state['activation_zone']:continue
                found=True
                self.assertEqual(1,state['response_context']['consecutive_passes'])
                decision=next(d for d in row['new_decisions'] if d.get('selected_candidate')=='response-use-item-A-033#1')
                self.assertIn('response-pass',decision['legal_candidate_ids'])
                self.assertEqual('response_seeded_fallback',decision['resolution_mode'])
                with self.assertRaises(ValueError):replay.coin_activation.activate_quick_item(state,decision)
                after,actual=replay.coin_activation.activate_quick_item(state,decision,allow_prior_pass=True)
                self.assertEqual(event,actual)
                self.assertEqual(0,after['response_context']['consecutive_passes'])
        self.assertTrue(found,'reached opponent coin after one pass must be exercised')

    def test_terminal_proof_rejects_explicit_unresolved_history(self):
        sys.path.insert(0,str(SCRIPT.parent))
        import proxy_new_seed_mixed_replay_405 as replay
        audit,data=replay.build_reports()
        route=next(x for x in data['results'] if x['path_id']=='probe-01-a-first')
        proof=next(x['audit'] for x in next(x for x in audit['results'] if x['path_id']==route['path_id'])['steps'] if x['audit']['next_opportunity']=='turn_end')
        shot=next(x for x in route['new_snapshots'] if x['event_seq']==proof['source_last_valid_event_seq'])
        row={'path_id':route['path_id'],'last_valid_event_seq':shot['event_seq'],'final_game_state_sha256':shot['game_state_sha256'],'final_continuation_state_sha256':shot['continuation_state_sha256'],'final_continuation_state':copy.deepcopy(shot['continuation_state'])}
        row['final_continuation_state']['game_state']['round']=10
        row['final_game_state_sha256']=replay.contracts.start.opening._stop_state_sha256(row['final_continuation_state']['game_state'])
        row['final_continuation_state_sha256']=replay.contracts.start.canonical_sha256(row['final_continuation_state'])
        proof={**proof,**replay.contracts.boundary(row)}
        for field,value in (('source_game_state_sha256','0'*64),('source_continuation_state_sha256','0'*64),('turn_end_set_complete',False),('contract_stop_codes',['missing_transition_handler']),('active_expiring_effects',[{'source_instance_id':'A-033#1','expiration':'turn_end'}]),('unresolved_codes',['unknown_effect']),('growth_reach_100',[{'actor':'A','event_seq':shot['event_seq']}])):
            invalid=copy.deepcopy(proof);invalid[field]=value
            with self.subTest(field=field):
                with self.assertRaises(ValueError):replay.terminal.proof_for_row(row,invalid)
