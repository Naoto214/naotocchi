"""Recover existing Character QA artifacts as Git objects; never update any ref.
Final commit/ref publication belongs to the caller's expected_sha lease.
"""
import base64,fnmatch,hashlib,io,json,os,re,stat,urllib.request,zipfile
from pathlib import Path,PurePosixPath
REPO='Naoto214/naotocchi'
BRANCH='feat/character-3d-full-rollout-v0'
def sha(data):return hashlib.sha256(data).hexdigest()
def select_files(raw,families,source):
 out={};seen=set();image_names=set();total=0
 if not families or any(not re.fullmatch('[a-z_]+',f) for f in families):raise ValueError('invalid family')
 with zipfile.ZipFile(io.BytesIO(raw)) as z:
  for info in z.infolist():
   p=PurePosixPath(info.filename)
   if p.is_absolute() or '..' in p.parts or '\\' in info.filename or stat.S_ISLNK(info.external_attr>>16):raise ValueError('unsafe archive path')
   if info.is_dir():continue
   if info.filename in seen:raise ValueError('duplicate archive path')
   seen.add(info.filename);total+=info.file_size
   if total>256*1024*1024:raise ValueError('oversized archive')
   selected=any(p.name.startswith(f+'-') or p.name.startswith('player-'+f+'-') for f in families)
   metadata=p.suffix=='.json'
   if not(selected or metadata):continue
   if selected and not metadata:
    if p.name in image_names:raise ValueError("duplicate image basename")
    image_names.add(p.name)
   data=z.read(info)
   if metadata:
    obj=json.loads(data);observed=obj.get('source',obj.get('sourceCommit')) if isinstance(obj,dict) else None
    if observed is not None and observed!=source:raise ValueError('metadata source mismatch')
   out[info.filename]=data
 return out
def validate_counts(files,requirements):
 for req in requirements:
  count=sum(fnmatch.fnmatch(PurePosixPath(p).name,req['pattern']) for p in files)
  if count!=req['count']:raise ValueError(f"incomplete {req['pattern']}: {count}/{req['count']}")
