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

if __name__=='__main__':unittest.main()
