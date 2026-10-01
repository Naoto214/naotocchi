import copy,unittest
import proxy_resource_value_trajectory as t

class NormalChainTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.initial=next(x for x in t.load_initial_routes() if x['path_id']=='probe-02-b-first')
        boundary=next(b for b in cls.initial['inputs']['boundaries'] if b['event_seq']==4 and b['path_id']==cls.initial['path_id'])
        cls.state=t._current(boundary['continuation'],4)
        cls.history=boundary['public_history']
        cls.record=t._normal_selection(cls.state,cls.initial,t.POLICIES[1],cls.history)
    def activate(self,state=None,record=None):
        return t.apply_selected(state or self.state,record or self.record,dict(self.initial['inputs'],public_history=self.history))
    def test_normal_quick_item_pays_once_and_opens_chain(self):
        before=copy.deepcopy(self.state);record=copy.deepcopy(self.record)
        self.assertEqual(record['selected_action']['card_id'],'I-c_coin2')
        after,events=self.activate()
        self.assertEqual(self.state,before);self.assertEqual(self.record,record)
        actor=before['game_state']['turn_player'];other='B' if actor=='A' else 'A';source=record['selected_action']['source_instance_id']
        self.assertEqual(after['game_state']['players'][actor]['time'],before['game_state']['players'][actor]['time']-1)
        self.assertNotIn(source,after['game_state']['players'][actor]['hand'])
        self.assertEqual(after['activation_zone'][0]['source_instance_id'],source)
        self.assertEqual(after['response_context']['chain_status'],'building')
        self.assertEqual(after['response_context']['window_kind'],'after_normal_action')
        self.assertEqual(after['response_context']['priority_actor'],actor)
        self.assertEqual(after['response_context']['origin_event_seq'],5)
        self.assertEqual(events[0]['selected_candidate'],record['selected_candidate'])
        self.assertEqual(events[0]['game_state_before_sha256'],t.start.opening._stop_state_sha256(before['game_state']))
        self.assertEqual(events[0]['continuation_state_after_sha256'],t.start._hash(after))
    def test_effect_waits_for_both_passes_and_reuses_resolution(self):
        after,_=self.activate();actor=self.state['game_state']['turn_player']
        self.assertEqual(after['game_state']['players'][actor]['growth'],self.state['game_state']['players'][actor]['growth'])
        for _ in range(2):
            who=after['response_context']['priority_actor'];after,event=t.normal.response_120.apply_response_pass(after,dict(actor=who,selected_candidate='response-pass',selected_action=t.start.response.build_response_pass_detail()))
        self.assertEqual(after['response_context']['chain_status'],'resolving')
        link=after['activation_zone'][0]
        resolved,event=t.coin_resolution.resolve_item(after,dict(chain_link_id=link['link_id'],source_instance_id=link['source_instance_id']))
        self.assertEqual(resolved['activation_zone'],[])
        self.assertEqual(resolved['game_state']['phase'],'normal_action')
        self.assertEqual(resolved['game_state']['players'][actor]['time'],self.state['game_state']['players'][actor]['time']-1)
        self.assertIn(link['source_instance_id'],resolved['game_state']['players'][actor]['discard'])
    def test_activation_does_not_peek_at_hidden_deck(self):
        changed=copy.deepcopy(self.state);changed['game_state']['players']['B']['deck'].reverse()
        changed['continuation_state_sha256']=t.start._hash(changed)
        after,events=t._activate_normal_coin(changed,self.record)
        self.assertEqual(after['game_state']['players']['B']['deck'],changed['game_state']['players']['B']['deck'])
        self.assertEqual(after['game_state']['players']['B']['growth'],changed['game_state']['players']['B']['growth'])
        self.assertNotIn('revealed_instance_id',events[0])
        self.assertEqual(events[0]['selected_candidate'],self.record['selected_candidate'])
    def test_unknown_trigger_scope_stops_before_payment(self):
        changed=copy.deepcopy(self.state);changed['game_state']['players']['A']['reservations']=[{'unknown':True}]
        before=copy.deepcopy(changed)
        with self.assertRaises(t.normal.RulesStop):t._activate_normal_coin(changed,self.record)
        self.assertEqual(changed,before)

    def test_forged_action_rejected_before_payment(self):
        forged=copy.deepcopy(self.record);forged['selected_action']['target_instance_ids']=['missing']
        with self.assertRaises(ValueError):self.activate(record=forged)
        self.assertIn(self.record['selected_action']['source_instance_id'],self.state['game_state']['players']['B']['hand'])

if __name__=='__main__':unittest.main()
