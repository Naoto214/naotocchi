import copy
import tempfile
import unittest
from pathlib import Path
import proxy_resource_value_shadow as shadow

class ShadowTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls): cls.rows=shadow.load_observed_boundaries(shadow.DATA)
    def test_planned_110_ids_exact_and_unique(self):
        from collections import Counter
        self.assertEqual(len(self.rows),110)
        self.assertEqual(len({r['shadow_id'] for r in self.rows}),110)
        self.assertEqual(Counter(r['path_id'] for r in self.rows),{'probe-01-a-first':27,'probe-01-b-first':27,'probe-02-a-first':28,'probe-02-b-first':28})
    def test_legacy_choice_reason_and_seed_match_saved_trace(self):
        successes=[]
        for row in self.rows:
            result=shadow.compare_boundary(row)
            if result['legacy_status']=='reproduced':
                successes.append(result)
                for key in ('selected_candidate','resolution_mode','reason_code','seed_proof'):
                    self.assertEqual(result['legacy'][key],row['decision'].get(key))
        self.assertGreater(len(successes),0)
        self.assertFalse(any(shadow.compare_boundary(r)["status"]=="legacy_reproduction_failure" for r in self.rows))
        row=copy.deepcopy(next(r for r in self.rows if r['decision']['legal_candidates']==['pass']))
        row['decision']['selected_candidate']='forged'
        self.assertEqual(shadow.compare_boundary(row)['status'],'legacy_reproduction_failure')
    def test_all_legacy_traces_reproduce(self):
        for row in self.rows:
            problem=shadow._inputs(row)[0]
            old=shadow.legacy_select(row,problem)
            self.assertEqual(old,{k:row['decision'].get(k) for k in old})

    def test_initial_seed_proof_is_recomputed(self):
        seeded=[r for r in self.rows if r['decision'].get('seed_proof') and r['event_seq']==4]
        self.assertTrue(seeded)
        for row in seeded:
            result=shadow.compare_boundary(row)
            self.assertEqual(result['legacy_status'],'reproduced')
            self.assertEqual(result['legacy']['seed_proof'],row['decision']['seed_proof'])

    def test_unsupported_boundary_is_retained_in_manifest(self):
        row=copy.deepcopy(self.rows[0]);row['decision'].pop('legal_candidate_details')
        result=shadow.compare_boundary(row)
        self.assertEqual(result['shadow_id'],row['shadow_id'])
        self.assertNotEqual(result['status'],'compared')
        self.assertTrue(result['reason'])
    def test_fresh_candidate_enumeration_does_not_trust_saved_boolean(self):
        row=copy.deepcopy(next(r for r in self.rows if r['event_seq']==4))
        row['decision']['legal_candidates']=['pass']
        row['decision']['legal_candidate_details']=[x for x in row['decision']['legal_candidate_details'] if x['candidate_id']=='pass']
        with self.assertRaises(ValueError):shadow._verify_legal_inventory(row)

    def test_shadow_does_not_emit_match_events(self):
        before=shadow.canonical_sha256(self.rows)
        for row in self.rows:
            result=shadow.compare_boundary(row)
            self.assertEqual(result['new_events'],0);self.assertEqual(result['new_decisions'],0)
        self.assertEqual(shadow.canonical_sha256(self.rows),before)
    def test_superseded_history_and_seq2_handover(self):
        self.assertFalse(any('241-' in ref for row in self.rows for ref in row['source_refs']))
        manifest=shadow.source_manifest(shadow.DATA)
        self.assertTrue(any('242-' in ref for ref in manifest))
        shots=shadow.load_history(shadow.DATA,manifest)[1]
        for states in shots.values():
            self.assertIsNotNone(states[2]['continuation_state'])
    def test_write_exact_coverage_and_source_immutability(self):
        with tempfile.TemporaryDirectory() as output:
            report=shadow.run_shadow(shadow.DATA,Path(output))
            self.assertEqual(report['planned'],110)
            self.assertEqual(report['planned_ids'],sorted(r['shadow_id'] for r in report['results']))
            self.assertEqual(sum(report['status_counts'].values()),110)
            self.assertEqual(report['independent_balance_sample_count'],0)

if __name__=='__main__':unittest.main()
