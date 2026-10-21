import copy
import unittest
import proxy_completed_comparison as saved
try:
    import proxy_fallback_audit as audit
except ModuleNotFoundError:
    audit = None

class FallbackAuditTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.inputs = saved.load_inputs()

    def run_audit(self, *inputs):
        self.assertIsNotNone(audit, 'read-only fallback audit is not implemented')
        return audit.audit(*(inputs or self.inputs))

    def test_denominators_and_exclusive_common_causes(self):
        r = self.run_audit()
        self.assertEqual(r['summary']['compared'], 241)
        self.assertEqual(r['summary']['fallback'], 182)
        self.assertEqual(r['summary']['groups'], {'legacy_time_unique':128, 'legacy_safe_free_unique':46, 'already_seeded':8})
        self.assertEqual(r['summary']['frontier_pairs'], 1457)
        self.assertEqual(len(r['unsupported_ids']), 72)
        self.assertFalse(set(r['unsupported_ids']) & {x['shadow_id'] for x in r['rows']})

    def test_duplicate_shadow_and_missing_limit_rejected(self):
        p,s,l=self.inputs
        for ss,ll in [(dict(s,results=s['results'][:-1]+s['results'][:1]),l),(s,dict(l,rows=l['rows'][:-1]))]:
            with self.assertRaises(ValueError):self.run_audit(p,ss,ll)

    def test_source_problem_tampering_rejected(self):
        p,s,l=self.inputs;s=copy.deepcopy(s)
        s['results'][0]['problem']['candidates'][0]['payment_time']+=1
        with self.assertRaises(ValueError):self.run_audit(p,s,l)

    def test_saved_wrapper_tampering_rejected(self):
        p,s,l=self.inputs;s=copy.deepcopy(s)
        s['results'][0]['policies'][saved.NEW]['choice']['selected_candidate']='pass'
        with self.assertRaises(ValueError):self.run_audit(p,s,l)

    def test_sensitivity_is_not_a_policy_change_and_inputs_unchanged(self):
        before=saved.sha(self.inputs);r=self.run_audit()
        self.assertEqual(saved.sha(self.inputs),before)
        self.assertEqual(r['summary']['pilot_wrappers_reproduced'],313)
        self.assertEqual(r['summary']['optimistic_hand_reservation_equal']['fallback'],182)
        self.assertEqual(r['summary']['optimistic_hand_reservation_equal']['changed_frontiers'],0)
        self.assertFalse(r['summary']['optimistic_hand_reservation_equal']['approved_evidence'])
        self.assertFalse(r['policy_promoted'])
        self.assertEqual(r['independent_balance_sample_count'],0)

    def test_legacy_counterfactual_selection_tampering_rejected(self):
        p,s,l=self.inputs;s=copy.deepcopy(s)
        s['results'][0]['policies'][saved.OLD]['selected_candidate']='pass'
        with self.assertRaises(ValueError):self.run_audit(p,s,l)

    def test_outer_selection_and_selected_action_bind_to_verified_choice(self):
        p,s,l=self.inputs
        for policy,field in [(saved.NEW,'selected_candidate'),(saved.NEW,'selected_action'),(saved.OLD,'selected_action')]:
            bad=copy.deepcopy(s)
            target=bad['results'][0]['policies'][policy]
            if field=='selected_candidate':target[field]='NOT_A_LEGAL_CANDIDATE'
            else:target[field]=dict(target[field],card_id='not_the_selected_card')
            with self.subTest(policy=policy,field=field):
                with self.assertRaises(ValueError):self.run_audit(p,bad,l)

    def test_duplicate_source_decision_rejected(self):
        p,s,l=self.inputs;p=copy.deepcopy(p)
        source=next(d for d in p['results'][0]['decisions'] if 'inventory' in d)
        p['results'][0]['decisions'].append(copy.deepcopy(source))
        with self.assertRaises(ValueError):self.run_audit(p,s,l)

    def test_source_snapshot_tampering_rejected(self):
        p,s,l=self.inputs;p=copy.deepcopy(p)
        p['results'][0]['snapshots'][0]['legacy_continuation']['game_state']['players']['A']['time']+=1
        with self.assertRaises(ValueError):self.run_audit(p,s,l)

if __name__ == '__main__':unittest.main()
