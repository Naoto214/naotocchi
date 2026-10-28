"""Release contract: only the adopted game ships; legacy source/saves remain."""
import hashlib
import json
from html.parser import HTMLParser
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[2]
LEGACY = ('prototypes/growth-chain/', 'prototypes/growth-clear/', 'prototypes/slide08/')

class MenuLinks(HTMLParser):
    """Read link labels independently of decorative wrappers/classes."""
    def __init__(self, html):
        super().__init__()
        self.links = []
        self.current = None
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        if tag == 'a':
            self.current = [dict(attrs).get('href'), []]

    def handle_data(self, data):
        if self.current is not None:
            self.current[1].append(data.strip())

    def handle_endtag(self, tag):
        if tag == 'a' and self.current is not None:
            self.links.append(self.current)
            self.current = None

class NaopoyoPublicationTests(unittest.TestCase):
    def setUp(self):
        self.manifest = json.loads((ROOT / 'tools/pages/allowlist.json').read_text())
        self.files = set(self.manifest['files'])

    def test_public_entry_has_one_official_destination(self):
        portal = (ROOT / 'prototypes/naopoyo/index.html').read_text()
        self.assertIn('<title>なおぽよ。</title>', portal)
        self.assertIn('url=../naopoyo-chapter1/index.html', portal)
        self.assertIn('href="../naopoyo-chapter1/index.html"', portal)
        self.assertNotIn('series.mjs', portal)
        main = (ROOT / 'index.html').read_text()
        official = [href for href, labels in MenuLinks(main).links if 'なおぽよ。' in labels]
        self.assertEqual(official, ['prototypes/naopoyo/'])
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
        # Reviewed v1 store: additionally accepts exact 702721a clearance terrain.
        # destination-only + pointer-app tests verify exact old-save/Undo round trips
        # and retry onto current terrain. Schema, key and prior migrations are unchanged.
        source = ROOT / 'prototypes/naopoyo-rescue/store.mjs'
        self.assertEqual(hashlib.sha256(source.read_bytes()).hexdigest(), '77023825f71ee98a547f66edf054e5af2ae87eacb43c41983d229b7bb70675ff')
        portal=(ROOT/'prototypes/naopoyo/index.html').read_text()
        self.assertNotIn('localStorage',portal)
        self.assertNotIn('<script',portal)

    def test_chapter_runtime_ships_without_trial_pages(self):
        for name in ['index.html','app.mjs','stages.mjs','progress.mjs','render.mjs','style.css']:
            self.assertIn('prototypes/naopoyo-chapter1/'+name,self.files)
        for path in ['prototypes/naopoyo-chapter1/qa.html','prototypes/naopoyo-chapter1/ability.html','prototypes/naopoyo-chapter1/ability-lab.mjs','prototypes/naopoyo-chapter1/ability-ui.mjs','prototypes/naopoyo-world/index.html','prototypes/naopoyo-insight/index.html','prototypes/naopoyo-v2/index.html']:
            self.assertNotIn(path,self.files)
        chapter=(ROOT/'prototypes/naopoyo-chapter1/index.html').read_text()
        self.assertIn('href="../naopoyo-rescue/index.html"',chapter)
        self.assertIn('href="../../"',chapter)
        self.assertNotIn('正式版と別の記録', (ROOT/'prototypes/naopoyo-chapter1/app.mjs').read_text())
