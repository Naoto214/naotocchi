import copy
import json
import unittest
import proxy_targeted_variants as v

class TargetedVariantsTests(unittest.TestCase):
    def test_six_baselines_six_declines_two_expiries_and_two_explicit_defenses(self):
        results=v.execute_all()
        self.assertEqual(len(results),16)
        self.assertEqual({k:sum(r['variant']==k for r in results) for k in ('baseline','decline','expired','explicit_defense')},dict(baseline=6,decline=6,expired=2,explicit_defense=2))
        for result in results:
            with self.subTest(case=result['case_id']):
                self.assertEqual(v.replay(json.loads(json.dumps(result))),[])
                self.assertEqual(result['checks']['focus_applied'],result['variant']!='decline')
                self.assertFalse(result['policy_promoted'])
                if result['variant']=='expired':
                    self.assertEqual(result['checks']['defense_statuses'],['expired'])
                    self.assertEqual(result['checks']['removal_destination'],'discard')

    def test_replay_rejects_event_snapshot_and_expected_outcome_forgery(self):
        original=v.execute_all()[0]
        for field in ('events','snapshots','checks','program_sha256'):
            bad=copy.deepcopy(original)
            if field=='events':bad[field][0]['proof']['drawn']=[]
            elif field=='snapshots':bad[field][-1]['players']['A']['growth']=100
            elif field=='checks':bad[field]['focus_applied']=False
            else:bad[field]='0'*64
            self.assertTrue(v.replay(bad),field)

    def test_original441_six_execution_records_remain_identical(self):
        self.assertEqual(v.compare_441(),dict.fromkeys(v.x.FOCUS_IDS,True))

if __name__=='__main__':unittest.main()
