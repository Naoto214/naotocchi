import copy
import tempfile
import unittest
from pathlib import Path
import proxy_resource_value_trajectory as trajectory

class TrajectoryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.initials=trajectory.load_initial_routes(trajectory.DATA)
        cls.runs=[trajectory.run_route(initial,policy) for initial in cls.initials for policy in trajectory.POLICIES]
    def test_same_initial_manifest_two_policies_four_routes(self):
        self.assertEqual(len(self.initials),4);self.assertEqual(len({r['run_id'] for r in self.runs}),8)
        for initial in self.initials:
            pair=[r for r in self.runs if r['path_id']==initial['path_id']]
            self.assertEqual({r['initial_raw_sha256'] for r in pair},{trajectory.INITIAL_SHA})
            self.assertEqual(pair[0]['initial_manifest_sha256'],pair[1]['initial_manifest_sha256'])
    def test_legacy_replay_matches_saved_results(self):
        for initial in self.initials:
            result=next(r for r in self.runs if r['path_id']==initial['path_id'] and r['policy_id']==trajectory.POLICIES[0])
            self.assertFalse(trajectory.compare_legacy_prefix(result,initial))
    def test_unsupported_new_action_is_structural_stop(self):
        initial=self.initials[0];state=trajectory.start.build_resume_state(initial['source_route'])
        forged=dict(selected_candidate='unknown',candidate_set_complete=True,selected_action=dict(candidate_id='unknown',action_type='unknown_effect',candidate_variant='unknown'))
        with self.assertRaises(trajectory.normal.RulesStop) as error:
            trajectory.apply_selected(state,forged,initial['inputs'])
        self.assertEqual(error.exception.code,'unsupported_resolution_adapter')
        for r in self.runs:
            if not r['completed']:
                self.assertIsNone(r['result']['winner']);self.assertTrue(r['stop_reason_code'])
    def test_existing_response_adapter_continues_after_placement(self):
        result=next(r for r in self.runs if r['path_id']=='probe-01-a-first' and r['policy_id']==trajectory.POLICIES[0])
        self.assertGreaterEqual(result['last_valid_event_seq'],8)

    def test_existing_end_adapter_advances_to_next_egg_choice(self):
        result=self.runs[0]
        kinds=[e["action_type"] for e in result["events"]]
        self.assertIn("turn_end_completed",kinds)
        self.assertGreaterEqual(kinds.count("egg_exchange_bottom"),3)

    def test_independent_replay_rejects_event_snapshot_hash_tampering(self):
        initial=self.initials[0];result=self.runs[0]
        self.assertEqual(trajectory.validate_route(result,initial,result['policy_id']),[])
        bad=copy.deepcopy(result);bad['events'][2]['game_state_after_sha256']='0'*64
        self.assertTrue(trajectory.validate_route(bad,initial,result['policy_id']))
        bad=copy.deepcopy(result);bad['snapshots'][-1]['game_state']['players']['A']['growth']+=1
        self.assertTrue(trajectory.validate_route(bad,initial,result['policy_id']))
    def test_pilot_action_bridge_rejects_action_substitution(self):
        initial=self.initials[0]
        boundary=next(b for b in initial['inputs']['boundaries'] if b['path_id']==initial['path_id'] and b['event_seq']==4)
        state=trajectory._current(boundary['continuation'],4)
        record=trajectory._normal_selection(state,initial,trajectory.POLICIES[1],boundary['public_history'])
        forged=copy.deepcopy(record);forged['selected_action']['action_type']='pass'
        with self.assertRaises(ValueError):trajectory.apply_selected(state,forged,initial['inputs'])

    def test_mandatory_seed_profile_tampering_rejected(self):
        bad=copy.deepcopy(self.initials[0]);bad["inputs"]["mandatory_seed_profiles"]["2:A"]=2
        with self.assertRaises(ValueError):trajectory.run_route(bad,trajectory.POLICIES[0])

    def test_diverged_states_are_not_matched_by_round_only(self):
        initial=self.initials[0];boundary=initial['inputs']['boundaries'][0]
        state=copy.deepcopy(boundary['continuation']);state['game_state']['players']['A']['time']+=1
        self.assertIsNone(trajectory.find_boundary(state,initial['inputs']['boundaries']))
    def test_mandatory_response_context_preserved(self):
        for initial in self.initials:
            pair=[r for r in self.runs if r['path_id']==initial['path_id']]
            self.assertEqual(pair[0]['decisions'][0],pair[1]['decisions'][0])
            self.assertEqual(pair[0]['decisions'][0]['seed_context']['choice_kind'],'egg_exchange_bottom')
            responses=[[d for d in r['decisions'] if d.get('decision_kind')=='response_action'] for r in pair]
            if responses[0] and responses[1]:self.assertEqual(responses[0][0],responses[1][0])
    def test_no_r11_after_terminal(self):
        for result in self.runs:
            self.assertTrue(all(s['game_state']['round']<=10 for s in result['snapshots']))
            self.assertEqual(result['independent_balance_sample_count'],0)
    def test_fresh_paired_exact_coverage(self):
        with tempfile.TemporaryDirectory() as output:
            report=trajectory.run_paired(trajectory.DATA,Path(output))
            self.assertEqual(report['planned'],8)
            self.assertEqual(report['planned_ids'],sorted(r['run_id'] for r in report['results']))
            self.assertEqual(report['completed']+report['stopped'],8)
            self.assertFalse(report['policy_promoted'])

if __name__=='__main__':unittest.main()
