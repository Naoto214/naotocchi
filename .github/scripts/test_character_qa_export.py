import base64,contextlib,importlib.util,io,json,os,tempfile,unittest,warnings,zipfile
from unittest.mock import patch
from pathlib import Path
spec=importlib.util.spec_from_file_location('exporter',Path(__file__).with_name('character_qa_export.py'))
class ExportTests(unittest.TestCase):
 def load(self):
  self.assertTrue(Path(spec.origin).exists(),'reusable exporter exists');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
 def zip(self,files):
  b=io.BytesIO()
  with zipfile.ZipFile(b,'w') as z:
   for name,data in files.items():z.writestr(name,data)
  return b.getvalue()
 def test_selects_original_bytes_and_metadata_without_other_families(self):
  m=self.load();raw=self.zip({'mythic/phoenix-1-front.jpg':b'original','mythic/god-3-front.jpg':b'other','mythic/evidence.json':json.dumps({'source':'a'*40}).encode()});r=m.select_files(raw,['phoenix'],'a'*40);self.assertEqual(r['mythic/phoenix-1-front.jpg'],b'original');self.assertNotIn('mythic/god-3-front.jpg',r);self.assertIn('mythic/evidence.json',r)
 def test_rejects_traversal_duplicate_and_wrong_source(self):
  m=self.load()
  for files in [{'../phoenix-1-front.jpg':b'x'},{'evidence.json':json.dumps({'source':'b'*40}).encode()}]:
   with self.assertRaises(ValueError):m.select_files(self.zip(files),['phoenix'],'a'*40)
  b=io.BytesIO()
  with warnings.catch_warnings():
   warnings.filterwarnings('ignore',message="Duplicate name: 'phoenix-1-front.jpg'",category=UserWarning)
   with zipfile.ZipFile(b,'w') as z:z.writestr('phoenix-1-front.jpg',b'a');z.writestr('phoenix-1-front.jpg',b'b')
  with self.assertRaises(ValueError):m.select_files(b.getvalue(),['phoenix'],'a'*40)
 def test_rejects_same_image_basename_in_different_directories(self):
  m=self.load()
  with self.assertRaises(ValueError):m.select_files(self.zip({'a/phoenix-1-front.jpg':b'a','b/phoenix-1-front.jpg':b'b'}),['phoenix'],'a'*40)
 def test_required_counts_fail_closed(self):
  m=self.load()
  with self.assertRaises(ValueError):m.validate_counts({'phoenix-1-front.jpg':b'x'},[{'pattern':'phoenix-[1-8]-front.jpg','count':8}])
 def test_gallery_and_zip_keep_evidence_without_approval_claim(self):
  m=self.load();files={'mythic/phoenix-stages.jpg':b'board','mythic-motion/phoenix-1-motion.jpg':b'states','mythic/phoenix-1-front.jpg':b'raw','mythic/evidence.json':b'{}'};out=m.package_files(files,{'id':12,'digest':'sha256:abc'},'a'*40,'wave');self.assertIn('raw-evidence.zip',out);self.assertEqual(out['mythic/phoenix-stages.jpg'],b'board');self.assertEqual(out['mythic/phoenix-1-front.jpg'],b'raw')
  with zipfile.ZipFile(io.BytesIO(out['raw-evidence.zip'])) as z:self.assertEqual(z.read('mythic/phoenix-1-front.jpg'),b'raw')
  self.assertIn(b'PENDING_VISUAL_REVIEW',out['README.md']);manifest=json.loads(out['manifest.json']);self.assertEqual(len(manifest['files']),4)
 def test_nonplayer_direct_review_surfaces(self):
  m=self.load();files={n:b'image' for n in ['companion-owl-views.jpg','companion-owl-0-front.jpg','companion-owl-distance-front.jpg','partner-cat_ceo-0-back.jpg','author-naoto-0-side.jpg']};out=m.package_files(files,{},'a'*40,'nonplayer')
  for n in files:self.assertEqual(out.get(n),b'image')
  selected=m.select_files(self.zip(files),['companion'],'a'*40);self.assertEqual(set(selected),{n for n in files if n.startswith('companion-')});self.assertIn('companion-owl-0-front.jpg',m.package_files(selected,{},'a'*40,'owl'))
