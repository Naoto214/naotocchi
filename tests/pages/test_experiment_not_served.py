"""The #498 card experiment and #563 home comparison are private preview inputs.
Check both the actual Pages manifest and the validated publication plan.
"""
import importlib.util
import json
import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[2]
SCRIPT = ROOT / 'tools/pages/package.py'
PRIVATE_TRIALS = (
    'prototypes/card-game/variable-life-20261031',
    'comparisons/home-beauty-v3',
)
TEXT = ('.html', '.js', '.mjs', '.cjs', '.css', '.json', '.svg', '.txt', '.webmanifest')


class ExperimentNotServedTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        spec = importlib.util.spec_from_file_location('pages_package', SCRIPT)
        cls.package = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cls.package)
        cls.manifest = json.loads((ROOT / 'tools/pages/allowlist.json').read_text())

    def test_allowlist_has_no_experiment_path(self):
        for trial in PRIVATE_TRIALS:
            with self.subTest(trial=trial):
                hits = [f for f in self.manifest['files'] if f == trial or f.startswith(trial + '/')]
                self.assertEqual(hits, [])

    def test_real_package_plan_has_no_experiment_file(self):
        result = self.package.validate(ROOT, self.manifest)
        for trial in PRIVATE_TRIALS:
            with self.subTest(trial=trial):
                hits = [f for f in result['files'] if f == trial or f.startswith(trial + '/')]
                self.assertEqual(hits, [])

    def test_no_published_file_refers_to_the_experiment(self):
        for file in self.manifest['files']:
            if file.endswith(TEXT):
                contents = (ROOT / file).read_text(errors='ignore')
                for trial in PRIVATE_TRIALS:
                    self.assertNotIn(trial.rsplit('/', 1)[-1], contents,
                                     f'{file} references private trial {trial}')


if __name__ == '__main__':
    unittest.main()
