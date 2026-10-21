import copy
import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0,str(Path(__file__).resolve().parent))
import proxy_safe_placement_mixed_131 as proof

class SafePlacementMixed131Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data=Path(__file__).resolve().parents[1]/'data'
        cls.stops={p:json.loads((cls.data/'proxy-board-source-world-stops-130'/f'stop-130-{p}.json').read_text()) for p in proof.SOURCE_SHA}
        cls.table=json.loads((cls.data/'proxy-normal-decision-candidate-table-114-20260918.json').read_text())

    def test_mixed_legal_set_and_free_placement(self):
        for path,expected in (('order-01-a-first',11),('order-01-b-first',11),
                              ('order-02-a-first',8),('order-02-b-first',8)):
            route=self.stops[path];audit=proof.audit_current(route,self.table)
            self.assertTrue(audit['candidate_set_complete'])
            decision=proof.compare_mixed(route,audit,self.table)
            self.assertEqual(len(decision['legal_candidates']),expected)
            self.assertEqual(decision['selected_action']['card_id'],'C-cat_friend')
            self.assertEqual(decision['selected_action']['action_type'],'place_companion')
            self.assertEqual(decision['priority_basis']['time_after_certain_resolution'][decision['selected_candidate']],
                             route['final_state']['game_state']['players'][route['final_state']['game_state']['turn_player']]['time'])
            self.assertEqual(decision['resolution_mode'],'safe_free_development')

    def test_forged_candidate_is_rejected(self):
        route=self.stops['order-01-a-first'];audit=proof.audit_current(route,self.table)
        forged=copy.deepcopy(audit);forged['legal_candidate_ids'].remove('pass')
        with self.assertRaises(ValueError):proof.compare_mixed(route,forged,self.table)

    def test_four_canonical_outputs(self):
        inputs=proof.load_sources(self.data)
        self.assertEqual(proof.check_outputs(self.data,inputs),[])

if __name__=='__main__':unittest.main()
