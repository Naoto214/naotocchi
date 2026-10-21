import hashlib,subprocess,tempfile,unittest
from pathlib import Path
from proxy_mandatory_policy_contract import canonical
try:import proxy_population_input_lock as api
except ImportError:api=None
class LockTests(unittest.TestCase):
 def test_exact_git_binding_is_not_publication_provenance_or_authority(self):
  self.assertIsNotNone(api)
  with tempfile.TemporaryDirectory() as temp:
   root=Path(temp)
   def git(*a):return subprocess.check_output(['git','-C',temp,*a],stderr=subprocess.DEVNULL).decode().strip()
   git('init');git('config','user.email','fixture@example.invalid');git('config','user.name','fixture')
   value={'synthetic':True};(root/'input.json').write_bytes(canonical(value));git('add','input.json');git('commit','-m','fixture')
   receipt=dict(commit=git('rev-parse','HEAD'),tree=git('rev-parse','HEAD^{tree}'),path='input.json',blob=git('rev-parse','HEAD:input.json'),canonical_sha256=hashlib.sha256(canonical(value)).hexdigest())
   r=api.verify_git_binding(value,receipt,root);self.assertTrue(r['immutable_content_verified']);self.assertFalse(r['input_lock_verified'])
   (root/'input.json').write_text('working file differs');self.assertTrue(api.verify_git_binding(value,receipt,root)['immutable_content_verified'])
   for k,v in [('commit','HEAD'),('tree','0'*40),('blob','0'*40),('path','../input.json'),('canonical_sha256','0'*64),('approved',True)]:
    bad=dict(receipt);bad[k]=v;self.assertFalse(api.verify_git_binding(value,bad,root)['immutable_content_verified'])
   self.assertFalse(api.verify_git_binding({'synthetic':False},receipt,root)['immutable_content_verified'])
   changed={'synthetic':False};(root/'input.json').write_bytes(canonical(changed));git('add','input.json');git('commit','-m','replacement fixture')
   forged=dict(receipt,tree=git('rev-parse','HEAD^{tree}'),blob=git('rev-parse','HEAD:input.json'),canonical_sha256=hashlib.sha256(canonical(changed)).hexdigest())
   git('replace',receipt['commit'],git('rev-parse','HEAD'))
   self.assertFalse(api.verify_git_binding(changed,forged,root)['immutable_content_verified'])
   self.assertTrue(api.verify_git_binding(value,receipt,root)['immutable_content_verified'])
   git('replace','-d',receipt['commit']);git('replace',receipt['blob'],forged['blob'])
   blob_forgery=dict(receipt,canonical_sha256=hashlib.sha256(canonical(changed)).hexdigest())
   self.assertFalse(api.verify_git_binding(changed,blob_forgery,root)['immutable_content_verified'])
   self.assertTrue(api.verify_git_binding(value,receipt,root)['immutable_content_verified'])
if __name__=='__main__':unittest.main()
