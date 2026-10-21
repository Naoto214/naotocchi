import copy
import unittest

import proxy_new_seed_start_audit_166 as subject


class StartAudit166Test(unittest.TestCase):
    def test_four_current_start_opportunities(self):
        report=subject.build_report()
        self.assertEqual(4,report['planned'])
        self.assertEqual(0,report['new_events'])
        self.assertEqual(0,report['independent_balance_sample_count'])
        by_path={x['path_id']:x for x in report['results']}
        for row in report['results']:
            self.assertEqual([],subject.validate_result(row))
        self.assertEqual('triggered_ability_response_id_unestablished',
                         by_path['probe-01-a-first']['missing_contract'])
        self.assertEqual([],by_path['probe-02-a-first']['board_legal_without_id'])

    def test_changed_proof_fails(self):
        row=copy.deepcopy(subject.build_report()['results'][0])
        row['hand_candidate_ids'].append('response-pass-fake')
        self.assertTrue(subject.validate_result(row))


if __name__=='__main__':unittest.main()
