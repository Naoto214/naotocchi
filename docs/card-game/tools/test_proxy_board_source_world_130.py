import copy
import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0,str(Path(__file__).resolve().parent))
import proxy_board_source_world_130 as proof

class BoardSourceWorld130Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data=Path(__file__).resolve().parents[1]/'data'
        cls.stops={p:json.loads((cls.data/'proxy-conditional-growth-stops-129'/f'stop-129-{p}.json').read_text()) for p in proof.SOURCE_SHA}
        cls.table=json.loads((cls.data/'proxy-normal-decision-candidate-table-114-20260918.json').read_text())

    def test_board_only_action_in_hand_has_general_zone_exclusion(self):
        for path in ('order-01-a-first','order-01-b-first'):
            audit=proof.audit_current(self.stops[path],self.table)
            self.assertTrue(audit['candidate_set_complete'])
            rows=[x for x in audit['enumeration_units'] if x['action_type']=='activate_companion_ability' and x['source_zone']=='hand']
            self.assertTrue(rows)
            for row in rows:
                self.assertEqual(row['reason_codes'],['source_not_on_required_board'])
                self.assertEqual(row['evidence']['required_source_zone'],'companion_board')
                self.assertEqual(row['disposition'],'excluded')

    def test_continuous_world_is_paid_with_no_certain_growth(self):
        for path in ('order-02-a-first','order-02-b-first'):
            route=self.stops[path];audit=proof.audit_current(route,self.table)
            self.assertTrue(audit['candidate_set_complete'])
            decision=proof.compare_current(route,audit,self.table)
            self.assertEqual(decision['selected_candidate'],'pass')
            world=next(x['candidate_id'] for x in audit['legal_candidate_details'] if x['card_id']=='W-deepsea')
            self.assertEqual(decision['priority_basis']['scores'][world]['certain_growth_difference'],0)
            self.assertEqual(decision['priority_basis']['scores'][world]['payment_time'],2)

    def test_forged_audit_is_rejected(self):
        route=self.stops['order-01-a-first'];audit=proof.audit_current(route,self.table)
        forged=copy.deepcopy(audit);forged['legal_candidate_ids'].remove('pass')
        with self.assertRaises(ValueError):proof.compare_current(route,forged,self.table)

    def test_four_canonical_outputs(self):
        inputs=proof.load_sources(self.data)
        self.assertEqual(proof.check_outputs(self.data,inputs),[])

if __name__=='__main__':unittest.main()
