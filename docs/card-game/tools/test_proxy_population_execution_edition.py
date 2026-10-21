"""Synthetic Git source fixtures; no input material or games."""
import copy,subprocess,tempfile,unittest
from pathlib import Path
try:import proxy_population_execution_edition as api
except ImportError:api=None

class EditionTests(unittest.TestCase):
 def test_saved_sources_python_and_tools_are_exact_but_not_authorization(self):
  self.assertIsNotNone(api)
  with tempfile.TemporaryDirectory() as temp:
   repo=Path(temp);root=repo/'docs/card-game';(root/'tools').mkdir(parents=True)
   (root/'tools/entry.py').write_text('value = 1\n');(root/'01.md').write_text('synthetic canonical source\n')
   def git(*args):return subprocess.check_output(['git','-C',temp,*args],stderr=subprocess.DEVNULL).decode().strip()
   git('init');git('config','user.email','fixture@example.invalid');git('config','user.name','fixture');git('add','.');git('commit','-m','synthetic source edition')
   commit=git('rev-parse','HEAD');certificate=api.capture(repo,commit)
   out=api.verify(certificate,repo)
   self.assertTrue(out['local_edition_verified'],out['errors']);self.assertFalse(out['ready_for_execution']);self.assertFalse(out['remote_publication_verified'])
   self.assertIsNone(out['balance_admitted'])
   bundle=dict(source_versions={name:row['sha256'] for name,row in certificate['files'].items()},python_version=certificate['python']['version'])
   self.assertTrue(api.audit_bundle_edition(bundle,certificate,repo)['bundle_edition_bound'])
   for mutate in (lambda b:b['source_versions'].pop('01.md'),lambda b:b.update(python_version='unbound'),lambda b:b['source_versions'].update(extra='0'*64)):
    bad=copy.deepcopy(bundle);mutate(bad)
    self.assertFalse(api.audit_bundle_edition(bad,certificate,repo)['bundle_edition_bound'])
   (root/'data').mkdir();(root/'data/new-record.json').write_text('{}')
   self.assertTrue(api.verify(certificate,repo)['local_edition_verified'])
   (repo/'unrelated.txt').write_text('outside permitted source scope')
   self.assertTrue(api.verify(certificate,repo)['local_edition_verified'])
   for name in ('01.md','tools/entry.py'):
    p=root/name;before=p.read_bytes();p.write_text('changed')
    self.assertFalse(api.verify(certificate,repo)['local_edition_verified']);p.write_bytes(before)
   new=root/'tools/injected.py';new.write_text('value=2')
   self.assertFalse(api.verify(certificate,repo)['local_edition_verified']);new.unlink()
   for key,value in [('commit','HEAD'),('tree','0'*40),('python',{}),('approved',True)]:
    bad=copy.deepcopy(certificate);bad[key]=value
    self.assertFalse(api.verify(bad,repo)['local_edition_verified'])
   bad=copy.deepcopy(certificate);bad['files'].pop('01.md')
   self.assertFalse(api.verify(bad,repo)['local_edition_verified'])
   (root/'01.md').unlink();self.assertFalse(api.verify(certificate,repo)['local_edition_verified'])


class EditionBindingTests(unittest.TestCase):
 def test_git_replacement_cannot_redefine_saved_source(self):
  self.assertIsNotNone(api)
  with tempfile.TemporaryDirectory() as temp:
   root=Path(temp)/'docs/card-game';root.mkdir(parents=True);p=root/'source.md';p.write_text('original')
   def git(*a):return subprocess.check_output(['git','-C',temp,*a],stderr=subprocess.DEVNULL).decode().strip()
   git('init');git('config','user.email','fixture@example.invalid');git('config','user.name','fixture');git('add','.');git('commit','-m','first');first=git('rev-parse','HEAD')
   certificate=api.capture(temp,first);p.write_text('replacement');git('add','.');git('commit','-m','second');second=git('rev-parse','HEAD')
   git('replace',first,second)
   self.assertFalse(api.verify(certificate,temp)['local_edition_verified'])
   p.write_text('original');self.assertTrue(api.verify(certificate,temp)['local_edition_verified'])

if __name__=='__main__':unittest.main()
