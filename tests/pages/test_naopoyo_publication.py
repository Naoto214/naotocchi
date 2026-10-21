"""Release contract: only the adopted game ships; legacy source/saves remain."""
import hashlib
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[2]
LEGACY = ('prototypes/growth-chain/', 'prototypes/growth-clear/', 'prototypes/slide08/')

class NaopoyoPublicationTests(unittest.TestCase):
    def setUp(self):
        self.manifest = json.loads((ROOT / 'tools/pages/allowlist.json').read_text())
        self.files = set(self.manifest['files'])

    def test_public_entry_has_one_official_destination(self):
        portal = (ROOT / 'prototypes/naopoyo/index.html').read_text()
        self.assertIn('<title>なおぽよ。</title>', portal)
        self.assertIn('url=../naopoyo-rescue/index.html', portal)
        self.assertIn('href="../naopoyo-rescue/index.html"', portal)
        self.assertNotIn('series.mjs', portal)
        main = (ROOT / 'index.html').read_text()
        self.assertIn('<span>なおぽよ。</span>', main)
        self.assertNotIn('スライド・ドロップ', main)

    def test_legacy_runtime_is_not_published_but_sources_are_retained(self):
        for prefix in LEGACY:
            self.assertTrue((ROOT / prefix / 'index.html').is_file())
        self.assertFalse(any(p.startswith(LEGACY) for p in self.files))
        self.assertNotIn('prototypes/naopoyo/legacy.html', self.files)
        self.assertIn('スライド', (ROOT / 'prototypes/naopoyo/legacy.html').read_text())
        self.assertTrue((ROOT / 'prototypes/naopoyo/settings.mjs').is_file())

    def test_current_and_legacy_save_dependencies_ship(self):
        required = ['index.html','app.mjs','style.css','layout.mjs','engine.mjs','input.mjs','store.mjs','render.mjs','fixtures.mjs','conditions.mjs','stages.mjs','themes.mjs','sprites.mjs','sprite-data.mjs','solutions.json','legacy-solutions.json','legacy-stages.mjs','previous-stages.mjs']
        for name in required:
            self.assertIn('prototypes/naopoyo-rescue/'+name,self.files)
        for species in ['dog','clownfish','penguin','frog']:
            for stage in range(1,9):
                self.assertIn(f'assets/characters/{species}/{stage:02}.png',self.files)
        for p in self.manifest.get('dynamic_lists',[]):
            self.assertFalse(p['source'].startswith(LEGACY))

    def test_no_save_migration_or_legacy_reset_is_introduced(self):
        # Exact approved v8 store contract: release routing must not change it.
        source = ROOT / 'prototypes/naopoyo-rescue/store.mjs'
        self.assertEqual(hashlib.sha256(source.read_bytes()).hexdigest(), '683b64a764eabf4ca59009268a25b74dc2991995b3f822725bc42a95f02e1432')
        portal=(ROOT/'prototypes/naopoyo/index.html').read_text()
        self.assertNotIn('localStorage',portal)
        self.assertNotIn('<script',portal)
