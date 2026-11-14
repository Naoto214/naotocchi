#!/usr/bin/env python3
"""Append-only music registration, hash protection, resumable verification and export."""
import argparse,contextlib,copy,datetime,fcntl,hashlib,json,math,os,pathlib,re,tempfile
from quality import analyze,VERSION
ROOT=pathlib.Path(__file__).resolve().parents[2]
def digest(obj):return hashlib.sha256(json.dumps(obj,ensure_ascii=False,sort_keys=True,separators=(',',':'),allow_nan=False).encode()).hexdigest()
def sha(path):
 with path.open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()
def read_json(p):return json.loads(p.read_text())
def atomic(p,value):
 p.parent.mkdir(parents=True,exist_ok=True)
 fd,tmp=tempfile.mkstemp(dir=p.parent,prefix='.'+p.name)
 try:
  with os.fdopen(fd,'w') as f:json.dump(value,f,ensure_ascii=False,indent=2,allow_nan=False);f.write('\n');f.flush();os.fsync(f.fileno())
  os.replace(tmp,p)
 finally:
  if os.path.exists(tmp):os.unlink(tmp)
def stamp():return datetime.datetime.now(datetime.timezone.utc).isoformat()
class Library:
 def __init__(self,root=ROOT):self.root=pathlib.Path(root).resolve();self.music=self.root/'music'
 def read(self):return read_json(self.music/'library.json')
 @contextlib.contextmanager
 def writer(self):
  self.music.mkdir(parents=True,exist_ok=True)
  with (self.music/'.writer.lock').open('a+') as f:
   try:fcntl.flock(f,fcntl.LOCK_EX|fcntl.LOCK_NB)
   except BlockingIOError:raise ValueError('another music writer is active')
   try:yield
   finally:fcntl.flock(f,fcntl.LOCK_UN)
 def path(self,rel):
  if not isinstance(rel,str) or not rel or '\\' in rel:raise ValueError('invalid path')
  p=pathlib.PurePosixPath(rel)
  if p.is_absolute() or '..' in p.parts or str(p)!=rel:raise ValueError('unsafe path '+rel)
  f=self.root/p
  if f.resolve()!=f or not f.is_file():raise ValueError('missing or symlink path '+rel)
  return f
 def preserve(self,data=None):
  data=data or self.read();lock=read_json(self.music/'approved32.lock.json');tracks=data['tracks']
  ids=[t['id'] for t in tracks]
  if len(ids)!=len(set(ids)):raise ValueError('duplicate track id')
  by={t['id']:t for t in tracks}
  for sid,want in lock['tracks'].items():
   if sid not in by or digest(by[sid])!=want:raise ValueError('frozen protected track changed: '+sid)
  sources=read_json(self.music/'sources.json')
  for sid,want in lock.get('sources',{}).items():
   if sid not in sources or digest(sources[sid])!=want:raise ValueError('frozen source license record changed: '+sid)
  for rel,want in lock['files'].items():
   if sha(self.path(rel))!=want:raise ValueError('frozen protected file changed: '+rel)
 def validate(self,t,fill=False):
  if not re.fullmatch('[a-z][a-z0-9]*(?:-[a-z0-9]+)*',t.get('id','')):raise ValueError('invalid track id')
  if not isinstance(t.get('title'),str) or not t['title'].strip():raise ValueError('empty title')
  if t.get('kind') not in ['bgm','jingle','variation']:raise ValueError('invalid kind')
  if not isinstance(t.get('bpm'),(int,float)) or isinstance(t['bpm'],bool) or not math.isfinite(t['bpm']) or t['bpm']<=0:raise ValueError('invalid bpm')
  if not re.fullmatch(r'[1-9][0-9]*/(?:1|2|4|8|16|32)',str(t.get('meter',''))):raise ValueError('invalid meter')
  if not isinstance(t.get('key'),dict) or not t['key'].get('basis'):raise ValueError('key metadata needs declared value or unknown basis')
  for k in ['duration','frames','sampleRate']:
   if not isinstance(t.get(k),(int,float)) or isinstance(t[k],bool) or not math.isfinite(t[k]) or t[k]<=0:raise ValueError('invalid '+k)
  if t['sampleRate']!=44100 or not isinstance(t['frames'],int) or abs(t['frames']/44100-t['duration'])>1/44100+.00001:raise ValueError('invalid frame metadata')
  loop=t.get('loop',{})
  if type(loop.get('enabled')) is not bool:raise ValueError('loop enabled must be boolean')
  if not all(isinstance(loop.get(k),(int,float)) and not isinstance(loop[k],bool) and math.isfinite(loop[k]) for k in ['start','end']):raise ValueError('invalid loop bounds')
  if not 0<=loop['start']<loop['end']<=t['duration']+.000001:raise ValueError('invalid loop range')
  if t.get('individualGainDb')!=0:raise ValueError('individual gain must remain0dB')
  if t.get('status') not in ['candidate','approved']:raise ValueError('invalid status')
  for k in ['uses','instruments','sources','history']:
   if not isinstance(t.get(k),list):raise ValueError('metadata list required: '+k)
  if not t['instruments'] or not t['sources']:raise ValueError('instrument/source metadata required')
  sources=read_json(self.music/'sources.json');rights={}
  for sid in t['sources']:
   src=sources.get(sid)
   if not src or src.get('reviewed') is not True or not src.get('license') or not src.get('reference','').startswith('https://'):raise ValueError('unreviewed source/license: '+str(sid))
   if sha(self.path(src['licenseFile']))!=src['licenseSha256']:raise ValueError('license hash mismatch')
   rights[sid]=src
  if set(t.get('assets',{}))!={'aac','flac','midi'}:raise ValueError('AAC FLAC MIDI assets required')
  for kind,a in t['assets'].items():
   f=self.path(a.get('path'));ext={'aac':'.m4a','flac':'.flac','midi':'.mid'}[kind]
   if f.suffix!=ext:raise ValueError('asset extension mismatch')
   if kind=='aac' and a['path']!='assets/bgm/'+t['id']+'.m4a':raise ValueError('AAC runtime path must match persistent ID')
   actual=sha(f)
   if fill and not a.get('sha256'):a['sha256']=actual
   if a.get('sha256')!=actual:raise ValueError('asset hash mismatch: '+a['path'])
  score=t.get('score',{});score_sha=sha(self.path(score.get('path')))
  if fill and not score.get('sha256'):score['sha256']=score_sha
  if score.get('sha256')!=score_sha:raise ValueError('score hash mismatch')
  meta={k:v for k,v in t.items() if k not in ['approval','status','history','measurements']}
  policy=read_json(self.music/'policy.json')
  return digest({'track':meta,'sources':rights,'policy':policy,'analyzer':VERSION})
 def receipt(self,t,fp,force=False):
  p=self.music/'verification/tracks'/(t['id']+'.json')
  try:old=read_json(p)
  except (OSError,ValueError):old={}
  if not force and old.get('success') is True and old.get('fingerprint')==fp and isinstance(old.get('analysis'),dict):return old,True
  result=analyze(self.root,t,read_json(self.music/'policy.json'))
  r={'success':True,'fingerprint':fp,'analysis':result,'checkedAt':stamp()};atomic(p,r);return r,False
 def verify(self,ids=None,force=False):
  with self.writer():
   d=self.read();self.preserve(d);available={t['id'] for t in d['tracks']}
   if ids and not set(ids)<=available:raise ValueError('unknown track id')
   rows=[]
   for t in d['tracks']:
    if ids and t['id'] not in ids:continue
    fp=self.validate(t);r,skip=self.receipt(t,fp,force);rows.append({'id':t['id'],'skipped':skip,'fingerprint':fp,'success':r['success']})
   return {'analyzed':sum(not r['skipped'] for r in rows),'skipped':sum(r['skipped'] for r in rows),'tracks':rows}
 def register(self,manifest):
  with self.writer():
   d=self.read();self.preserve(d);t=copy.deepcopy(manifest)
   if t.get('id') in {x['id'] for x in d['tracks']}:raise ValueError('duplicate track id')
   if t.get('status')!='candidate' or t.get('approval'):raise ValueError('registration must be an unapproved candidate')
   fp=self.validate(t,fill=True);r,_=self.receipt(t,fp);t['measurements']=r['analysis'];t['history'].append({'at':stamp(),'action':'candidate registered; audio read only'})
   d['tracks'].append(t);atomic(self.music/'library.json',d);return t
 def revise(self,manifest):
  with self.writer():
   d=self.read();self.preserve(d);t=copy.deepcopy(manifest);i=next((i for i,x in enumerate(d['tracks']) if x['id']==t.get('id')),None)
   if i is None:raise ValueError('unknown candidate id')
   old=d['tracks'][i]
   if old['status']!='candidate' or t.get('status')!='candidate' or t.get('approval'):raise ValueError('approved/frozen music cannot be revised')
   fp=self.validate(t,fill=True);r,_=self.receipt(t,fp);t['measurements']=r['analysis'];t['history']=old['history']+[{'at':stamp(),'action':'candidate revised; verification renewed'}]
   d['tracks'][i]=t;atomic(self.music/'library.json',d);return t
 def approve(self,sid,reference):
  if not isinstance(reference,str) or not reference.strip():raise ValueError('explicit approval reference required')
  with self.writer():
   d=self.read();self.preserve(d);t=next((x for x in d['tracks'] if x['id']==sid),None)
   if not t:raise ValueError('unknown track id')
   if sid in read_json(self.music/'approved32.lock.json')['tracks']:raise ValueError('frozen approval cannot be rewritten')
   fp=self.validate(t);r,_=self.receipt(t,fp);t['status']='approved';t['approval']={'reference':reference,'fingerprint':fp,'at':stamp()};t['history'].append({'at':stamp(),'action':'approved','reference':reference});atomic(self.music/'library.json',d);return t['approval']
 def build(self,check=False):
  from export import build
  with self.writer():
   d=self.read();self.preserve(d)
   for t in d['tracks']:
    fp=self.validate(t)
    if t['status']=='approved' and t.get('approval',{}).get('fingerprint')!=fp:raise ValueError('stale approval fingerprint: '+t['id'])
    if t['status']=='approved':
     p=self.music/'verification/tracks'/(t['id']+'.json')
     try:r=read_json(p)
     except (ValueError,OSError):raise ValueError('missing verified receipt: '+t['id'])
     if r.get('success') is not True or r.get('fingerprint')!=fp:raise ValueError('stale verified receipt: '+t['id'])
   return build(self,d,check)
 def preview(self,out):
  from export import preview
  with self.writer():
   d=self.read();self.preserve(d)
   for t in d['tracks']:self.validate(t)
   return preview(self,d,pathlib.Path(out))
