import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
CHECKOUT = ROOT / 'tools/work/checkout.py'
GUARD = ROOT / 'tools/work/check_storage.py'


def git(repo, *args):
    return subprocess.check_output(['git', '-C', str(repo), *args], text=True).strip()


class WorkTools(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.repo = self.root / 'source'
        self.repo.mkdir()
        git(self.repo, 'init', '-q', '-b', 'main')
        git(self.repo, 'config', 'user.email', 'fixture@example.invalid')
        git(self.repo, 'config', 'user.name', 'Fixture')
        git(self.repo, 'config', 'uploadpack.allowFilter', 'true')
        git(self.repo, 'config', 'uploadpack.allowAnySHA1InWant', 'true')
        self.runtime = ['index.html', 'assets/official.png',
                        'prototypes/card-game/art-pilot/approved-colors.mjs',
                        'prototypes/story/dist/index.html']
        for path in self.runtime:
            self.put(path, 'runtime bytes')
        self.put('docs/qa/character-3d-full-v0/raw.zip', 'historical evidence')
        self.put('docs/qa/meguru-3d-ci/old.png', 'old review')
        self.put('prototypes/card-game/art-pilot/illustrations/card.png', 'original bytes')
        self.put('prototypes/card-game/art-pilot/previews/approved.png', 'approved bytes')
        self.put('tests/ui-test.cjs', 'test input')
        self.put('tools/pages/allowlist.json', json.dumps({'files': self.runtime}))
        self.put('tools/work/storage-exceptions.json', '{}')
        self.base = self.commit()

    def put(self, path, data):
        p = self.repo / path
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(data)

    def commit(self):
        git(self.repo, 'add', '.')
        git(self.repo, 'commit', '-qm', 'fixture')
        return git(self.repo, 'rev-parse', 'HEAD')

    def run_checkout(self, dest, **extra):
        return subprocess.run([sys.executable, str(CHECKOUT), str(dest),
                               '--repository', self.repo.as_uri(), '--ref', self.base],
                              capture_output=True, text=True, **extra)

    def guard(self):
        return subprocess.run([sys.executable, str(GUARD), '--repo', str(self.repo),
                               '--base', self.base, '--head', 'HEAD'],
                              capture_output=True, text=True)

    def test_home_checkout_preserves_runtime_and_expands_without_changing_source(self):
        dest = self.root / 'home'
        r = self.run_checkout(dest)
        self.assertEqual(r.returncode, 0, r.stderr)
        for path in self.runtime:
            self.assertEqual((dest / path).read_text(), 'runtime bytes')
        self.assertTrue((dest / 'tests/ui-test.cjs').exists())
        self.assertFalse((dest / 'docs/qa').exists())
        self.assertFalse((dest / 'prototypes/card-game/art-pilot/illustrations').exists())
        self.assertFalse((dest / 'prototypes/card-game/art-pilot/previews').exists())
        self.assertEqual(git(dest, 'status', '--porcelain'), '')
        self.assertEqual(git(dest, 'config', 'remote.origin.partialclonefilter'), 'blob:none')
        (dest / '.work-output').mkdir()
        (dest / '.work-output/qa.png').write_text('temporary QA')
        self.assertEqual(git(dest, 'status', '--porcelain'), '')
        original = git(self.repo, 'rev-parse', 'HEAD:prototypes/card-game/art-pilot/illustrations/card.png')
        self.assertIn('?' + original, git(dest, 'rev-list', '--objects', '--missing=print', 'HEAD'))
        git(dest, 'sparse-checkout', 'disable')
        self.assertEqual((dest / 'prototypes/card-game/art-pilot/illustrations/card.png').read_text(), 'original bytes')
        self.assertEqual((dest / 'docs/qa/character-3d-full-v0/raw.zip').read_text(), 'historical evidence')
        self.assertEqual(git(self.repo, 'rev-parse', 'HEAD'), self.base)

    def test_existing_destination_and_symlink_are_untouched(self):
        dest = self.root / 'existing'
        dest.mkdir()
        (dest / 'sentinel').write_text('keep')
        link = self.root / 'link'
        link.symlink_to(dest, target_is_directory=True)
        for target in [dest, link]:
            r = self.run_checkout(target)
            self.assertNotEqual(r.returncode, 0)
        self.assertEqual((dest / 'sentinel').read_text(), 'keep')
        self.assertFalse((dest / '.git').exists())

    def test_server_without_filter_is_refused_before_creating_destination(self):
        git(self.repo, 'config', 'uploadpack.allowFilter', 'false')
        dest = self.root / 'unsupported'
        r = self.run_checkout(dest)
        self.assertNotEqual(r.returncode, 0)
        self.assertIn('filter', r.stderr)
        self.assertFalse(dest.exists())

    def test_missing_runtime_path_fails_without_checking_out_files(self):
        self.put('tools/pages/allowlist.json', json.dumps({'files': self.runtime + ['missing.png']}))
        self.base = self.commit()
        dest = self.root / 'invalid'
        r = self.run_checkout(dest)
        self.assertNotEqual(r.returncode, 0)
        self.assertFalse((dest / 'index.html').exists())

    def test_old_evidence_and_new_official_art_are_allowed(self):
        self.put('assets/new-official.png', 'approved art')
        self.commit()
        r = self.guard()
        self.assertEqual(r.returncode, 0, r.stderr + r.stdout)

    def test_main_advancing_does_not_reclassify_untouched_evidence(self):
        git(self.repo, 'checkout', '-qb', 'feature')
        self.put('index.html', 'feature UI')
        self.commit()
        git(self.repo, 'checkout', '-q', 'main')
        self.put('docs/qa/meguru-3d-ci/old.png', 'main updated evidence')
        main_tip = self.commit()
        git(self.repo, 'checkout', '-q', 'feature')
        r = subprocess.run([sys.executable, str(GUARD), '--repo', str(self.repo),
                            '--base', main_tip, '--head', 'HEAD'], capture_output=True, text=True)
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)

    def test_new_qa_archive_and_large_simulation_need_explicit_preservation(self):
        for path, data in [('docs/qa/new.png', 'pixels'),
                           ('snapshot.tar.gz', 'archive'),
                           ('docs/card-game/data/run.json', 'x' * 1048577)]:
            self.put(path, data)
        self.commit()
        r = self.guard()
        self.assertNotEqual(r.returncode, 0)
        for path in ['docs/qa/new.png', 'snapshot.tar.gz', 'docs/card-game/data/run.json']:
            self.assertIn(path, r.stdout)

    def test_hash_bound_exception_allows_intentional_evidence_but_not_overwrite(self):
        import hashlib
        self.put('docs/qa/approved.png', 'evidence')
        self.put('tools/work/storage-exceptions.json', json.dumps({
            'docs/qa/approved.png': {'sha256': hashlib.sha256(b'evidence').hexdigest(),
                                    'reason': 'Approved immutable milestone evidence'}}))
        self.commit()
        r = self.guard()
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.put('docs/qa/approved.png', 'different')
        self.commit()
        self.assertNotEqual(self.guard().returncode, 0)


if __name__ == '__main__':
    unittest.main()
