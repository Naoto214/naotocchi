import unittest
import proxy_new_seed_boundary_225 as subject

class Boundary225Test(unittest.TestCase):
    def test_saved_event_phase_and_corrected_stop(self):
        rows={r['path_id']:r for r in subject.build_report()['results']}
        self.assertEqual('unproved_next_priority_response_candidates',
                         rows['probe-01-a-first']['corrected_stop_reason_code'])
        self.assertTrue(all(not subject.validate_result(r) for r in rows.values()))

if __name__=='__main__':unittest.main()
