"""Reject protocol drift and unsafe manifest promotion; no seed generation."""
import copy
import json
from pathlib import Path
import tempfile
import unittest

try:
    import proxy_population_contract as subject
except ImportError:
    subject = None
ROOT = Path(__file__).resolve().parents[1]
CONTRACT = ROOT / 'data/proxy-admission-contract-459/contract.json'


class ProtocolTests(unittest.TestCase):
    def setUp(self):
        self.assertIsNotNone(subject, 'population contract validator absent')
        self.contract = json.loads(CONTRACT.read_text())

    def test_approved_protocol_is_non_executable_and_nonmutating(self):
        before = copy.deepcopy(self.contract)
        result = subject.validate_protocol(self.contract, ROOT)
        self.assertTrue(result['valid'], result)
        self.assertFalse(result['executable'])
        self.assertIsNone(result['balance_admitted'])
        self.assertEqual(self.contract, before)

    def test_protocol_mutations_cannot_self_authorize(self):
        changes = [('planned_group_count', v) for v in (199, 201, True, 200.0)]
        changes += [('planned_match_count', v) for v in (399, 401)]
        changes += [(k, True) for k in ('executable', 'input_generation_authorized', 'execution_authorized')]
        changes += [('actual_manifest', {}), ('extra', 0)]
        for key, value in changes:
            data = copy.deepcopy(self.contract); data[key] = value
            with self.subTest(key=key, value=value):
                self.assertFalse(subject.validate_protocol(data, ROOT)['valid'])
        del self.contract['actual_seeds']
        self.assertFalse(subject.validate_protocol(self.contract, ROOT)['valid'])

    def test_untrusted_anchor_and_missing_source_fail_closed(self):
        with tempfile.TemporaryDirectory() as name:
            root = Path(name)
            path = root / 'data/proxy-admission-contract-459/contract.json'
            path.parent.mkdir(parents=True)
            path.write_text(CONTRACT.read_text())
            self.assertFalse(subject.validate_protocol(self.contract, root)['valid'])
            self.contract['planned_match_count'] = 1
            path.write_text(json.dumps(self.contract))
            self.assertFalse(subject.validate_protocol(self.contract, root)['valid'])

    def test_duplicate_keys_and_nonfinite_json_are_rejected(self):
        with tempfile.TemporaryDirectory() as name:
            path = Path(name) / 'input.json'
            for raw in ('{"a":1,"a":2}', '{"nested":{"a":1,"a":2}}', '{"a":NaN}', '{"a":Infinity}', '{"a":1e999}', '[]'):
                path.write_text(raw)
                with self.subTest(raw=raw), self.assertRaises(ValueError):
                    subject.load_json(path)

    def test_source_paths_cannot_escape_root(self):
        self.assertTrue(subject.source_path(ROOT, 'data/proxy-admission-design-458/deck-reference.json').is_file())
        for path in ('../outside', '/tmp/file', 'data/../01-core-rules.md', './01-core-rules.md'):
            with self.subTest(path=path), self.assertRaises(ValueError):
                subject.source_path(ROOT, path)
        with tempfile.TemporaryDirectory() as name:
            root = Path(name) / 'root'; root.mkdir()
            target = Path(name) / 'outside'; target.write_text('x')
            (root / 'link').symlink_to(target)
            with self.assertRaises(ValueError): subject.source_path(root, 'link')


