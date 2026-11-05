"""U18 (owner-approved 2026-11-05): Draft PR #498's experiment directory is excluded from the
"protected files stay byte-identical" check in tests/home-production-test.cjs only because it is
never published. This test keeps that true for the real repository and the real Pages allowlist."""
import importlib.util
import json
import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[2]
SCRIPT = ROOT / 'tools/pages/package.py'
EXPERIMENT = 'prototypes/card-game/variable-life-20261031'
TEXT = ('.html', '.js', '.mjs', '.cjs', '.css', '.json', '.svg', '.txt', '.webmanifest')


class ExperimentNotServedTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        spec = importlib.util.spec_from_file_location('pages_package', SCRIPT)
        cls.package = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cls.package)
        cls.manifest = json.loads((ROOT / 'tools/pages/allowlist.json').read_text())

    def test_allowlist_has_no_experiment_path(self):
        hits = [f for f in self.manifest['files'] if f == EXPERIMENT or f.startswith(EXPERIMENT + '/')]
        self.assertEqual(hits, [])

    def test_real_package_plan_has_no_experiment_file(self):
        result = self.package.validate(ROOT, self.manifest)
        hits = [f for f in result['sha256'] if f.startswith(EXPERIMENT + '/')]
        self.assertEqual(hits, [])

    def test_no_published_file_refers_to_the_experiment(self):
        hits = [f for f in self.manifest['files'] if f.endswith(TEXT)
                and 'variable-life-20261031' in (ROOT / f).read_text(errors='ignore')]
        self.assertEqual(hits, [])


if __name__ == '__main__':
    unittest.main()