def package_files(files,artifact,source,label,provenance=None):
 out={};buf=io.BytesIO()
 with zipfile.ZipFile(buf,'w',compression=zipfile.ZIP_DEFLATED) as z:
  for p,data in sorted(files.items()):
   info=zipfile.ZipInfo(p,(2026,1,1,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;z.writestr(info,data)
   name=PurePosixPath(p).name
   if name.endswith(('-stages.jpg','-motion.jpg','-views.jpg')) or re.fullmatch(r'[a-z_]+-[1-8]-(front|34|side|back)\.jpg',name) or re.fullmatch(r'(companion|partner|author)-[a-z_]+-(0-(front|34|side|back)|distance-(front|back))\.jpg',name) or name.startswith('player-') or p.endswith('.json'):out[p]=data
 manifest={'status':'PENDING_VISUAL_REVIEW','sourceCommit':source,'artifact':artifact,'files':[{'path':p,'sha256':sha(b),'bytes':len(b)} for p,b in sorted(files.items())]}
 if provenance:manifest.update(provenance)
 out['raw-evidence.zip']=buf.getvalue();out['manifest.json']=(json.dumps(manifest,indent=2)+'\n').encode()
 lines=[f'# {label} — {source}','', 'PENDING_VISUAL_REVIEW — export success is not image approval. Chromium/SwiftShader is not Human/iPhone acceptance.','', '[All original selected images](raw-evidence.zip) · [SHA256 manifest](manifest.json)','']
 for p in sorted(out):
  if p.endswith(('.jpg','.png')):lines.extend([f'## {PurePosixPath(p).name}','',f'![{PurePosixPath(p).name}]({p})',''])
 out['README.md']='\n'.join(lines).encode();return out
class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,*args,**kwargs):return None
def main():
 token=os.environ['GH_TOKEN'];base=os.environ['GITHUB_SHA'];request=json.loads(Path('.github/character-3d-qa-export.json').read_text());source=request['sourceCommit'];run_id=request['runId']
 if os.environ.get('GITHUB_REPOSITORY')!=REPO or os.environ.get('GITHUB_REF')!='refs/heads/'+BRANCH:raise ValueError('wrong repository/branch')
 if not re.fullmatch('[a-f0-9]{40}',source):raise ValueError('exact source required')
 def api(path,data=None):
  req=urllib.request.Request('https://api.github.com/repos/'+REPO+'/'+path,data=None if data is None else json.dumps(data).encode(),headers={'Authorization':'Bearer '+token,'Accept':'application/vnd.github+json','Content-Type':'application/json','X-GitHub-Api-Version':'2022-11-28'})
  with urllib.request.urlopen(req,timeout=60) as r:return json.load(r)
 run=api(f'actions/runs/{run_id}')
 capture_requested='successfulCaptureJobId' in request
 if run.get('id')!=run_id or run.get('head_sha')!=source or run.get('head_branch')!=BRANCH or run.get('status')!='completed' or run.get('conclusion') not in (('success','failure') if capture_requested else ('success',)):raise ValueError('unverified source run')
 provenance={'sourceRun':run_id,'sourceRunConclusion':run['conclusion']}
 if capture_requested:
  job_id=request['successfulCaptureJobId']
  if type(job_id) is not int or job_id<=0:raise ValueError('invalid successful capture job id')
  job=api(f'actions/jobs/{job_id}')
  if job.get('id')!=job_id or job.get('run_id')!=run_id or job.get('head_sha')!=source or job.get('head_branch')!=BRANCH or job.get('name')!='nonplayer-candidate-review' or job.get('status')!='completed' or job.get('conclusion')!='success':raise ValueError('unverified successful capture job')
  provenance.update({'successfulCaptureJobId':job_id,'successfulCaptureJobStatus':job['status'],'successfulCaptureJobConclusion':job['conclusion']})
 if api('git/ref/heads/'+BRANCH)['object']['sha']!=base:raise ValueError('branch moved before export')
 base_tree=api('git/commits/'+base)['tree']['sha'];entries=[];roots=[]
 for spec in request['artifacts']:
  artifact=api('actions/artifacts/'+str(spec['id']))
  if artifact['workflow_run']['id']!=run_id or artifact['workflow_run']['head_sha']!=source or artifact['expired'] or artifact['digest']!=spec['digest']:raise ValueError('artifact provenance mismatch')
  if capture_requested and (artifact.get('id')!=spec['id'] or artifact['workflow_run'].get('head_branch')!=BRANCH or artifact.get('name')!='full-rollout-nonplayer-review-'+source or spec.get('name')!=artifact['name']):raise ValueError('artifact provenance mismatch')
  if not re.fullmatch('[a-z0-9-]+',spec['label']):raise ValueError('unsafe output label')
  req=urllib.request.Request('https://api.github.com/repos/'+REPO+'/actions/artifacts/'+str(spec['id'])+'/zip',headers={'Authorization':'Bearer '+token,'Accept':'application/vnd.github+json'})
  try:
   response=urllib.request.build_opener(NoRedirect).open(req,timeout=60)
  except urllib.error.HTTPError as e:
   if e.code!=302:raise
   location=e.headers['Location']
   if not location.startswith('https://'):raise ValueError('insecure artifact redirect')
   # The signed download request never carries the GitHub token.
   response=urllib.request.urlopen(location,timeout=120)
  with response:raw=response.read(64*1024*1024+1)
  if len(raw)>64*1024*1024 or 'sha256:'+sha(raw)!=spec['digest']:raise ValueError('archive digest mismatch')
  files=select_files(raw,request['families'],source);validate_counts(files,spec['required'])
  exported=package_files(files,{k:artifact[k] for k in ['id','name','digest']},source,spec['label'],provenance)
  root='docs/qa/character-3d-full-v0/export/'+source+'/'+spec['label'];roots.append(root)
  for path,data in exported.items():
   blob=api('git/blobs',{'content':base64.b64encode(data).decode(),'encoding':'base64'})
   entries.append({'path':root+'/'+path,'mode':'100644','type':'blob','sha':blob['sha']})
 tree=api('git/trees',{'base_tree':base_tree,'tree':entries})
 if api('git/ref/heads/'+BRANCH)['object']['sha']!=base:raise ValueError('branch moved; caller must rebase prepared evidence')
 result={'expectedHead':base,'baseTree':base_tree,'tree':tree['sha'],'sourceCommit':source,'sourceRun':run_id,'paths':roots,'entries':entries,'status':'PREPARED_NOT_COMMITTED_NOT_APPROVED'}
 result.update(provenance)
 Path('qa-export-result.json').write_text(json.dumps(result,indent=2)+'\n')
 print('QA_EXPORT_RESULT='+json.dumps(result,separators=(',',':')))
if __name__=='__main__':main()
