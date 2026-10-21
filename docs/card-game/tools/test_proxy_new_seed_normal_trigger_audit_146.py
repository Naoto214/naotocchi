import unittest

import proxy_new_seed_normal_trigger_audit_146 as audit


class NormalTriggerAudit146Tests(unittest.TestCase):
    def test_current_normal_opportunities(self):
        report = audit.build_report()
        self.assertEqual(report['planned'], 4)
        self.assertEqual(report['new_events'], 0)
        self.assertEqual(report['independent_balance_sample_count'], 0)
        rows = {x['path_id']: x for x in report['results']}
        for path in ('probe-01-a-first', 'probe-01-b-first'):
            row = rows[path]
            self.assertTrue(row['candidate_set_complete'])
            self.assertEqual(len(row['board_response_exclusions']), 1)
            self.assertEqual(row['board_response_exclusions'][0]['reason_codes'],
                             ['timing_not_normal_action'])
        self.assertTrue(rows['probe-02-a-first']['candidate_set_complete'])
        self.assertEqual(rows['probe-02-a-first']['candidate_ids'],
                         ['candidate-place-partner-A-016#1', 'candidate-place-partner-A-018#1',
                          'candidate-place-partner-A-019#1', 'pass'])
        self.assertFalse(rows['probe-02-b-first']['candidate_set_complete'])

    def test_canonical_and_source_boundaries(self):
        report = audit.build_report()
        self.assertEqual(audit.OUTPUT.read_bytes(), audit.canonical_bytes(report))
        for row in report['results']:
            self.assertEqual(audit.validate_result(row), [])


if __name__ == '__main__': unittest.main()
