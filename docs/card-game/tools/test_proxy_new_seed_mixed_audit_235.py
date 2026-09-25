import unittest
import proxy_new_seed_mixed_audit_235 as subject
class MixedAudit235Test(unittest.TestCase):
    def test_three_egg_choices_and_one_normal(self):
        rows=subject.build_report()['results']
        self.assertEqual(3,sum(x['next_opportunity']=='mandatory_egg_exchange' for x in rows))
        self.assertEqual(1,sum(x['next_opportunity']=='normal_action' for x in rows))
        self.assertTrue(all(x['candidate_set_complete'] and not subject.validate_result(x) for x in rows))
if __name__=='__main__':unittest.main()
