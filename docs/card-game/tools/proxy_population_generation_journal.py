"""Durable supplied-byte collection, with no OS sampler or execution authority.

The injected reader is an operational boundary, not proof of randomness.
Existing Cursor owns sampling order/rejections. An interrupted file is retained
and never resumed or overwritten by this module.
"""
import hashlib,json,os
from pathlib import Path
from proxy_mandatory_policy_contract import canonical
from proxy_population_contract import _pairs,_nonfinite


def collect_supplied(cursor,path,read):
 if cursor.calls or cursor.attempts or cursor.groups or cursor.roots or cursor.pending is not None:raise ValueError('fresh cursor required')
 path=Path(path);previous=None
 with path.open('xb') as stream:
  directory=os.open(path.parent,os.O_RDONLY|os.O_DIRECTORY)
  try:os.fsync(directory)
  finally:os.close(directory)
  def append(event):
   nonlocal previous
   payload=dict(previous_sha256=previous,event=event);digest=hashlib.sha256(canonical(payload)).hexdigest()
   stream.write(canonical(dict(payload,sha256=digest))+b'\n');stream.flush();os.fsync(stream.fileno());previous=digest
  try:
   while cursor.request() is not None:
    request=cursor.request();append(dict(kind='request',request=request))
    raw=read(request['byte_count'])
    if type(raw) is not bytes:raise ValueError('reader returned non-bytes')
    append(dict(kind='return',request=request,raw_hex=raw.hex()))
    cursor.supply(raw)
   material=cursor.record();append(dict(kind='complete',material_sha256=hashlib.sha256(canonical(material)).hexdigest()))
  except BaseException as error:
   try:append(dict(kind='interrupted',error_type=type(error).__name__))
   except OSError:pass
   raise
 return dict(complete=True,journal_sha256=hashlib.sha256(path.read_bytes()).hexdigest(),
  material_sha256=hashlib.sha256(canonical(material)).hexdigest(),provenance_verified=False,
  input_lock_verified=False,resume_allowed=False,ready_for_execution=False)


def audit_journal(path,material):
 errors=[];pending=None;calls=[];complete=False;previous=None;terminal=False
 try:
  body=Path(path).read_bytes()
  if not body or not body.endswith(b'\n'):raise ValueError('empty or partial journal')
  for line in body.splitlines():
   row=json.loads(line,object_pairs_hook=_pairs,parse_constant=_nonfinite)
   if set(row)!={'previous_sha256','event','sha256'} or canonical(row)!=line or row['previous_sha256']!=previous:raise ValueError('journal canonical chain differs')
   payload={k:row[k] for k in ('previous_sha256','event')}
   if hashlib.sha256(canonical(payload)).hexdigest()!=row['sha256']:raise ValueError('journal digest differs')
   previous=row['sha256'];event=row['event'];kind=event['kind']
   if terminal:raise ValueError('journal after terminal event')
   if kind=='request':
    if set(event)!={'kind','request'} or pending is not None:raise ValueError('overlapping request')
    pending=event['request']
    if type(pending) is not dict or pending.get('call_index')!=len(calls)+1:raise ValueError('request index differs')
   elif kind=='return':
    if set(event)!={'kind','request','raw_hex'} or pending is None or canonical(event['request'])!=canonical(pending):raise ValueError('return without matching request')
    raw=bytes.fromhex(event['raw_hex'])
    if event['raw_hex']!=raw.hex() or len(raw)!=pending['byte_count']:raise ValueError('return bytes differ')
    calls.append(dict(pending,raw_hex=event['raw_hex']));pending=None
   elif kind=='complete':
    if set(event)!={'kind','material_sha256'} or pending is not None or material['complete'] is not True or event['material_sha256']!=hashlib.sha256(canonical(material)).hexdigest():raise ValueError('completion material binding differs')
    complete=True;terminal=True
   elif kind=='interrupted':
    if set(event)!={'kind','error_type'} or type(event['error_type']) is not str or not event['error_type']:raise ValueError('interruption shape differs')
    terminal=True
   else:raise ValueError('unknown journal event')
  if canonical(calls)!=canonical(material['calls']):raise ValueError('returned bytes/material calls differ')
 except (ValueError,KeyError,TypeError,OSError) as error:errors.append(str(error))
 return dict(journal_consistent=not errors,errors=errors,complete=complete and not errors,
  pending_request=pending,resume_allowed=False,provenance_verified=False,input_lock_verified=False,ready_for_execution=False,
  scope='durable_request_return_and_supplied_material_binding_only')
