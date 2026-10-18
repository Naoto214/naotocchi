import copy
import unittest
import proxy_resource_value_trajectory as trajectory

class ResponseProfileTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.initial=next(x for x in trajectory.load_initial_routes() if x['path_id']=='probe-01-b-first')
        _,shots=trajectory.shadow.load_history(trajectory.DATA,trajectory.shadow.source_manifest(trajectory.DATA))
        cls.state=trajectory._current(shots[cls.initial['path_id']][84]['continuation_state'],84)
        cls.events=[copy.deepcopy(cls.initial['inputs']['saved_events'][seq]) for seq in range(1,85)]

    def test_profile_reenumerates_original_contract_at_exact_boundary(self):
        before=copy.deepcopy(self.state)
        chance=trajectory._historical_response_opportunity(self.state,self.initial,self.events)
        self.assertEqual(chance['legal_candidate_ids'],['response-pass'])
        self.assertEqual(chance['legal_candidate_details'],[trajectory.start.response.build_response_pass_detail()])
        self.assertIn('docs/card-game/data/proxy-new-seed-mixed-audit-318-20260927.json',chance['source_references'])
        self.assertEqual(self.state,before)

    def test_profile_does_not_apply_by_round_or_actor_only(self):
        altered=copy.deepcopy(self.state);altered['game_state']['players']['A']['time']-=1
        self.assertIsNone(trajectory._historical_response_opportunity(altered,self.initial,self.events))

    def test_profile_rejects_tampered_inventory_instead_of_copying_it(self):
        initial=copy.deepcopy(self.initial)
        for row in initial['inputs']['historical_response_inventories']:
            if row['source_ref'].endswith('318-20260927.json') and row['path_id']==initial['path_id']:
                row['candidate_ids']=['response-activate-ability-A-015#1','response-pass']
        with self.assertRaises(ValueError):trajectory._historical_response_opportunity(self.state,initial,self.events)

    def test_profile_rejects_missing_or_tampered_public_origin(self):
        bad=copy.deepcopy(self.events);bad[-1]['action_type']='response_pass'
        with self.assertRaises(ValueError):trajectory._historical_response_opportunity(self.state,self.initial,bad)
        with self.assertRaises(ValueError):trajectory._historical_response_opportunity(self.state,self.initial,self.events[:-1])

class LegacyEmptyPassTests(unittest.TestCase):
    def test_227_empty_pass_reproduces_exact_source_transition(self):
        initial=next(x for x in trajectory.load_initial_routes() if x['path_id']=='probe-02-a-first')
        _,shots=trajectory.shadow.load_history(trajectory.DATA,trajectory.shadow.source_manifest(trajectory.DATA))
        state=trajectory._current(shots[initial['path_id']][36]['continuation_state'],36)
        opportunity=trajectory.reached_response.enumerate_opportunity(state,[initial['inputs']['saved_events'][i] for i in range(1,37)])
        record=trajectory.start.seeded.resolve_response_choice(dict(order_id=initial['order_id'],actor_turn_index=2,round=2),opportunity)
        profiles=trajectory._fresh_empty_pass_boundaries(initial['inputs'],initial['path_id'])
        after,events=trajectory.apply_selected(state,record,dict(initial['inputs'],legacy_empty_pass_boundaries=profiles))
        self.assertEqual(trajectory.start._payload(after),shots[initial['path_id']][37]['continuation_state'])
        self.assertEqual(events[0]['game_state_after_sha256'],initial['inputs']['saved_events'][37]['game_state_after_sha256'])
        changed=copy.deepcopy(state);changed['game_state']['players']['A']['time']-=1
        boundary=(trajectory.start.opening._stop_state_sha256(changed['game_state']),trajectory.start._hash(changed))
        self.assertNotIn(boundary,profiles)

if __name__=='__main__':unittest.main()
