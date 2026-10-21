"""133 independent contracts and replay evidence."""
import hashlib
import unittest

import proxy_cross_restart_133 as subject


class CrossRestart133Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):cls.inputs=subject.load_sources()

    def test_sources_and_stop_boundaries(self):
        for path,stop in self.inputs['stops'].items():
            raw=(subject.DATA/subject.SOURCE_FOLDER/f'stop-132-{path}.json').read_bytes()
            self.assertEqual(hashlib.sha256(raw).hexdigest(),subject.SOURCE_SHA[path])
            self.assertEqual(stop['last_valid_event_seq'],stop['events'][-1]['seq'])

    def test_prepared_item_paid_setup(self):
        stop=self.inputs['stops']['order-01-a-first']
        item=next(x for x in stop['audits'][-1]['legal_candidate_details'] if x['action_type']=='set_item')
        self.assertEqual(subject.prove_prepared_setup(item,stop['final_state']['game_state'],self.inputs['candidate_table']),1)

    def test_end_trigger_is_not_normal_action(self):
        self.assertEqual(subject.classify_end_trigger('P-desert_scorpion',self.inputs['candidate_table'])['kind'],'triggered')

    def test_r10_first_turn_does_not_complete(self):
        state=self.inputs['stops']['order-02-b-first']['final_state']['game_state']
        self.assertIsNone(subject.final_round_result(state,'B'))
        self.assertEqual(subject.final_round_result(state,'A'),{'winner':None,'result':'draw'})

    def test_four_independent_replays(self):
        out=subject.run_all(self.inputs)
        self.assertEqual(set(out),set(subject.SOURCE_SHA))
        for path,row in out.items():
            self.assertEqual(row['source_stop_sha256'],subject.SOURCE_SHA[path])
            self.assertEqual(row['source_game_state_sha256'],self.inputs['stops'][path]['game_state_sha256'])
            self.assertEqual(row['events'][0]['game_state_before_sha256'],row['source_game_state_sha256'])
            self.assertEqual(row['events'][-1]['seq'],row['last_valid_event_seq'])
            self.assertTrue(row['seeded_fallback_used'])
            self.assertFalse(row['counts_as_independent_balance_sample'])
            for left,right in zip(row['events'],row['events'][1:]):
                self.assertEqual(right['seq'],left['seq']+1)
                self.assertEqual(left['game_state_after_sha256'],right['game_state_before_sha256'])
                self.assertEqual(left['continuation_state_after_sha256'],right['continuation_state_before_sha256'])
            if path.startswith('order-02'):
                self.assertEqual((row['status'],row['result'],row['winner']),('completed','draw',None))
                self.assertEqual(row['final_state']['game_state']['round'],10)
                self.assertEqual(row['events'][-1]['action_type'],'final_round_completed')
            else:
                self.assertEqual(row['reason']['code'],'incomplete_legal_candidates')
                self.assertEqual(row['reason']['contract_stop_codes'],['unresolved_canonical_predicate'])

    def test_saved_json_canonical(self):
        self.assertEqual(subject.check_outputs(inputs=self.inputs),[])


if __name__=='__main__':unittest.main()
