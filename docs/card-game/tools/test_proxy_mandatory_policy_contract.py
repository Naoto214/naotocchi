"""Catch serialization coercion and unauthenticated contract substitution."""
import copy
import json
from pathlib import Path
import tempfile
import unittest
import proxy_mandatory_policy_contract as policy


class ContractTests(unittest.TestCase):
    def test_compact_utf8_and_types(self):
        self.assertEqual(policy.canonical({'z': False, 'a': ['猫', 1]}),
                         '{"a":["猫",1],"z":false}'.encode())
        self.assertNotEqual(policy.canonical(True), policy.canonical(1))
        for bad in [1.0, float('nan'), {'bad': '\ud800'}, {1: 'key'}]:
            with self.subTest(bad=repr(bad)), self.assertRaises(ValueError):
                policy.canonical(bad)

    def test_load_rejects_duplicates_float_and_nonobject(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp) / 'input.json'
            for raw in ['{"a":1,"a":2}', '{"n":1.0}', '{"n":1e999}',
                        '{"n":NaN}', '[]', '{"s":"\\ud800"}']:
                p.write_text(raw)
                with self.subTest(raw=raw), self.assertRaises(ValueError):
                    policy.load_json(p)

    def test_deep_json_is_validation_error(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp) / 'deep.json'
            p.write_text('{"x":' + '['*10000 + '0' + ']'*10000 + '}')
            with self.assertRaises(ValueError):
                policy.load_json(p)

    def test_verified_contract_never_authorizes_execution(self):
        c = policy.load_json(policy.ROOT / policy.CONTRACT_PATH)
        result = policy.validate_contract(c)
        self.assertTrue(result['valid'])
        self.assertFalse(result['execution_authorized'])
        self.assertIsNone(result['policy_eligible'])
        changed = copy.deepcopy(c)
        changed['execution_authorized'] = True
        self.assertFalse(policy.validate_contract(changed)['valid'])
        changed = copy.deepcopy(c)
        changed['independent_balance_samples'] = False
        self.assertFalse(policy.validate_contract(changed)['valid'])

    def test_pinned_source_and_anchor_tamper_rejected(self):
        c = policy.load_json(policy.ROOT / policy.CONTRACT_PATH)
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for name in [policy.CONTRACT_PATH, *c['sources_sha256']]:
                p = root / name
                p.parent.mkdir(parents=True, exist_ok=True)
                p.write_bytes((policy.ROOT / name).read_bytes())
            self.assertTrue(policy.validate_contract(c, root)['valid'])
            (root / '463-precommitted-mandatory-policy-detail.md').write_text('changed')
            self.assertFalse(policy.validate_contract(c, root)['valid'])
            (root / policy.CONTRACT_PATH).write_text(json.dumps(dict(c, sources_sha256={})))
            self.assertFalse(policy.validate_contract(c, root)['valid'])

if __name__ == '__main__':
    unittest.main()