def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--root',type=pathlib.Path,default=ROOT);sub=p.add_subparsers(dest='command',required=True)
 s=sub.add_parser('init');s.add_argument('id');s.add_argument('--out',type=pathlib.Path,required=True)
 s=sub.add_parser('register');s.add_argument('manifest',type=pathlib.Path)
 s=sub.add_parser('revise');s.add_argument('manifest',type=pathlib.Path)
 s=sub.add_parser('verify');s.add_argument('--id',action='append');s.add_argument('--force',action='store_true')
 s=sub.add_parser('approve');s.add_argument('id');s.add_argument('--reference',required=True)
 s=sub.add_parser('build');s.add_argument('--check',action='store_true');s=sub.add_parser('preview');s.add_argument('--out',type=pathlib.Path,required=True)
 args=p.parse_args();L=Library(args.root)
 if args.command=='init':
  if not re.fullmatch('[a-z][a-z0-9]*(?:-[a-z0-9]+)*',args.id):raise ValueError('invalid track id')
  if args.out.exists() or args.id in {t['id'] for t in L.read()['tracks']}:raise ValueError('already exists; will not overwrite')
  t=read_json(L.music/'templates/track.json');t['id']=args.id
  for k,a in t['assets'].items():a['path']=a['path'].replace('{id}',args.id)
  t['score']['path']=t['score']['path'].replace('{id}',args.id);atomic(args.out,t);result={'template':str(args.out)}
 elif args.command=='register':result=L.register(read_json(args.manifest))
 elif args.command=='revise':result=L.revise(read_json(args.manifest))
 elif args.command=='verify':result=L.verify(args.id,args.force)
 elif args.command=='approve':result=L.approve(args.id,args.reference)
 elif args.command=='build':result=L.build(check=args.check)
 else:result=L.preview(args.out)
 print(json.dumps(result,ensure_ascii=False,indent=2))
if __name__=='__main__':
 try:main()
 except (ValueError,OSError,KeyError,TypeError) as e:raise SystemExit('music: '+str(e))