class SourceRunTests(unittest.TestCase):
 load=ExportTests.load
 zip=ExportTests.zip
 # The network boundary is replaced; main, validation, packaging and Git blobs run normally.
 def fixture(self,conclusion='success',capture=True):
  m=self.load();source='a'*40;run_id=101;job_id=202
  raw=self.zip({'companion-owl-0-front.jpg':b'original','evidence.json':json.dumps({'source':source}).encode()})
  request={'sourceCommit':source,'runId':run_id,'families':['companion'],'artifacts':[{'id':303,'name':'full-rollout-nonplayer-review-'+source,'label':'owl','digest':'sha256:'+m.sha(raw),'required':[{'pattern':'companion-owl-0-front.jpg','count':1}]}]}
  if capture:request['successfulCaptureJobId']=job_id
  run={'id':run_id,'head_sha':source,'head_branch':m.BRANCH,'status':'completed','conclusion':conclusion}
  job={'id':job_id,'run_id':run_id,'head_sha':source,'head_branch':m.BRANCH,'name':'nonplayer-candidate-review','status':'completed','conclusion':'success'}
  artifact={'id':303,'name':request['artifacts'][0]['name'],'digest':request['artifacts'][0]['digest'],'expired':False,'workflow_run':{'id':run_id,'head_sha':source,'head_branch':m.BRANCH}}
  return m,request,run,job,artifact,raw
 def execute(self,fixture,move_at=None):
  m,request,run,job,artifact,raw=fixture;blobs=[];calls=[];refs=0
  def api(req,timeout):
   nonlocal refs
   path=req.full_url.split('/repos/'+m.REPO+'/')[1];calls.append(path)
   self.assertEqual(req.get_method(),'POST' if path in ('git/blobs','git/trees') else 'GET')
   if path=='actions/runs/101':obj=run
   elif path.startswith('actions/jobs/'):obj=job
   elif path=='actions/artifacts/303':obj=artifact
   elif path=='git/ref/heads/'+m.BRANCH:
    refs+=1;obj={'object':{'sha':('c' if refs==move_at else 'b')*40}}
   elif path=='git/commits/'+'b'*40:obj={'tree':{'sha':'base-tree'}}
   elif path=='git/blobs':
    data=json.loads(req.data);blobs.append(base64.b64decode(data['content']));obj={'sha':'blob-'+str(len(blobs))}
   elif path=='git/trees':obj={'sha':'prepared-tree'}
   else:raise AssertionError('unexpected API request: '+path)
   return io.BytesIO(json.dumps(obj).encode())
  class Download:
   def open(self,req,timeout):return io.BytesIO(raw)
  previous=Path.cwd()
  with tempfile.TemporaryDirectory() as tmp:
   os.chdir(tmp)
   try:
    Path('.github').mkdir();Path('.github/character-3d-qa-export.json').write_text(json.dumps(request))
    env={'GH_TOKEN':'test-token','GITHUB_SHA':'b'*40,'GITHUB_REPOSITORY':m.REPO,'GITHUB_REF':'refs/heads/'+m.BRANCH}
    with patch.dict(os.environ,env),patch.object(m.urllib.request,'urlopen',api),patch.object(m.urllib.request,'build_opener',return_value=Download()),contextlib.redirect_stdout(io.StringIO()):m.main()
    result=json.loads(Path('qa-export-result.json').read_text())
   finally:os.chdir(previous)
  return result,blobs,calls
 def test_default_requires_whole_run_success(self):
  with self.assertRaisesRegex(ValueError,'unverified source run'):self.execute(self.fixture('failure',capture=False))
  result,blobs,calls=self.execute(self.fixture(capture=False))
  self.assertFalse(any(p.startswith('actions/jobs/') for p in calls));self.assertEqual(result.get('sourceRunConclusion'),'success')
 def test_failed_run_successful_capture_preserves_pending_provenance(self):
  try:result,blobs,calls=self.execute(self.fixture('failure'))
  except ValueError as error:self.fail('successful capture must be exportable: '+str(error))
  self.assertIn('actions/jobs/202',calls)
  expected={'sourceRun':101,'sourceRunConclusion':'failure','successfulCaptureJobId':202,'successfulCaptureJobStatus':'completed','successfulCaptureJobConclusion':'success'}
  for key,value in expected.items():self.assertEqual(result.get(key),value)
  manifest=next(json.loads(b) for b in blobs if b.startswith(b'{') and b'"files"' in b)
  self.assertEqual(manifest['status'],'PENDING_VISUAL_REVIEW');self.assertEqual(result['status'],'PREPARED_NOT_COMMITTED_NOT_APPROVED')
  for key,value in expected.items():self.assertEqual(manifest[key],value)
  archive=next(b for b in blobs if b.startswith(b'PK'))
  with zipfile.ZipFile(io.BytesIO(archive)) as z:
   self.assertEqual(z.read('companion-owl-0-front.jpg'),b'original');self.assertEqual(json.loads(z.read('evidence.json')),{'source':'a'*40})
  success,_,_=self.execute(self.fixture('success'));self.assertEqual(success['sourceRunConclusion'],'success');self.assertEqual(success['successfulCaptureJobId'],202)
  self.assertTrue(all(p.startswith(('actions/','git/ref/heads/','git/commits/','git/blobs','git/trees')) for p in calls))
 def test_rejects_wrong_capture_job_identity_source_role_or_state(self):
  for field,value in [('id',999),('run_id',999),('head_sha','c'*40),('head_branch','main'),('name','dedicated'),('status','in_progress'),('conclusion','failure'),('conclusion','cancelled')]:
   with self.subTest(field=field,value=value):
    f=list(self.fixture());f[3][field]=value
    with self.assertRaisesRegex(ValueError,'unverified successful capture job'):self.execute(f)
  for value in [None,True,'202',0,-1]:
   with self.subTest(job_id=value):
    f=list(self.fixture());f[1]['successfulCaptureJobId']=value
    with self.assertRaisesRegex(ValueError,'invalid successful capture job id'):self.execute(f)
 def test_rejects_wrong_run_source_branch_or_unfinished_conclusion(self):
  for field,value in [('id',999),('head_sha','c'*40),('head_branch','main'),('status','in_progress'),('conclusion','cancelled'),('conclusion','timed_out')]:
   with self.subTest(field=field,value=value):
    f=list(self.fixture());f[2][field]=value
    with self.assertRaisesRegex(ValueError,'unverified source run'):self.execute(f)
 def test_capture_option_rejects_artifact_mismatch_and_original_guards(self):
  for field,value in [('id',999),('name','full-rollout-player-review-'+'a'*40),('digest','sha256:bad'),('expired',True)]:
   with self.subTest(field=field,value=value):
    f=list(self.fixture());f[4][field]=value
    with self.assertRaisesRegex(ValueError,'artifact provenance mismatch'):self.execute(f)
  for field,value in [('id',999),('head_sha','c'*40),('head_branch','main')]:
   with self.subTest(workflow_run=field):
    f=list(self.fixture());f[4]['workflow_run'][field]=value
    with self.assertRaisesRegex(ValueError,'artifact provenance mismatch'):self.execute(f)
  f=list(self.fixture());f[1]['artifacts'][0]['name']='arbitrary-artifact'
  with self.assertRaisesRegex(ValueError,'artifact provenance mismatch'):self.execute(f)
 def test_capture_option_retains_archive_counts_and_lease_guards(self):
  f=list(self.fixture('failure'));f[5]+=b'changed'
  with self.assertRaisesRegex(ValueError,'archive digest mismatch'):self.execute(f)
  f=list(self.fixture('failure'));f[1]['artifacts'][0]['required'][0]['count']=2
  with self.assertRaisesRegex(ValueError,'incomplete'):self.execute(f)
  for at in [1,2]:
   with self.subTest(lease_check=at):
    with self.assertRaisesRegex(ValueError,'branch moved'):self.execute(self.fixture('failure'),move_at=at)
