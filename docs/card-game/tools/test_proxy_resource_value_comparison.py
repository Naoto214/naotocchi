"""Catch early time pruning, false dominance and order-dependent selection."""
import copy
import itertools
import unittest
import proxy_resource_value_comparison as comparison

HASH = '1' * 64
REL = {'hand': 'equal', 'board': 'equal', 'reservations': 'equal'}

def problem_for(times, relations=None, *, upper_values=None):
    ids = list('abc')[:len(times)]
    candidates = []
    for i, (cid, time) in enumerate(zip(ids, times)):
        up = (upper_values or [(0, 0, 0)] * len(ids))[i]
        candidates.append(dict(candidate_id=cid, avoid_loss_or_abort=up[0],
            maintain_or_prevent_100=up[1], certain_growth_difference=up[2],
            time_after_certain_resolution=time, payment_time=10-time,
            consumed_card_count=0, card_copy_id=f'A-00{i+1}#1'))
    best = max(tuple(c[k] for k in comparison.UPPER_KEYS) for c in candidates)
    upper = [c['candidate_id'] for c in candidates if tuple(c[k] for k in comparison.UPPER_KEYS) == best]
    pairs = [dict(left_id=a, right_id=b, view_sha256=HASH, kind='ordinary',
             relations=copy.deepcopy(relations or REL), reason='unit public facts',
             source_refs=['unit-known-facts']) for a, b in itertools.combinations(upper, 2)]
    return dict(view_sha256=HASH, legal_candidate_ids=ids,
        candidate_set_evidence={'candidate_set_complete': True}, candidates=candidates,
        pairs=pairs, seed_context={})

def rename(p, old, new):
    p['legal_candidate_ids'] = sorted(new if x == old else x for x in p['legal_candidate_ids'])
    for c in p['candidates']:
        if c['candidate_id'] == old: c['candidate_id'] = new
    for pair in p['pairs']:
        for key in ('left_id', 'right_id'):
            if pair[key] == old: pair[key] = new
    return p

class ResourceComparisonTests(unittest.TestCase):
    def test_paid_board_tradeoff_preserves_both_candidates(self):
        p = problem_for([10, 7], {**REL, 'board':'worse'})
        self.assertEqual(comparison.compare_problem(p)['frontier_ids'], ['a','b'])

    def test_all_components_dominance_selects_a(self):
        p = problem_for([10, 7], {**REL, 'board':'better'})
        self.assertEqual(comparison.compare_problem(p)['selected_candidate'], 'a')

    def test_upper_three_priorities_unchanged(self):
        for key in range(3):
            up = [0,0,0]; up[key]=1
            p = problem_for([1,10], upper_values=[up,[0,0,0]])
            self.assertEqual(comparison.compare_problem(p)['selected_candidate'], 'a')

    def test_all_equal_uses_existing_tie_break(self):
        p = problem_for([5,5]); p['candidates'][1]['payment_time']=0
        self.assertEqual(comparison.compare_problem(p)['selected_candidate'], 'b')

    def test_partial_equality_does_not_shrink_incomparable_frontier(self):
        p = problem_for([5,5,5])
        for pair in p['pairs'][1:]: pair['relations']['board']='incomparable'
        r = comparison.compare_problem(p)
        self.assertEqual(r['frontier_ids'], ['a','b','c'])
        self.assertIsNone(r['selected_candidate'])

    def test_safe_free_dominance_is_only_against_pass(self):
        p = rename(problem_for([5,5,2], {**REL, 'board':'incomparable'}), 'b','pass')
        pair = p['pairs'][0]; pair['kind']='certified_safe_free_development'
        pair['safe_placement']=dict(candidate_id='a',card_copy_id='A-001#1',person_type='companion',
            slot_empty=True,actual_time_cost=0,replacement_required=False,additional_card_consumption=0,
            certain_downside=False,legality='confirmed',unresolved_required_choice=False)
        p['candidates'][0]['payment_time']=0
        self.assertEqual(comparison.compare_problem(p)['frontier_ids'], ['a','c'])
        bad = copy.deepcopy(p); bad['pairs'][0]['right_id']='c'
        self.assertTrue(comparison.validate_problem(bad))
        bad=copy.deepcopy(p);bad['pairs'][0]['safe_placement']['actual_time_cost']=1
        self.assertTrue(comparison.validate_problem(bad))

    def test_candidate_order_invariance(self):
        p = problem_for([5,5,5], {**REL, 'board':'incomparable'})
        for order in itertools.permutations(p['candidates']):
            q=copy.deepcopy(p);q['candidates']=list(order);q['pairs'].reverse()
            self.assertEqual(comparison.compare_problem(q)['frontier_ids'], ['a','b','c'])

    def test_invalid_pair_and_numeric_types_rejected(self):
        p=problem_for([5,5])
        mutations=[lambda q:q['pairs'].clear(),lambda q:q['pairs'].append(copy.deepcopy(q['pairs'][0])),
            lambda q:q['candidates'][0].update(time_after_certain_resolution=True),
            lambda q:q['pairs'][0]['relations'].update(board='invented'),
            lambda q:q['pairs'][0].update(view_sha256='2'*64),
            lambda q:q['pairs'][0].update(source_refs=[])]
        for mutate in mutations:
            q=copy.deepcopy(p);mutate(q)
            with self.subTest(mutate=mutate):
                self.assertTrue(comparison.validate_problem(q))
                with self.assertRaises(ValueError):comparison.compare_problem(q)

    def test_dominance_cycle_rejected(self):
        p=problem_for([5,5,5], {**REL,'board':'better'})
        p['pairs'][1]['relations']['board']='worse'
        with self.assertRaises(ValueError):comparison.compare_problem(p)

    def test_equal_copy_ids_do_not_invent_target_tie_break(self):
        p=problem_for([5,5]);p['candidates'][1]['card_copy_id']='A-001#1'
        self.assertIsNone(comparison.compare_problem(p)['selected_candidate'])

    def test_input_and_return_objects_are_isolated(self):
        p=problem_for([5,5]);old=copy.deepcopy(p);r=comparison.compare_problem(p)
        r['frontier_ids'].clear()
        self.assertEqual(p,old)
        self.assertEqual(comparison.compare_problem(p)['frontier_ids'],['a','b'])

    def test_malformed_json_values_return_validation_errors(self):
        for v in [None,[],{}, {'candidates':None}]:
            self.assertTrue(comparison.validate_problem(v))

    def test_malformed_safe_certificate_reports_errors(self):
        p=rename(problem_for([5,5]), 'b','pass')
        pair=p['pairs'][0];pair['kind']='certified_safe_free_development'
        pair['safe_placement']={'candidate_id': []}
        self.assertTrue(comparison.validate_problem(p))

    def test_pass_empty_copy_id_preserves_legacy_tie_break(self):
        p=rename(problem_for([5,5]), 'a','pass')
        p['candidates'][0]['card_copy_id']=''
        self.assertEqual(comparison.compare_problem(p)['selected_candidate'],'pass')
