import copy
import unittest

import proxy_new_seed_turn_end_proof_203 as subject


class TurnEnd203Test(unittest.TestCase):
    def test_all_four_six_stage_end_proofs(self):
        report=subject.build_report()
        self.assertEqual(4,len(report['results']))
        for row in report['results']:
            self.assertEqual([],subject.validate_result(row))
            self.assertTrue(row['turn_end_set_complete'])
            self.assertEqual([],row['contract_stop_codes'])
            self.assertTrue(all(row['completeness_checks'].values()))

    def test_changed_historical_growth_rejected(self):
        row=copy.deepcopy(subject.build_report()['results'][0])
        row['growth_trace'][-1]['growth']['A']+=1
        self.assertTrue(subject.validate_result(row))


if __name__=='__main__':unittest.main()
