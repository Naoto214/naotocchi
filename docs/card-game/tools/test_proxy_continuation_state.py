import copy
import unittest
import proxy_resource_value_integration as saved
try:
    import proxy_continuation_state as state
except ImportError:
    state = None


def fixture():
    row = next(r for r in saved.load_saved()['paired']['results']
               if r['run_id'] == 'resource_value_pilot_v1:probe-02-a-first')
    return copy.deepcopy(row['final_continuation_state']), row['last_valid_event_seq']


def equipped(envelope):
    result = copy.deepcopy(envelope)
    owner = result['legacy_continuation']['game_state']['players']['A']
    owner['hand'].remove('A-032#1')
    owner['board']['prepared'].append('A-032#1')
    result['runtime']['attachments']['A-032#1'] = dict(controller='A', target_instance_id='A-019#1', attached_event_seq=25)
    result['runtime']['public_prepared']['A-032#1'] = dict(controller='A', face_up=True, paid_time=2, placed_event_seq=25)
    return result


class StateTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source, cls.seq = fixture()

    def setUp(self):
        self.assertIsNotNone(state, 'versioned continuation state contract not implemented')
        self.envelope = state.create(self.source, self.seq)

    def test_runtime_is_hashed_and_input_is_not_shared(self):
        before = copy.deepcopy(self.source)
        other = equipped(self.envelope)
        self.assertNotEqual(state.state_hash(other), state.state_hash(self.envelope))
        other['runtime']['attachments']['A-032#1']['target_instance_id'] = 'other'
        self.assertEqual(self.source, before)
        with self.assertRaises(ValueError): state.validate(other)

    def test_hidden_deck_and_hand_order_do_not_change_visible_view(self):
        other = copy.deepcopy(self.envelope)
        game = other['legacy_continuation']['game_state']
        game['players']['A']['deck'].reverse()
        game['players']['B']['hand'].reverse()
        self.assertEqual(state.visible(self.envelope, 'A'), state.visible(other, 'A'))
        self.assertNotEqual(state.state_hash(self.envelope), state.state_hash(other))

    def test_attachment_target_is_public_and_bound(self):
        e = equipped(self.envelope)
        state.validate(e)
        view = state.visible(e, 'B')
        self.assertEqual(view['runtime']['attachments']['A-032#1']['target_instance_id'], 'A-019#1')
        bad = copy.deepcopy(e)
        bad['runtime']['attachments']['A-032#1']['target_instance_id'] = 'B-001#1'
        with self.assertRaises(ValueError): state.validate(bad)

    def test_missing_or_duplicate_equipment_location_rejected(self):
        e = equipped(self.envelope)
        for mode in ('missing', 'duplicate', 'metadata'):
            bad = copy.deepcopy(e)
            owner = bad['legacy_continuation']['game_state']['players']['A']
            if mode == 'missing': owner['board']['prepared'].clear()
            elif mode == 'duplicate': owner['hand'].append('A-032#1')
            else: bad['runtime']['public_prepared'].clear()
            with self.subTest(mode=mode), self.assertRaises(ValueError): state.validate(bad)

    def test_target_departure_discards_equipment_and_clears_relation(self):
        e = equipped(self.envelope)
        result = state.detach_target(e, 'A-019#1')
        self.assertEqual(result['legacy_continuation']['game_state']['players']['A']['board']['prepared'], [])
        self.assertIn('A-032#1', result['legacy_continuation']['game_state']['players']['A']['discard'])
        self.assertEqual(result['runtime']['attachments'], {})
        self.assertIn('A-032#1', e['runtime']['attachments'])

    def test_same_person_in_two_board_roles_rejected(self):
        e=copy.deepcopy(self.envelope)
        b=e['legacy_continuation']['game_state']['players']['A']['board']
        b['companions'].append(b['partner'])
        with self.assertRaises(ValueError):state.validate(e)

    def test_unknown_or_unhashed_fields_rejected(self):
        for key in ('schema', 'execution_contract_id', 'extra'):
            bad = copy.deepcopy(self.envelope); bad[key] = 'unknown'
            with self.subTest(key=key), self.assertRaises(ValueError): state.validate(bad)
        bad = copy.deepcopy(self.envelope); bad['runtime']['extra'] = 1
        with self.assertRaises(ValueError): state.validate(bad)

    def test_advance_preserves_runtime_and_rejects_untracked_departure(self):
        e = equipped(self.envelope)
        updated = copy.deepcopy(e['legacy_continuation'])
        updated['game_state']['players']['A']['time'] = 0
        result = state.advance(e, updated, 26)
        self.assertEqual(result['runtime'], e['runtime'])
        updated['game_state']['players']['A']['board']['partner'] = None
        with self.assertRaises(ValueError): state.advance(e, updated, 26)

    def test_ability_use_count_and_turn_are_hashed_and_checked(self):
        e = equipped(self.envelope)
        e['runtime']['ability_uses'] = [{'source_instance_id':'A-032#1','ability_key':'start_draw',
            'turn_player':'A','round':2,'count':1}]
        self.assertNotEqual(state.state_hash(e), state.state_hash(equipped(self.envelope)))
        for field, value in [('count', True), ('round', 0), ('source_instance_id', 'missing')]:
            bad = copy.deepcopy(e); bad['runtime']['ability_uses'][0][field] = value
            with self.subTest(field=field), self.assertRaises(ValueError): state.validate(bad)


if __name__ == '__main__': unittest.main()
