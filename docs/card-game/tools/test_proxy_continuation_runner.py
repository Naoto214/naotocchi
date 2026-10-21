import copy
import unittest
import proxy_resource_value_trajectory as old
import proxy_resource_value_integration as saved
import proxy_continuation_state as state
try:
    import proxy_continuation_runner as runner
except ImportError:
    runner=None


class RunnerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.initials=old.load_initial_routes()
        if runner:
            cls.runs=[runner.run_route(i,p) for i in cls.initials for p in old.POLICIES]
    def setUp(self):self.assertIsNotNone(runner,'versioned eight-route runner not implemented')

    def test_four_same_inputs_two_policies_and_no_balance_promotion(self):
        self.assertEqual(len(self.runs),8)
        self.assertEqual(len({r['run_id'] for r in self.runs}),8)
        for initial in self.initials:
            pair=[r for r in self.runs if r['path_id']==initial['path_id']]
            self.assertEqual({r['initial_raw_sha256'] for r in pair},{old.INITIAL_SHA})
            self.assertEqual(pair[0]['initial_manifest_sha256'],pair[1]['initial_manifest_sha256'])
        for row in self.runs:
            self.assertEqual(row['independent_balance_sample_count'],0)
            self.assertFalse(row['policy_promoted'])
            if not row['completed']:self.assertIsNone(row['result']['winner'])

    def test_main_and_attachment_boundaries_progress_without_overwriting_old_runs(self):
        limits={'probe-01-a-first':20,'probe-01-b-first':10,'probe-02-a-first':25,'probe-02-b-first':30}
        for r in self.runs:
            if r['policy_id']==old.POLICIES[1]:
                with self.subTest(path=r['path_id']):self.assertGreater(r['last_valid_event_seq'],limits[r['path_id']])
        self.assertEqual([r['last_valid_event_seq'] for r in saved.load_saved()['paired']['results']], [131,20,140,10,77,25,103,30])

    def test_every_event_binds_complete_runtime_and_contiguous_snapshots(self):
        for r in self.runs:
            self.assertEqual(len(r['snapshots']),len(r['events'])+1)
            for before,after,event in zip(r['snapshots'],r['snapshots'][1:],r['events']):
                self.assertEqual(event['envelope_before_sha256'],state.state_hash(before))
                self.assertEqual(event['envelope_after_sha256'],state.state_hash(after))
                self.assertEqual(event['seq'],after['event_seq'])
        equipped=[s for r in self.runs for s in r['snapshots'] if s['runtime']['attachments']]
        self.assertTrue(equipped)

    def test_independent_replay_rejects_event_or_relation_tampering(self):
        row=self.runs[0];initial=self.initials[0]
        self.assertEqual(runner.validate_route(row,initial,row['policy_id']),[])
        bad=copy.deepcopy(row);bad['events'][0]['envelope_after_sha256']='0'*64
        self.assertTrue(runner.validate_route(bad,initial,row['policy_id']))
        bad=copy.deepcopy(row);bad['snapshots'][-1]['runtime']['attachments']['forged']={}
        self.assertTrue(runner.validate_route(bad,initial,row['policy_id']))

    def test_initial_order_and_response_seed_tampering_rejected(self):
        for field in ('order_id','response_seed_profiles'):
            bad=copy.deepcopy(self.initials[0])
            if field=='order_id':bad[field]='forged'
            else:bad['inputs'][field]=[]
            with self.subTest(field=field),self.assertRaises(ValueError):runner.run_route(bad,old.POLICIES[0])

    def test_all_historical_scope_mismatches_remain_in_denominator(self):
        audit=runner.historical_scope_audit()
        self.assertEqual((audit['planned'],audit['shadow_planned'],audit['stop427_planned']),(21,17,4))
        self.assertEqual(audit['executed'],21)
        self.assertEqual(audit['audited']+audit['stopped'],21)
        self.assertTrue(all(not r['policy_effect_counted'] for r in audit['results']))

    def test_legacy_scope_difference_is_not_policy_effect(self):
        summary=runner.compare_results(self.runs,saved.load_saved()['paired']['results'])
        self.assertEqual(summary['independent_balance_sample_count'],0)
        self.assertFalse(summary['policy_adopted'])
        self.assertEqual(len(summary['historical_execution_differences']),8)
        self.assertEqual(len(summary['paired_policy_comparisons']),4)

class CandidateMeaningTests(unittest.TestCase):
    def test_same_id_payment_or_modifier_change_is_not_lost(self):
        before=dict(candidate_id='same',action_type='attach_item',candidate_variant='default',
            source_instance_id='item',card_id='I-bowtie',target_instance_ids=['person'],
            evidence=dict(payment_time=2,cost_modifiers=[]))
        for evidence in (dict(payment_time=1,cost_modifiers=[]),dict(payment_time=2,cost_modifiers=[{'ability_key':'discount'}])):
            after=copy.deepcopy(before);after['evidence']=evidence
            delta=runner.candidate_differences([before],[after])
            self.assertEqual(len(delta['meaning_changed']),1)
            self.assertEqual(delta['added'],[]);self.assertEqual(delta['removed'],[])

    def test_missing_historical_cost_is_explicitly_unproved(self):
        meaning=runner.candidate_meaning(dict(candidate_id='x',evidence={}))
        self.assertEqual(meaning['cost_specification'],dict(payment_time='unproved',cost_modifiers='unproved'))

if __name__=='__main__':unittest.main()
