import copy,gzip,hashlib,json,unittest
import proxy_resource_value_trajectory as t

class ResponseTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        root=t.DATA/'proxy-resource-value-pilot'
        delta=json.loads((root/'trajectory-checkpoint-425/paired-delta.json').read_text())
        raw=gzip.decompress((root/delta['base_file']).read_bytes())
        assert hashlib.sha256(raw).hexdigest()==delta['base_raw_sha256']
        data=json.loads(raw)
        for patch in delta['replacement_fields']:
            assert data['results'][patch['result_index']]['run_id']==patch['run_id']
            data['results'][patch['result_index']][patch['field']]=patch['value']
        assert hashlib.sha256((json.dumps(data,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()).hexdigest()==delta['reconstructed_raw_sha256']
        cls.rows=data['results']
    def state(self,run):
        row=next(x for x in self.rows if x['run_id']==run)
        return t._current(row['final_continuation_state'],row['last_valid_event_seq']),row['events']
    def enumerate(self,state,events):
        import proxy_resource_value_response as response
        return response.enumerate_opportunity(state,events)
    def test_hand_quick_uses_are_kept_in_complete_inventory(self):
        state,events=self.state(t.POLICIES[0]+':probe-02-a-first')
        chance=self.enumerate(state,events)
        ids=chance['legal_candidate_ids']
        self.assertEqual(ids,['response-pass','response-use-item-B-033#1'])
        self.assertEqual(chance['legal_candidate_details'][1]['card_id'],'I-c_coin2')
        self.assertIn('response-pass',ids)
        self.assertTrue(chance['candidate_set_complete'])
    def test_public_cost_adjustment_main_is_not_an_extra_response(self):
        state,events=self.state(t.POLICIES[1]+':probe-01-a-first');before=copy.deepcopy(state)
        chance=self.enumerate(state,events)
        self.assertEqual(chance['legal_candidate_ids'],['response-pass'])
        self.assertTrue(any(x.get('card_id')=='M-antlion-01' and x['reason_code']=='cost_adjustment_not_response' for x in chance['excluded_candidates']))
        self.assertEqual(state,before)
    def test_turn_end_partner_is_excluded_from_placement_response(self):
        state,events=self.state(t.POLICIES[1]+':probe-02-a-first')
        chance=self.enumerate(state,events)
        self.assertEqual(chance['legal_candidate_ids'],['response-pass'])
        self.assertTrue(any(x.get('card_id')=='P-desert_scorpion' for x in chance['excluded_candidates']))
    def test_first_date_target_is_regenerated_from_public_board(self):
        state,events=self.state(t.POLICIES[0]+':probe-01-a-first')
        chance=self.enumerate(state,events)
        action=next(x for x in chance['legal_candidate_details'] if x.get('card_id')=='E-first-date')
        actor=state['response_context']['priority_actor'];partner=state['game_state']['players'][actor]['board']['partner']
        self.assertEqual(action['target_instance_ids'],[partner])
        self.assertTrue(action['candidate_id'].endswith('-target-'+partner))
    def test_first_date_activation_reuses_existing_chain_transition(self):
        state,events=self.state(t.POLICIES[0]+':probe-01-a-first')
        action=next(x for x in self.enumerate(state,events)['legal_candidate_details'] if x.get('card_id')=='E-first-date')
        record=dict(actor=state['response_context']['priority_actor'],selected_candidate=action['candidate_id'],selected_action=action)
        before=copy.deepcopy(state)
        after,generated=t.apply_selected(state,record,dict(public_events=events))
        actor=record['actor']
        self.assertEqual(after['game_state']['players'][actor]['time'],before['game_state']['players'][actor]['time']-1)
        self.assertEqual(after['response_context']['chain_status'],'building')
        self.assertNotIn(action['source_instance_id'],after['game_state']['players'][actor]['hand'])
        self.assertEqual(generated[0]['action_type'],'activate_response')
        self.assertEqual(state,before)
        forged=copy.deepcopy(record);forged['selected_action']['target_instance_ids']=['missing']
        with self.assertRaises(ValueError):t.apply_selected(state,forged,dict(public_events=events))

    def test_missing_history_and_prepared_scope_fail_closed(self):
        state,events=self.state(t.POLICIES[1]+':probe-01-a-first')
        with self.assertRaises(ValueError):self.enumerate(state,events[:-1])
        state['game_state']['players'][state['response_context']['priority_actor']]['board']['prepared']=['unknown']
        with self.assertRaises(ValueError):self.enumerate(state,events)

if __name__=='__main__':unittest.main()
