import copy
import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0,str(Path(__file__).resolve().parent))
import proxy_conditional_growth_129 as proof


class ConditionalGrowth129Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data=Path(__file__).resolve().parents[1]/'data'
        cls.stops={p:json.loads((cls.data/'proxy-r2-candidate-stops-128'/f'stop-128-{p}.json').read_text())
                   for p in proof.SOURCE_SHA}
        cls.table=json.loads((cls.data/'proxy-normal-decision-candidate-table-114-20260918.json').read_text())

    def test_hidden_top_card_keeps_all_variants_and_pass_wins_on_certain_time(self):
        for path in ('order-01-a-first','order-01-b-first'):
            route=self.stops[path]
            audit=proof.extension_128.audit_current(route,self.table)
            decision=proof.compare_conditional(route,audit,self.table)
            self.assertEqual(len(decision['legal_candidates']),9)
            self.assertEqual(decision['selected_candidate'],'pass')
            self.assertEqual(set(decision['priority_basis']['conditional_uncertainty']),
                             {f'candidate-use_play-A-001#1-{v}' for v in
                              ('main','companion','partner','world','play','item','event')})
            self.assertTrue(all(x['certain_growth_difference']==0 for x in
                                decision['priority_basis']['scores'].values()))

    def test_response_sensitive_target_keeps_all_candidates(self):
        for path in ('order-02-a-first','order-02-b-first'):
            route=self.stops[path]
            audit=proof.extension_128.audit_current(route,self.table)
            decision=proof.compare_conditional(route,audit,self.table)
            self.assertEqual(len(decision['legal_candidates']),5)
            self.assertEqual(decision['selected_candidate'],'pass')
            self.assertEqual(decision['priority_basis']['conditional_uncertainty']
                             ['candidate-use_event-B-040#1-target-B-017#1']['source_card_id'],
                             'E-first-date')

    def test_tampered_candidate_set_rejected(self):
        route=self.stops['order-01-a-first'];audit=proof.extension_128.audit_current(route,self.table)
        forged=copy.deepcopy(audit);forged['legal_candidate_ids'].remove('pass')
        with self.assertRaises(ValueError):proof.compare_conditional(route,forged,self.table)

    def test_canonical_four_stop_outputs(self):
        inputs=proof.load_sources(self.data)
        self.assertEqual(proof.check_outputs(self.data,inputs),[])


if __name__=='__main__':unittest.main()
