import copy
import unittest
import proxy_resource_value_trajectory as t

class PublicProofTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):cls.initials=t.load_initial_routes()
    def test_end_to_end_normal_selection_ignores_hidden_deck_and_hand_order(self):
        compared=0
        for initial in self.initials:
            for b in initial['inputs']['boundaries']:
                if b['path_id']!=initial['path_id']:continue
                state=t._current(b['continuation'],b['event_seq'])
                try:original=t._normal_selection(state,initial,t.POLICIES[1],b['public_history'])
                except ValueError:continue
                changed=copy.deepcopy(state);actor=b['actor'];other='B' if actor=='A' else 'A'
                for player in changed['game_state']['players'].values():player['deck'].reverse()
                changed['game_state']['players'][other]['hand'].reverse()
                changed['continuation_state_sha256']=t.start._hash(changed)
                self.assertEqual(t.project_visible(state,actor),t.project_visible(changed,actor))
                selected=t._normal_selection(changed,initial,t.POLICIES[1],b['public_history'])
                self.assertEqual(selected['selection'],original['selection'],(initial['path_id'],b['event_seq']))
                compared+=1
        self.assertEqual(compared,93)
    def test_public_flags_and_history_are_bound_before_evidence_reuse(self):
        initial=self.initials[0];b=next(x for x in initial['inputs']['boundaries'] if x['path_id']==initial['path_id'] and x['event_seq']==53)
        state=t._current(b['continuation'],53);bad=copy.deepcopy(state)
        bad['game_state']['players']['B']['person_placed']=not bad['game_state']['players']['B']['person_placed']
        self.assertNotEqual(t._public_proof_key(state,'B',b['public_history']),t._public_proof_key(bad,'B',b['public_history']))
        history=copy.deepcopy(b['public_history']);history['normal_challenge_losses_by_actor']=['B']
        self.assertNotEqual(t._public_proof_key(state,'B',b['public_history']),t._public_proof_key(state,'B',history))
        with self.assertRaisesRegex(ValueError,'public history'):
            t._normal_selection(state,initial,t.POLICIES[1],history)

if __name__=='__main__':unittest.main()