class ArtifactJobTests(unittest.TestCase):
 load=ExportTests.load
 zip=ExportTests.zip
 fixture=SourceRunTests.fixture
 execute=SourceRunTests.execute
 def bound(self,diagnostic=False):
  f=list(self.fixture('failure',capture=False));m,request,run,job,artifact,raw=f
  request['artifactJobEvidence']=True
  spec=request['artifacts'][0];spec.update(jobId=202,evidenceMode='diagnostic' if diagnostic else 'successful')
  name=('full-rollout-meguru-' if diagnostic else 'full-rollout-stages-dog-')+'a'*40
  spec['name']=artifact['name']=name;job['name']='meguru-wave' if diagnostic else 'stage-evidence (dog)'
  if diagnostic:
   job['conclusion']='failure';spec['required']=[{'pattern':'evidence.json','count':1}]
  else:
   request['families']=['dog'];f[5]=self.zip({'missing-motion/dog-2-motion.jpg':b'original','motion-evidence.json':json.dumps({'source':'a'*40}).encode()});spec['required']=[{'pattern':'dog-2-motion.jpg','count':1}];artifact['digest']=spec['digest']='sha256:'+m.sha(f[5])
  return f
 def test_successful_stage_from_failed_run_preserves_bytes_and_pending_verdict(self):
  result,blobs,calls=self.execute(self.bound());self.assertEqual(result['sourceRunConclusion'],'failure');self.assertEqual(result['artifactJobs'][0]['artifactJobName'],'stage-evidence (dog)');self.assertEqual(result['artifactJobs'][0]['artifactJobConclusion'],'success')
  manifest=next(json.loads(b) for b in blobs if b.startswith(b'{') and b'"files"' in b);self.assertEqual(manifest['status'],'PENDING_VISUAL_REVIEW');self.assertEqual(manifest['artifactEvidenceMode'],'successful')
  archive=next(b for b in blobs if b.startswith(b'PK'))
  with zipfile.ZipFile(io.BytesIO(archive)) as z:self.assertEqual(z.read('missing-motion/dog-2-motion.jpg'),b'original')
 def test_failed_runtime_diagnostic_exports_only_json_and_never_image_approval(self):
  result,blobs,calls=self.execute(self.bound(True));manifest=next(json.loads(b) for b in blobs if b.startswith(b'{') and b'"files"' in b);self.assertEqual(manifest['status'],'DIAGNOSTIC_NOT_APPROVED');self.assertEqual(manifest['artifactJobConclusion'],'failure')
  self.assertTrue(all(f['path'].endswith('.json') for f in manifest['files']))
  archive=next(b for b in blobs if b.startswith(b'PK'))
  with zipfile.ZipFile(io.BytesIO(archive)) as z:self.assertEqual(z.namelist(),['evidence.json'])
  self.assertTrue(any(b'DIAGNOSTIC_NOT_APPROVED' in b and b'export success is not image approval' in b for b in blobs))
 def test_job_binding_rejects_wrong_role_source_status_and_artifact(self):
  for field,value in [('id',999),('run_id',999),('head_sha','c'*40),('head_branch','main'),('name','stage-evidence (cat)'),('status','in_progress'),('conclusion','failure'),('conclusion','cancelled')]:
   with self.subTest(field=field,value=value):
    f=self.bound();f[3][field]=value
    with self.assertRaises(ValueError):self.execute(f)
  for name in ['arbitrary-'+'a'*40,'full-rollout-stages-cat-'+'a'*40,'full-rollout-stages-dog-'+'c'*40]:
   f=self.bound();f[1]['artifacts'][0]['name']=f[4]['name']=name
   with self.assertRaises(ValueError):self.execute(f)
 def test_job_mode_never_accepts_unfinished_cancelled_source_or_wrong_diagnostic_job(self):
  for field,value in [('status','in_progress'),('conclusion','cancelled'),('conclusion','timed_out')]:
   f=self.bound();f[2][field]=value
   with self.assertRaisesRegex(ValueError,'unverified source run'):self.execute(f)
  f=self.bound();f[1]['artifacts'][0]['evidenceMode']='diagnostic';f[3]['conclusion']='failure'
  with self.assertRaisesRegex(ValueError,'diagnostic export restricted'):self.execute(f)
  f=self.bound(True);f[3]['conclusion']='success'
  with self.assertRaisesRegex(ValueError,'unverified artifact job'):self.execute(f)
 def test_explicit_job_identity_and_mode_required_and_old_capture_mode_stays_separate(self):
  for field,value in [('jobId',None),('jobId',True),('jobId','202'),('jobId',0),('evidenceMode',None),('evidenceMode','approved')]:
   f=self.bound();f[1]['artifacts'][0][field]=value
   with self.assertRaisesRegex(ValueError,'explicit artifact job'):self.execute(f)
  f=self.bound();f[1]['successfulCaptureJobId']=202
  with self.assertRaisesRegex(ValueError,'invalid artifact job mode'):self.execute(f)
 def test_job_mode_retains_digest_branch_expiration_count_and_lease_guards(self):
  for change in ['digest','expired','branch','count']:
   f=self.bound()
   if change=='digest':f[5]+=b'corrupt'
   elif change=='expired':f[4]['expired']=True
   elif change=='branch':f[4]['workflow_run']['head_branch']='main'
   else:f[1]['artifacts'][0]['required'][0]['count']=2
   with self.assertRaises(ValueError):self.execute(f)
  for at in [1,2]:
   with self.assertRaisesRegex(ValueError,'branch moved'):self.execute(self.bound(),move_at=at)
