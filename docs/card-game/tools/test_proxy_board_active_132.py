import copy
import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0,str(Path(__file__).resolve().parent))
import proxy_board_active_132 as proof

class BoardActive132Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data=Path(__file__).resolve().parents[1]/'data'
        cls.stops={p:json.loads((cls.data/'proxy-safe-placement-mixed-stops-131'/f'stop-131-{p}.json').read_text()) for p in proof.SOURCE_SHA}
        cls.table=json.loads((cls.data/'proxy-normal-decision-candidate-table-114-20260918.json').read_text())

    def test_four_current_board_sources_are_excluded_for_missing_target(self):
        for route in self.stops.values():
            audit=proof.audit_current(route,self.table)
            self.assertTrue(audit['candidate_set_complete'])
            active=[x for x in audit['enumeration_units'] if x['source_family']=='board_card_action' and
                    x['action_type']=='activate_companion_ability']
            self.assertEqual(len(active),1)
            self.assertEqual(active[0]['reason_codes'],['required_target_absent'])
            self.assertEqual(active[0]['disposition'],'excluded')
            self.assertIsNone(active[0]['candidate_id'])
            self.assertEqual(active[0]['target_instance_ids'],[])

    def test_board_single_target_id_follows_127_when_usage_proved(self):
        route=copy.deepcopy(self.stops['order-01-a-first'])
        game=route['final_state']['game_state'];actor=game['turn_player']
        # A controlled candidate audit exercises the existing single-target grammar;
        # it is not a claimed reached match state or a new match artifact.
        companion=next(x for x in game['players'][actor]['deck'] if game['cards'][x]['card_id'].startswith('C-') and
                       game['cards'][x]['card_id']!='C-cat_friend')
        game['players'][actor]['deck'].remove(companion)
        game['players'][actor]['discard'].append(companion)
        route['game_state_sha256']=proof.response_120.game_state_sha256(game)
        route['final_state']['continuation_state_sha256']=proof.response_120.continuation_state_sha256(
            proof.response_120._continuation_payload(route['final_state']))
        route['continuation_state_sha256']=route['final_state']['continuation_state_sha256']
        # The altered terminal state breaks the event hash chain: admission must stop.
        with self.assertRaises(ValueError):proof.audit_current(route,self.table,strict_usage=True)
        view=proof.extension_125.project(route)
        view['_candidate_table']=self.table
        view['_verified_ability_uses']={'A-013#1':[]}
        view['cards'][companion]=copy.deepcopy(game['cards'][companion])
        original=next(x for x in proof.expand_units(view,self.table)
                      if x['source_family']=='board_card_action' and
                      x['action_type']=='activate_companion_ability')
        self.assertEqual(proof._active_unit(view,original)['candidate_id'],
                         f'candidate-activate_companion_ability-A-013#1-target-{companion}')

    def test_forged_audit_rejected(self):
        route=self.stops['order-02-a-first'];audit=proof.audit_current(route,self.table)
        forged=copy.deepcopy(audit);forged['legal_candidate_ids'].remove('pass')
        with self.assertRaises(ValueError):proof.compare_paid(route,forged,self.table)

    def test_paid_coin_and_pass(self):
        for path in ('order-02-a-first','order-02-b-first'):
            route=self.stops[path];audit=proof.audit_current(route,self.table)
            decision=proof.compare_paid(route,audit,self.table)
            self.assertEqual(decision['selected_candidate'],'pass')
            coin=next(x['candidate_id'] for x in audit['legal_candidate_details'] if x['card_id']=='I-c_coin2')
            self.assertEqual(decision['priority_basis']['scores'][coin]['certain_growth_difference'],0)
            self.assertEqual(decision['priority_basis']['scores'][coin]['payment_time'],1)

    def test_four_canonical_outputs(self):
        inputs=proof.load_sources(self.data)
        self.assertEqual(proof.check_outputs(self.data,inputs),[])

if __name__=='__main__':unittest.main()
