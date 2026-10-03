import copy
import unittest
import proxy_counterfactual_limits as x

class CounterfactualLimitTests(unittest.TestCase):
    def test_all_72_classified_without_policy_choice_or_game_stop(self):
        r=x.audit_saved()
        self.assertEqual(r['unsupported'],72)
        self.assertEqual(r['groups'],{'challenge_and_pass':47,'safe_development_and_challenge':21,'uncertified_partner_arrival':4})
        self.assertEqual(r['new_game_stops'],0)
        self.assertFalse(r['policy_promoted'])
        self.assertTrue(all(row['selected_candidate'] is None for row in r['rows']))
        self.assertEqual(len({row['shadow_id'] for row in r['rows']}),72)

    def test_source_hash_mismatch_rejected(self):
        with self.assertRaises(ValueError):x.load_checked(x.SHADOW_DIR,expected_raw='0'*64)

    def test_missing_candidate_cannot_be_classified(self):
        shadow=x.load_checked(x.SHADOW_DIR)
        row=next(r for r in shadow['results'] if r['policies'][x.LEGACY]['status']=='unsupported')
        with self.assertRaises(ValueError):x.classify(row,[])

    def test_challenge_is_zero_cost_not_a_paid_exclusion(self):
        report=x.audit_saved()
        for row in report['rows']:
            if row['group']=='safe_development_and_challenge':
                self.assertTrue(row['blocking_candidates'])
                self.assertTrue(all(c['payment_time']==0 and c['action_type']=='challenge' for c in row['blocking_candidates']))

if __name__=='__main__':unittest.main()