class ManifestTests(unittest.TestCase):
    def setUp(self):
        self.assertTrue(hasattr(subject, 'validate_manifest'), 'manifest validator absent')
        self.contract = json.loads(CONTRACT.read_text())

    def metadata(self):
        # Abstract identifiers only: neither seeds nor card orders are created.
        groups = [{'group_id': 'test-group-' + str(i)} for i in range(1, 201)]
        matches = []
        order = []
        for i, group in enumerate(groups, 1):
            for first in 'AB':
                matches.append(dict(match_id=group['group_id'] + first,
                    group_id=group['group_id'], first_player=first,
                    input_sha256=('a' if first == 'A' else 'b') * 64,
                    policy_versions={'normal': '114_with_116',
                                     'mandatory': 'existing_contracts_with_116', 'response': '119'}))
            order.extend(group['group_id'] + first for first in ('AB' if i % 2 else 'BA'))
        return groups, matches, order

    def test_exact_membership_accepts_only_mirrored_metadata(self):
        groups, matches, order = self.metadata()
        before = copy.deepcopy((groups, matches, order))
        self.assertEqual(subject.validate_membership(groups, matches, order), [])
        self.assertEqual((groups, matches, order), before)
        mutations = [lambda g,m,o: g.pop(), lambda g,m,o: m.pop(),
                     lambda g,m,o: m.append(copy.deepcopy(m[0])),
                     lambda g,m,o: m[1].update(first_player='A'),
                     lambda g,m,o: m[1].update(group_id='unknown'),
                     lambda g,m,o: m[1].update(policy_versions={}),
                     lambda g,m,o: o.reverse(),
                     lambda g,m,o: g[1].update(group_id=g[0]['group_id'])]
        for mutation in mutations:
            g,m,o = self.metadata(); mutation(g,m,o)
            with self.subTest(mutation=mutation):
                self.assertTrue(subject.validate_membership(g,m,o))

    def test_manifest_cannot_be_approved_by_receipt_booleans(self):
        for manifest in (None, {}, {'groups': [], 'matches': []}):
            result = subject.validate_manifest(manifest, {'approved': True, 'before_outcomes': True}, self.contract, ROOT)
            self.assertFalse(result['valid'])
            self.assertIsNone(result['balance_admitted'])
            self.assertIn('input_lock_authentication_unavailable', result['gaps'])

    def test_missing_real_inputs_remains_unproved_after_topology_passes(self):
        groups,matches,order = self.metadata()
        manifest = dict(schema='planned_population_manifest_future_v1_spec_only',
                        groups=groups,matches=matches,execution_order=order,
                        protocol_sha256=subject.PROTOCOL_SHA256,
                        source_versions={},python_version=None,
                        historical_registry_sha256=None,generation_provenance=None,lock_evidence=None)
        result = subject.validate_manifest(manifest, {}, self.contract, ROOT)
        self.assertFalse(result['structurally_valid'])
        self.assertFalse(result['valid'])
        self.assertTrue(any('seed' in e for e in result['errors']))

    def test_saved_order_validation_preserves_physical_multiplicity(self):
        source = json.loads((ROOT / 'data/proxy-fixtures-107/fixture-107-normal-decision-a-first.json').read_text())
        plan = json.loads((ROOT / 'data/proxy-normal-decision-first-choice-plan-115-20260918.json').read_text())
        original = source['input']['players'][0]['deck_order_top_to_bottom']
        player = plan['orders'][0]['players'][0]
        saved = player['deck_order_top_to_bottom']
        self.assertEqual(subject.validate_order(saved, player['seed'], original), [])
        for seed in (True, -1, 2**128, None, 1.0):
            with self.subTest(seed=seed): self.assertTrue(subject.validate_order(saved, seed, original))
        altered = copy.deepcopy(saved); altered[-1] = copy.deepcopy(altered[0])
        self.assertTrue(subject.validate_order(altered, player['seed'], original))
        self.assertTrue(subject.validate_order(list(reversed(saved)), player['seed'], original))
        altered = copy.deepcopy(saved); altered[0]['extra'] = 'unapproved'
        self.assertTrue(subject.validate_order(altered, player['seed'], original))


    def test_complete_shape_is_not_generation_or_lock_authentication(self):
        # Repeated historical orders, in memory only; deliberately NOT a new
        # independent input set. No sampling, new shuffle or saved manifest.
        groups, matches, order = self.metadata()
        saved = json.loads((ROOT / 'data/proxy-normal-decision-first-choice-plan-115-20260918.json').read_text())
        players = {p['player_id']: p for p in saved['orders'][0]['players']}
        import hashlib
        for g in groups:
            for actor in 'AB':
                g['seed_' + actor] = players[actor]['seed']
                g['full_order_' + actor] = copy.deepcopy(players[actor]['deck_order_top_to_bottom'])
            g['generation_attempt_ref'] = 'historical-test-reference'
        byid = {g['group_id']: g for g in groups}
        for m in matches:
            group = byid[m['group_id']]
            payload = {'first_player': m['first_player'], 'players': [
                {'player_id': a, 'deck_order_top_to_bottom': group['full_order_' + a]} for a in 'AB']}
            m['input_sha256'] = hashlib.sha256((json.dumps(payload, ensure_ascii=False,
                sort_keys=True, indent=2, allow_nan=False) + '\n').encode()).hexdigest()
        manifest = dict(schema='planned_population_manifest_future_v1_spec_only',
            protocol_sha256=subject.PROTOCOL_SHA256, source_versions=self.contract['sources_sha256'],
            python_version='historical-test-only', historical_registry_sha256='0'*64,
            generation_provenance={}, lock_evidence={}, groups=groups, matches=matches, execution_order=order)
        result = subject.validate_manifest(manifest, {'approved': True}, self.contract, ROOT)
        self.assertTrue(result['structurally_valid'], result['errors'])
        self.assertFalse(result['valid'])
        self.assertIn('historical_registry_verifier_unavailable', result['gaps'])
        self.assertEqual(result.get('checks_scope'), 'implemented_structure_only_not_full_manifest_certification')
        for key,value in [('input_sha256','0'*64), ('owner','B')]:
            bad = copy.deepcopy(manifest); bad['matches'][0][key] = value
            self.assertFalse(subject.validate_manifest(bad, {}, self.contract, ROOT)['structurally_valid'])
        bad = copy.deepcopy(manifest); bad['groups'][0]['seed_B'] = bad['groups'][0]['seed_A']
        self.assertFalse(subject.validate_manifest(bad, {}, self.contract, ROOT)['structurally_valid'])


if __name__ == '__main__':
    unittest.main()
