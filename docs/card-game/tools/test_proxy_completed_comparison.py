import copy
import unittest
import proxy_completed_comparison as c

class CompletedComparisonTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):cls.inputs=c.load_inputs()

    def test_complete_fixed_design_and_correct_denominators(self):
        result=c.summarize(*self.inputs)
        self.assertEqual(len(result['routes']),8)
        self.assertEqual(len(result['pairs']),4)
        self.assertEqual(result['shadow']['compared'],241)
        self.assertEqual(result['shadow']['unsupported'],72)
        self.assertEqual(result['policies'][c.OLD]['normal']['fallback'],dict(count=4,denominator=108,rate=4/108))
        self.assertEqual(result['policies'][c.NEW]['normal']['fallback'],dict(count=151,denominator=205,rate=151/205))

    def test_snapshot_entries_cover_new_generic_event_names(self):
        result=c.summarize(*self.inputs)
        route=next(r for r in result['routes'] if r['policy_id']==c.NEW and r['path_id']=='probe-01-a-first')
        self.assertEqual(route['board_entries']['main'],7)
        self.assertEqual(route['main_births'],2)
        self.assertEqual(route['historical_named_placement_events']['play_main_birth'],1)
        self.assertEqual(route['runtime_effects']['stat_effects']['created'],1)
        self.assertEqual(route['runtime_effects']['stat_effects']['retired'],1)

    def test_duplicate_or_missing_trajectory_rejected(self):
        for rows in (self.inputs[0]['results'][:-1],self.inputs[0]['results'][:-1]+self.inputs[0]['results'][:1]):
            bad=dict(self.inputs[0],results=rows)
            with self.assertRaises(ValueError):c.summarize(bad,*self.inputs[1:])

    def test_snapshot_hash_tampering_rejected(self):
        bad=copy.deepcopy(self.inputs[0]);bad['results'][0]['snapshots'][1]['runtime']['attachments']['forged']={}
        with self.assertRaises(ValueError):c.summarize(bad,*self.inputs[1:])

    def test_rate_zero_is_null_and_no_independent_sample_claim(self):
        self.assertEqual(c.rate(0,0),dict(count=0,denominator=0,rate=None))
        result=c.summarize(*self.inputs)
        self.assertFalse(result['policy_promoted']);self.assertEqual(result['independent_balance_sample_count'],0)
        self.assertFalse(result['old_new_head_to_head'])

    def test_legacy_boundary_coverage_and_inputs_unchanged(self):
        before=c.sha(self.inputs);result=c.summarize(*self.inputs)
        self.assertEqual(c.sha(self.inputs),before)
        self.assertEqual(sum(result['legacy_boundary_groups'].values()),72)

    def test_shadow_and_boundary_ids_must_match_exactly(self):
        paired,shadow,limits=self.inputs
        variants=[(shadow,dict(limits,rows=[])),
                  (shadow,dict(limits,rows=limits['rows'][:-1]+limits['rows'][:1])),
                  (dict(shadow,results=shadow['results'][:-1]+shadow['results'][:1]),limits),
                  (dict(shadow,planned_ids=shadow['planned_ids'][:-1]+shadow['planned_ids'][:1]),limits),
                  (shadow,dict(limits,groups=dict(challenge_and_pass=46,safe_development_and_challenge=22,uncertified_partner_arrival=4)))]
        for index,(s,l) in enumerate(variants):
            with self.subTest(index=index):
                with self.assertRaises(ValueError):c.summarize(paired,s,l)

if __name__=='__main__':unittest.main()
