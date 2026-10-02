import copy
import json
from pathlib import Path
import unittest
import proxy_continuation_state as state
try:
    import proxy_continuation_board_links as links
except ImportError:
    links=None

class BoardLinkTests(unittest.TestCase):
    def setUp(self):
        self.assertIsNotNone(links,'board ability references still counted as physical moves')
        self.e=json.loads((Path(__file__).resolve().parents[1]/'data/proxy-continuation-capabilities-436/verification/board-link-reproduction.json').read_text())
    def test_actual_board_activation_keeps_card_and_hashes_reference(self):
        before=copy.deepcopy(self.e)
        with links.scope():
            state.validate(self.e);digest=state.state_hash(self.e)
            self.assertIn('A-015#1',self.e['legacy_continuation']['game_state']['players']['A']['board']['companions'])
            self.e['legacy_continuation']['activation_zone'][0]['link_id']+='-changed'
            self.assertNotEqual(digest,state.state_hash(self.e))
        before['legacy_continuation']['activation_zone'][0]['link_id']+='-changed';self.assertEqual(self.e,before)
    def test_foreign_owner_or_wrong_card_reference_rejected(self):
        for field,value in [('actor','B'),('card_id','C-bat'),('card_copy_id','wrong')]:
            e=copy.deepcopy(self.e);e['legacy_continuation']['activation_zone'][0][field]=value
            with self.subTest(field=field),links.scope(),self.assertRaises(ValueError):state.validate(e)
    def test_duplicate_physical_location_is_still_rejected(self):
        self.e['legacy_continuation']['game_state']['players']['A']['hand'].append('A-015#1')
        with links.scope(),self.assertRaises(ValueError):state.validate(self.e)
    def test_duplicate_link_and_missing_board_source_are_rejected(self):
        for mode in ('duplicate','missing'):
            e=copy.deepcopy(self.e)
            if mode=='duplicate':e['legacy_continuation']['activation_zone'].append(copy.deepcopy(e['legacy_continuation']['activation_zone'][0]))
            else:e['legacy_continuation']['game_state']['players']['A']['board']['companions'].remove('A-015#1')
            with self.subTest(mode=mode),links.scope(),self.assertRaises(ValueError):state.validate(e)
    def test_validation_scope_restores_historical_default(self):
        original=state.validate
        with links.scope():
            with links.scope():state.validate(self.e)
        self.assertIs(state.validate,original)
        with self.assertRaises(ValueError):state.validate(self.e)
    def test_hand_and_board_link_ids_share_one_namespace(self):
        for reverse in (False,True):
            e=copy.deepcopy(self.e);payload=e['legacy_continuation'];game=payload['game_state']
            source='A-033#1';game['players']['A']['deck'].remove(source)
            card=game['cards'][source]
            hand_link=dict(payload['activation_zone'][0],
                action_type='use_item',source_instance_id=source,
                card_id=card['card_id'],card_copy_id=card['card_copy_id'],
                payment={'time':1},source_references=['77-current-items-card-text-draft.md#I-c_coin2'])
            hand_link.pop('source_zone')
            payload['activation_zone'].append(hand_link)
            if reverse:payload['activation_zone'].reverse()
            with self.subTest(reverse=reverse),links.scope():
                with self.assertRaises(ValueError):state.validate(e)
                with self.assertRaises(ValueError):state.state_hash(e)
                hand_link['link_id']+='-distinct'
                state.validate(e)
                self.assertEqual(len(payload['activation_zone']),2)

if __name__=='__main__':unittest.main()
