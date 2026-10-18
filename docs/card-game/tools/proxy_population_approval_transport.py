"""Allowlisted read-only transport. No retry and no authority decision here.

An isolated reader is killed/reaped on timeout, bounding DNS, TLS and slow bodies
without background threads or global signal handlers. It cannot start a game.
"""
import json,re,subprocess,sys
from pathlib import Path
from urllib.error import HTTPError,URLError
from urllib.request import Request,HTTPRedirectHandler,build_opener
from proxy_population_contract import _pairs,_nonfinite

API='https://api.github.com/repos/Naoto214/naotocchi'


def allowed(path):
 if type(path) is not str or re.fullmatch(r'|/pulls/259|/issues/comments/[1-9][0-9]*|/issues/259/comments\?per_page=100&page=[1-9][0-9]*',path) is None:raise ValueError('unapproved GitHub API path')


class ReadFailure(ValueError):
 def __init__(self,message,http_status=None):
  super().__init__(message);self.http_status=http_status


class _NoRedirect(HTTPRedirectHandler):
 def redirect_request(self,req,fp,code,msg,headers,newurl):raise ReadFailure('GitHub approval redirects forbidden',code)


def _read_once(path):
 allowed(path)
 request=Request(API+path,method='GET',headers={'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'naotocchi-population-approval','Cache-Control':'no-cache'})
 with build_opener(_NoRedirect()).open(request,timeout=30) as response:
  if response.status!=200 or response.geturl()!=API+path:raise ReadFailure('GitHub approval response differs',response.status)
  raw=response.read(8*1024*1024+1)
  if len(raw)>8*1024*1024:raise ReadFailure('GitHub approval response too large',200)
 try:return json.loads(raw.decode('utf-8'),object_pairs_hook=_pairs,parse_constant=_nonfinite)
 except ValueError as error:raise ReadFailure(str(error),200) from error


def _main(path):
 try:result=dict(kind='ok',value=_read_once(path))
 except HTTPError as error:
  result=dict(kind='http',status=error.code);error.close()
 except (TimeoutError,URLError) as error:
  result=dict(kind='timeout' if isinstance(error,TimeoutError) or isinstance(error.reason,TimeoutError) else 'invalid',reason=str(error))
 except (ValueError,OSError) as error:result=dict(kind='invalid',reason=str(error),http_status=getattr(error,'http_status',None))
 print(json.dumps(result,sort_keys=True,separators=(',',':'),allow_nan=False))


def read(path,timeout):
 allowed(path)
 if not 0<timeout<=30:raise TimeoutError('approval read budget exhausted')
 command=[sys.executable,'-I','-c','import sys;sys.path.insert(0,sys.argv[1]);from proxy_population_approval_transport import _main;_main(sys.argv[2])',str(Path(__file__).resolve().parent),path]
 try:result=subprocess.run(command,stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=timeout,check=False)
 except subprocess.TimeoutExpired as error:raise TimeoutError('approval reader deadline') from error
 if result.returncode!=0:raise ValueError('approval reader failed: '+result.stderr.decode('utf-8',errors='replace'))
 reply=json.loads(result.stdout,object_pairs_hook=_pairs,parse_constant=_nonfinite)
 if reply.get('kind')=='ok' and set(reply)=={'kind','value'}:return reply['value']
 if reply.get('kind')=='http' and set(reply)=={'kind','status'} and type(reply['status']) is int:raise HTTPError(API+path,reply['status'],'GitHub read response',{},None)
 if reply.get('kind')=='timeout' and set(reply)=={'kind','reason'}:raise TimeoutError(reply['reason'])
 if reply.get('kind')=='invalid' and set(reply)=={'kind','reason','http_status'} and (reply['http_status'] is None or type(reply['http_status']) is int):raise ReadFailure(reply['reason'],reply['http_status'])
 raise ValueError('invalid approval read: '+str(reply))