class TransientExportTests(unittest.TestCase):
 load=ExportTests.load
 def test_transient_gateway_retries_same_request_and_then_returns_json(self):
  m=self.load();req=m.urllib.request.Request('https://api.github.com/repos/'+m.REPO+'/git/trees',data=b'{}');err=lambda:m.urllib.error.HTTPError(req.full_url,502,'gateway',{},None)
  with patch.object(m.urllib.request,'urlopen',side_effect=[err(),err(),io.BytesIO(b'{"sha":"tree"}')]) as call,patch.object(m.time,'sleep') as sleep:
   self.assertEqual(m.json_request(req),{'sha':'tree'});self.assertEqual(call.call_count,3);self.assertTrue(all(c.args[0] is req for c in call.call_args_list));self.assertEqual([c.args[0] for c in sleep.call_args_list],[1,2])
 def test_permissions_and_exhausted_gateway_fail_without_unbounded_retry(self):
  m=self.load();req=m.urllib.request.Request('https://api.github.com/repos/'+m.REPO+'/git/trees')
  for code,count in [(403,1),(404,1),(429,1),(502,3),(503,3),(504,3)]:
   with self.subTest(code=code),patch.object(m.urllib.request,'urlopen',side_effect=m.urllib.error.HTTPError(req.full_url,code,'failed',{},None)) as call,patch.object(m.time,'sleep'):
    with self.assertRaises(m.urllib.error.HTTPError):m.json_request(req)
    self.assertEqual(call.call_count,count)
 def test_tree_failure_retains_verified_entries_without_tree_or_approval(self):
  m=self.load();result={'expectedHead':'a'*40,'baseTree':'base','entries':[{'path':'approved/path','sha':'blob','mode':'100644','type':'blob'}],'paths':['approved'],'sourceCommit':'b'*40,'sourceRun':1};previous=Path.cwd()
  with tempfile.TemporaryDirectory() as tmp:
   os.chdir(tmp)
   try:
    with contextlib.redirect_stdout(io.StringIO()),self.assertRaisesRegex(RuntimeError,'tree failed'):m.complete_export(lambda *args:(_ for _ in ()).throw(RuntimeError('tree failed')),result)
    saved=json.loads(Path('qa-export-result.json').read_text());self.assertEqual(saved['entries'],result['entries']);self.assertEqual(saved['expectedHead'],result['expectedHead']);self.assertEqual(saved['status'],'VERIFIED_BLOBS_TREE_PENDING_NOT_COMMITTED_NOT_APPROVED');self.assertNotIn('tree',saved)
   finally:os.chdir(previous)
if __name__=='__main__':unittest.main()
