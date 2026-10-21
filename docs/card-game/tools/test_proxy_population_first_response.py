import copy,json,unittest
from pathlib import Path
from test_proxy_mandatory_population_input import bundle
import proxy_normal_decision_seeded_restart as initial
try:
    import proxy_population_first_response as api
except ImportError:
    api=None

ROOT=Path(__file__).resolve().parents[1]


def game_with(card_id):
    """Permute copies in a synthetic local state, not a sampled initial order."""
    fixture=json.loads((ROOT/'data/proxy-fixtures-107/fixture-107-normal-decision-a-first.json').read_text())
    g=initial.build_initial_state(dict(players=fixture['input']['players']))
    source=next(s for s,c in g['cards'].items() if c['card_id']==card_id)
    actor=source[0];p=g['players'][actor];all_cards=p['hand']+p['deck']
    filler=[s for s in all_cards if s!=source and g['cards'][s]['card_id'][0] in 'MCPW'][:5]
    p['hand']=[source]+filler;p['deck']=[s for s in all_cards if s not in p['hand']];p['time']=1
    g.update(round=1,turn_player=actor,phase='response_window')
    return g,actor,source


class InventoryTests(unittest.TestCase):
    def setUp(self):self.assertIsNotNone(api,'source-bound first response inventory missing')

    def test_all_41_cards_have_a_hand_source_disposition_without_value_scores(self):
        fixture=json.loads((ROOT/'data/proxy-fixtures-107/fixture-107-normal-decision-a-first.json').read_text())
        ids=sorted({c['card_id'] for p in fixture['input']['players'] for c in p['deck_order_top_to_bottom']})
        self.assertEqual(len(ids),41)
        for card in ids:
            g,actor,source=game_with(card);out=api.enumerate_first_response(g,actor)
            want=8 if card=='G-hit-blow' else 2 if card=='I-c_coin2' else 1
            with self.subTest(card=card):
                self.assertEqual(len(out['legal_candidate_ids']),want)
                accounted={d.get('source_instance_id') for d in out['legal_candidate_details']+out['excluded_candidates']}
                self.assertTrue(set(g['players'][actor]['hand'])<=accounted)
                self.assertIn('response-pass',out['legal_candidate_ids'])
                self.assertIsNone(out['policy_eligible'])
                self.assertNotIn('score',out)

    def test_same_named_physical_cards_each_supply_their_own_candidates(self):
        g,actor,source=game_with('G-hit-blow');p=g['players'][actor]
        # Synthetic duplicate-name copy only: 107 itself has one of each name
        # per owner. The bundle wrapper, not this conditional local helper,
        # authenticates the deck inventory. No definition or real input changes.
        other=p['hand'][-1];g['cards'][other]['card_id']='G-hit-blow'
        out=api.enumerate_first_response(g,actor)
        self.assertEqual(len(out['legal_candidate_ids']),15)
        self.assertEqual({d['source_instance_id'] for d in out['legal_candidate_details'] if d.get('card_id')=='G-hit-blow'},{source,other})

    def test_hidden_deck_contents_are_not_part_of_the_candidate_view(self):
        g,actor,_=game_with('G-hit-blow');a=api.enumerate_first_response(g,actor)
        g['players'][actor]['deck'].reverse()
        g['players']['B' if actor=='A' else 'A']['deck'].reverse()
        b=api.enumerate_first_response(g,actor)
        self.assertEqual(a,b)

    def test_boundary_cannot_be_used_for_later_windows_or_changed_resources(self):
        g,actor,_=game_with('C-box')
        mutations=[lambda x:x.update(round=2),lambda x:x.update(phase='normal_action'),
                   lambda x:x['players'][actor].update(time=2),lambda x:x['players'][actor].update(growth=21),
                   lambda x:x['players'][actor]['reservations'].append({'unknown':1}),
                   lambda x:x.update(challenge={}),lambda x:x['players'][actor]['hand'].pop()]
        for change in mutations:
            bad=copy.deepcopy(g);change(bad)
            with self.assertRaises(ValueError):api.enumerate_first_response(bad,actor)


class IntegrationTests(unittest.TestCase):
    def setUp(self):self.assertTrue(hasattr(api,'audit_first_response'),'prefix-to-response adapter missing')

    def test_inventory_is_rederived_from_bundle_not_supplied_claim(self):
        b=bundle();r=api.build_first_response(b,'test-1A')
        self.assertEqual(r['decision_kind'],'response_action')
        self.assertNotIn('arithmetic_proof',r)
        self.assertTrue(api.audit_first_response(r,b,'test-1A')['candidate_binding_verified'])
        self.assertIsNone(r['policy_eligible']);self.assertIsNone(r['balance_admitted'])
        r['inventory']['legal_candidate_ids'].pop()
        self.assertFalse(api.audit_first_response(r,b,'test-1A')['candidate_binding_verified'])
        self.assertFalse(api.audit_first_response({'resolution_mode':'planned_policy_random'},b,'test-1A')['candidate_binding_verified'])

if __name__=='__main__':unittest.main()
