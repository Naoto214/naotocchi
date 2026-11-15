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

    def test_naopoyo_owner_trials_stay_out_of_the_real_package(self):
        # The approved gate painter is already a formal runtime dependency.
        # Its optional animation must not pull in the owner-only controller,
        # 100-stage/book entrypoints, atlas or contact-comparison experiment.
        prefixes = ('prototypes/naopoyo-100/', 'prototypes/naopoyo-shared/',
                    'prototypes/naopoyo-chapter2/contact-comparison/',
                    'docs/naopoyo-gimmick-atlas-v2/',
                    'docs/naopoyo-100-v1/', 'docs/naopoyo-100-v2/')
        result = self.package.validate(ROOT, self.manifest)
        self.assertIn('prototypes/naopoyo-chapter2/gate-art.mjs', result['files'])
        self.assertEqual([f for f in result['files'] if f.startswith(prefixes)], [])
        tokens = ('naopoyo-100/', 'naopoyo-shared/', 'contact-comparison/',
                  'naopoyo-gimmick-atlas-v2/', 'naopoyo-100-v1/', 'naopoyo-100-v2/')
        self.assertEqual([f for f in result['files'] if f.endswith(TEXT)
                          and any(token in (ROOT / f).read_text(errors='ignore')
                                  for token in tokens)], [])


if __name__ == '__main__':
    unittest.main()
