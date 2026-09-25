import unittest

import proxy_board_trigger_audit_144 as audit


class BoardTriggerAudit144Tests(unittest.TestCase):
    def test_current_four_opportunities(self):
        report = audit.build_report()
        self.assertEqual(report['planned'], 4)
        self.assertEqual(report['new_events'], 0)
        self.assertEqual(report['independent_balance_sample_count'], 0)
        for row in report['results']:
            self.assertTrue(row['candidate_set_complete'])
            self.assertEqual(audit.validate_result(row), [])
        self.assertEqual([r['candidate_ids'] for r in report['results']][:2],
                         [['response-pass'], ['response-pass']])
        self.assertEqual(audit.OUTPUT.read_bytes(), audit.canonical_bytes(report))

    def test_trigger_predicate_uses_window_and_event_not_copy_or_path(self):
        self.assertTrue(audit.matches('C-chicken', 'turn_start', 'A', 'A', 'turn_start', 'A'))
        self.assertFalse(audit.matches('C-chicken', 'after_normal_action', 'A', 'A', 'place_companion', 'A'))
        self.assertTrue(audit.matches('C-bat', 'after_normal_action', 'A', 'B', 'use_item', 'A'))
        self.assertTrue(audit.matches('C-bat', 'turn_start', 'A', 'B', 'use_play', 'A'))
        self.assertFalse(audit.matches('C-bat', 'after_normal_action', 'A', 'A', 'use_item', 'A'))
        self.assertFalse(audit.matches('C-bat', 'after_normal_action', 'A', 'B', 'use_item', 'B'))
        self.assertFalse(audit.matches('C-bat', 'after_normal_action', 'A', 'B', 'place_companion', 'A'))
        with self.assertRaises(ValueError):
            audit.matches('C-cat_friend', 'after_normal_action', 'A', 'B', 'use_item', 'A')


if __name__ == '__main__':
    unittest.main()
