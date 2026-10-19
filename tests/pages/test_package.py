import importlib.util
import hashlib
import json
import pathlib
import tempfile
import unittest

SCRIPT = pathlib.Path(__file__).resolve().parents[2] / 'tools/pages/package.py'


class PackageTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if not SCRIPT.exists():
            return
        spec = importlib.util.spec_from_file_location('pages_package', SCRIPT)
        cls.module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cls.module)

    def setUp(self):
        self.assertTrue(SCRIPT.exists(), 'runtime allowlist packager must exist')
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = pathlib.Path(self.tmp.name) / 'source'
        self.root.mkdir()
        self.out = pathlib.Path(self.tmp.name) / 'output'
        self.write('index.html', '<script type="module" src="app.mjs?v=1"></script><a href="game/#play">play</a>')
        self.write('app.mjs', 'import "./part.mjs"; const icon="assets/icon.png";')
        self.write('part.mjs', 'export const ok=true;')
        self.write('game/index.html', '<img src="../assets/icon.png">')
        self.write('assets/icon.png', 'image bytes')
        self.manifest = {'version': 1, 'max_bytes': 10000, 'files': ['index.html', 'app.mjs', 'part.mjs', 'game/index.html', 'assets/icon.png']}

    def write(self, path, text):
        p = self.root / path
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(text)

    def build(self):
        return self.module.build(self.root, self.out, self.manifest)

    def test_only_exact_allowlist_is_copied_byte_identically(self):
        self.write('assets/new-original.png', 'do not publish')
        self.write('docs/proof.json', 'do not publish')
        result = self.build()
        self.assertEqual(set(result['files']), set(self.manifest['files']) | {'.nojekyll'})
        for f in self.manifest['files']:
            self.assertEqual((self.root / f).read_bytes(), (self.out / f).read_bytes())
        self.assertFalse((self.out / 'assets/new-original.png').exists())

    def test_missing_import_or_asset_stops_publication(self):
        for missing in ['part.mjs', 'assets/icon.png']:
            with self.subTest(missing=missing):
                manifest = {**self.manifest, 'files': [f for f in self.manifest['files'] if f != missing]}
                with self.assertRaisesRegex(ValueError, 'reference'):
                    self.module.build(self.root, self.out, manifest)
                self.assertFalse(self.out.exists())

    def test_new_referenced_image_must_be_reviewed_into_allowlist(self):
        self.write('assets/new.png', 'new art')
        self.write('part.mjs', 'const url="assets/new.png";')
        with self.assertRaisesRegex(ValueError, 'reference'):
            self.build()

    def test_path_escape_absolute_duplicate_and_symlink_are_rejected(self):
        for path in ['../secret', '/secret', 'assets/../index.html', 'index.html']:
            with self.subTest(path=path):
                with self.assertRaises(ValueError):
                    self.module.build(self.root, self.out, {**self.manifest, 'files': self.manifest['files'] + [path]})
        (self.root / 'link.png').symlink_to(self.root / 'assets/icon.png')
        with self.assertRaisesRegex(ValueError, 'symlink'):
            self.module.build(self.root, self.out, {**self.manifest, 'files': self.manifest['files'] + ['link.png']})

    def test_budget_and_stale_destination_stop_without_deleting_data(self):
        with self.assertRaisesRegex(ValueError, 'budget'):
            self.module.build(self.root, self.out, {**self.manifest, 'max_bytes': 1})
        self.out.mkdir()
        (self.out / 'original.png').write_text('keep me')
        with self.assertRaisesRegex(ValueError, 'empty'):
            self.build()
        self.assertEqual((self.out / 'original.png').read_text(), 'keep me')

    def test_external_fragment_data_and_query_links_are_not_local_files(self):
        self.write('game/index.html', '<a href="#a">a</a><a href="https://example.org/">x</a><img src="data:image/png;base64,eA=="><img src="../assets/icon.png?v=2#x">')
        self.build()

    def test_dynamic_contract_detects_new_sample_not_allowlisted(self):
        self.write('catalog.mjs', 'export const proofs=["a.json","b.json"];')
        self.write('samples/a.json', '{}')
        self.write('samples/b.json', '{}')
        self.manifest['files'] += ['catalog.mjs', 'samples/a.json']
        self.manifest['dynamic_lists'] = [{'source': 'catalog.mjs', 'pattern': '"([^"]+\\.json)"', 'prefix': 'samples/'}]
        with self.assertRaisesRegex(ValueError, 'dynamic'):
            self.build()

    def test_import_named_controls_are_not_module_imports(self):
        self.write('part.mjs', "$('import').onchange=()=>{}; $('from').value; fetch('./samples/'+key+'.json');")
        self.build()

    def test_character_specs_asset_urls_are_document_root_relative(self):
        self.write('character-3d/spec.js', 'const avatar="assets/icon.png";')
        self.manifest['files'].append('character-3d/spec.js')
        self.build()

    def test_sibling_output_path_is_normalized(self):
        self.out = self.root / '../output'
        self.build()

    def test_changed_or_new_runtime_source_requires_dependency_review(self):
        self.manifest['reviewed_runtime_sources'] = {f: hashlib.sha256((self.root / f).read_bytes()).hexdigest() for f in self.manifest['files'] if pathlib.Path(f).suffix in self.module.TEXT}
        self.write('part.mjs', 'const image = `assets/${id}.png`;')
        with self.assertRaisesRegex(ValueError, 'runtime source changed'):
            self.build()
        self.write('new.mjs', 'fetch(base + name);')
        self.manifest['files'].append('new.mjs')
        with self.assertRaisesRegex(ValueError, 'coverage changed'):
            self.build()


if __name__ == '__main__':
    unittest.main()
