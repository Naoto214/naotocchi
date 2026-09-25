import copy
import unittest

import proxy_new_seed_normal_audit_198 as subject


class NormalAudit198Test(unittest.TestCase):
    def test_two_complete_normal_opportunities(self):
        report=subject.build_report()
        normal=[x for x in report['results'] if x['next_opportunity']=='normal_action']
        self.assertEqual(2,len(normal))
        for row in report['results']:
            self.assertEqual([],subject.validate_result(row))
        self.assertEqual([['candidate-play-main-B-001#1-birth','pass'],
                          ['candidate-place_world-A-020#1','pass']],
                         [x['candidate_ids'] for x in normal])
        self.assertTrue(all(x['candidate_set_complete'] and all(x['completeness_checks'].values()) for x in normal))

    def test_mutated_candidate_rejected(self):
        row=copy.deepcopy(subject.build_report()['results'][0]);row['candidate_ids']=[]
        self.assertTrue(subject.validate_result(row))


if __name__=='__main__':unittest.main()
