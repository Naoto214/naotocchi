import copy
import unittest
import proxy_new_seed_mixed_audit_222 as subject

class MixedAudit222Test(unittest.TestCase):
    def test_four_reached_opportunities_complete(self):
        report=subject.build_report();rows={r['path_id']:r for r in report['results']}
        self.assertEqual(['response-pass'],rows['probe-01-a-first']['candidate_ids'])
        self.assertEqual(['response-activate-ability-A-015#1','response-pass'],
                         rows['probe-01-b-first']['candidate_ids'])
        self.assertEqual(['response-pass'],rows['probe-02-b-first']['candidate_ids'])
        self.assertEqual(['candidate-play-main-B-001#1-birth','pass'],
                         rows['probe-02-a-first']['candidate_ids'])
        self.assertTrue(all(r['candidate_set_complete'] and not subject.validate_result(r)
                            for r in report['results']))

    def test_candidate_mutation_rejected(self):
        row=copy.deepcopy(subject.build_report()['results'][0])
        row['candidate_ids']=['invalid']
        self.assertTrue(subject.validate_result(row))

if __name__=='__main__':unittest.main()
