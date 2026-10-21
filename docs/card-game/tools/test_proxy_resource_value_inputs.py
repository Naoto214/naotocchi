"""Catch hidden-state leaks and stale/structurally missing evidence."""
import copy
import hashlib
import json
from pathlib import Path
import tempfile
import unittest
import proxy_resource_value_inputs as inputs
import proxy_resource_value_selection as selection
import proxy_normal_decision_hardening as old
from test_proxy_resource_value_selection import selection_problem

DATA=Path(__file__).resolve().parents[1]/'data'

def continuation():
    return copy.deepcopy(json.loads((DATA/'proxy-new-seed-mixed-replay-408-20260930.json').read_text())['results'][0]['final_continuation_state'])

def evidence_for(view):
    p=selection_problem();h=selection.canonical_sha256(view)
    for pair in p['pairs']:pair['view_sha256']=h
    return p, {'candidates':p['candidates'],'pairs':p['pairs'],
               'source_raw_sha256':{'unit-known-facts':'1'*64}}

def inventory_for(p):
    return {'legal_candidate_ids':p['legal_candidate_ids'], 'candidate_set_complete':True,
            'candidate_set_evidence':p['candidate_set_evidence'],
            'legal_candidate_details':[{'candidate_id':x} for x in p['legal_candidate_ids']]}

class ResourceInputsTests(unittest.TestCase):
    def test_hidden_information_does_not_change_view_or_choice(self):
        c=continuation();hidden=c['game_state']['players']['B']['hand'][0]
        c['game_state']['players']['B']['board']['prepared']=[hidden]
        first=inputs.project_visible(c,'A')
        q=copy.deepcopy(c);q['game_state']['players']['B']['hand'].reverse();q['game_state']['players']['A']['deck'].reverse()
        q['game_state']['cards'][hidden]['card_id']='E-secret-other'
        second=inputs.project_visible(q,'A')
        self.assertEqual(first,second)
        p,e=evidence_for(first);p1=inputs.build_problem(first,inventory_for(p),e,p['seed_context'])
        p2=inputs.build_problem(second,inventory_for(p),e,p['seed_context'])
        self.assertEqual(selection.select_problem(p1),selection.select_problem(p2))
        self.assertNotIn('E-secret-other',json.dumps(second))

    def test_known_hand_and_public_cost_are_retained(self):
        c=continuation();own=c['game_state']['players']['A']['hand'][0]
        hidden=c['game_state']['players']['B']['hand'][0]
        c['game_state']['players']['B']['board']['prepared']=[hidden]
        c['game_state']['cards'][hidden]['public_paid_time']=2
        view=inputs.project_visible(c,'A')
        self.assertEqual(view['own_hand'][0]['card_id'],c['game_state']['cards'][own]['card_id'])
        self.assertEqual(view['opponent_board']['prepared'],[{'slot':0,'face_down':True,'paid_time':2}])
        self.assertEqual(old.validate_public_information(view),[])

    def test_evidence_missing_is_not_incomparable(self):
        view=inputs.project_visible(continuation(),'A');p,e=evidence_for(view)
        e['pairs'][0]['relations']['board']='incomparable'
        self.assertEqual(selection.select_problem(inputs.build_problem(view,inventory_for(p),e,p['seed_context']))['selection_basis'],'seeded_frontier')
        e['pairs'][0].pop('source_refs')
        with self.assertRaises(ValueError):inputs.build_problem(view,inventory_for(p),e,p['seed_context'])

    def test_candidate_details_must_bind_full_legal_set(self):
        view=inputs.project_visible(continuation(),'A');p,e=evidence_for(view);inv=inventory_for(p)
        inv['legal_candidate_details'].pop()
        with self.assertRaises(ValueError):inputs.build_problem(view,inv,e,p['seed_context'])

    def test_fresh_source_hash_and_return_mutation(self):
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/'facts.json';path.write_text('{}\n');manifest={'facts.json':hashlib.sha256(path.read_bytes()).hexdigest()}
            self.assertEqual(inputs.validate_sources(manifest,Path(folder)),[])
            path.write_text('[]\n');self.assertTrue(inputs.validate_sources(manifest,Path(folder)))
        c=continuation();view=inputs.project_visible(c,'A');view['own_hand'].clear()
        self.assertTrue(inputs.project_visible(c,'A')['own_hand'])

    def test_source_escape_and_unbound_pair_reference_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            self.assertTrue(inputs.validate_sources({'../outside':'1'*64},Path(folder)))
        view=inputs.project_visible(continuation(),'A');p,e=evidence_for(view)
        e['pairs'][0]['source_refs']=['not-bound']
        with self.assertRaises(ValueError):inputs.build_problem(view,inventory_for(p),e,p['seed_context'])

    def test_unknown_reservation_data_cannot_leak_into_view(self):
        c=continuation();c['game_state']['players']['B']['reservations']=[{'secret_deck_top':'secret'}]
        with self.assertRaises(ValueError):inputs.project_visible(c,'A')
