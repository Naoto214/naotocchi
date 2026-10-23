"""Per-row checkpoints for the fixed 400 (2026-10-23 C案): build, verify, chain.

A checkpoint certifies one completed row of one approved attempt: the row's
receipt/record hashes, its edition and manifest binding, and an edition-independent
summary of the play (decision list, event skeleton, final board, result). Rows are
reused on resume only after every binding here is recomputed from the saved bytes.
Nothing here authorizes a launch, resumes a partial match or counts an unverified row.
"""
import copy,gzip,hashlib,json,re
from proxy_population_contract import _pairs,_nonfinite
from proxy_mandatory_policy_contract import canonical

SCHEMA='fixed400_row_checkpoint.v1'
ATTEMPT_RE=re.compile(r'fixed400-[0-9a-f]{12}')
EVENT_KEYS=('seq','action_type','actor','selected_candidate','source_instance_id','chain_link_id','game_state_before_sha256','game_state_after_sha256','continuation_state_after_sha256')
RECORD_SCHEMA='bound_population_connected_runtime.v1'
RECEIPT_SCHEMA='conditional_population_attempt_receipt.v1'


def digest(value):return hashlib.sha256(canonical(value)).hexdigest()
def document(body):return json.loads(body,object_pairs_hook=_pairs,parse_constant=_nonfinite)


def attempt_id(claim_commit):
 if type(claim_commit) is not str or re.fullmatch('[0-9a-f]{40}',claim_commit) is None:raise ValueError('attempt requires an immutable claim commit')
 return 'fixed400-'+claim_commit[:12]


def tools_sha256(certificate):
 """The connected tools fingerprint of an edition (same form as the connected record)."""
 files=certificate['files']
 return hashlib.sha256(canonical({n.split('/',1)[1]:row['sha256'] for n,row in files.items() if n.startswith('tools/') and n.count('/')==1 and n.endswith('.py')})).hexdigest()


def attempt_descriptor(attempt,bundle,certificate,original_claim):
 if type(attempt) is not str or ATTEMPT_RE.fullmatch(attempt) is None:raise ValueError('attempt identity differs')
 if type(original_claim) is not dict or set(original_claim)!={'comment_id','commit','tree'}:raise ValueError('attempt claim shape differs')
 return dict(attempt_id=attempt,manifest_sha256=digest(bundle),execution_order_sha256=digest(list(bundle['execution_order'])),
  edition=dict(commit=certificate['commit'],tree=certificate['tree'],sha256=digest(certificate)),connected_tools_sha256=tools_sha256(certificate),
  original_claim=copy.deepcopy(original_claim))


def play_summary(record):
 rt=record['runtime']
 events=[{k:e.get(k) for k in EVENT_KEYS} for e in rt['events']]
 decisions=[[d.get('selected_candidate'),d.get('decision_kind')] for d in rt['decisions']]
 final=rt['final_envelope']['legacy_continuation']['game_state']
 return dict(decision_count=len(decisions),event_count=len(events),decisions_sha256=digest(decisions),events_sha256=digest(events),
  final_game_state_sha256=digest(final),result=copy.deepcopy(rt['result']))


def _row_bindings(index,match_id,bundle,descriptor,receipt_body,compressed):
 if type(index) is not int or not 1<=index<=400:raise ValueError('checkpoint schedule index differs')
 order=bundle['execution_order']
 if len(order)!=400 or order[index-1]!=match_id:raise ValueError('checkpoint row is not the scheduled match')
 row=next((r for r in bundle['matches'] if r['match_id']==match_id),None)
 if row is None:raise ValueError('checkpoint match absent from manifest')
 receipt=document(receipt_body)
 if canonical(receipt)!=receipt_body or receipt.get('schema')!=RECEIPT_SCHEMA or receipt.get('match_id')!=match_id or receipt.get('execution_status')!='completed' or receipt.get('source_reconstructed') is not True:raise ValueError('checkpoint receipt is not a completed source-reconstructed row')
 raw=gzip.decompress(compressed);record=document(raw)
 if canonical(record)!=raw or hashlib.sha256(raw).hexdigest()!=receipt['record_sha256'] or hashlib.sha256(compressed).hexdigest()!=receipt['compressed_sha256']:raise ValueError('checkpoint record bytes differ from receipt')
 if record.get('schema')!=RECORD_SCHEMA or record['binding'].get('match_id')!=match_id or record.get('completed') is not True or record.get('supplied_bundle_sha256')!=descriptor['manifest_sha256'] or record.get('connected_tools_sha256')!=descriptor['connected_tools_sha256']:raise ValueError('checkpoint record binding differs')
 if record.get('reconstruction_step_limit')!=512:raise ValueError('checkpoint record step bound differs')
 return row,receipt,record


def build_entry(descriptor,index,match_id,bundle,generation,receipt_body,compressed,previous_entry_sha256):
 row,receipt,record=_row_bindings(index,match_id,bundle,descriptor,receipt_body,compressed)
 if previous_entry_sha256 is not None:_hex(previous_entry_sha256)
 group=next((g for g in bundle['groups'] if g['group_id']==row['group_id']),None)
 if group is None:raise ValueError('checkpoint group absent from manifest')
 entry=dict(schema=SCHEMA,attempt_id=descriptor['attempt_id'],schedule_index=index,match_id=match_id,group_id=row['group_id'],first_player=row['first_player'],
  execution_order_sha256=descriptor['execution_order_sha256'],manifest_sha256=descriptor['manifest_sha256'],
  input_sha256=row['input_sha256'],policy_input_sha256=row['policy_input_sha256'],policy_versions=copy.deepcopy(row['policy_versions']),
  seeds_sha256=digest({k:group[k] for k in ('seed_A','seed_B')}),
  edition=copy.deepcopy(descriptor['edition']),connected_tools_sha256=descriptor['connected_tools_sha256'],original_claim=copy.deepcopy(descriptor['original_claim']),
  resume_generation=generation,receipt_sha256=hashlib.sha256(receipt_body).hexdigest(),record_sha256=receipt['record_sha256'],compressed_sha256=receipt['compressed_sha256'],
  play=play_summary(record),completed=True,previous_entry_sha256=previous_entry_sha256)
 entry['entry_sha256']=digest(entry)
 return entry


def _hex(value):
 if type(value) is not str or re.fullmatch('[0-9a-f]{64}',value) is None:raise ValueError('checkpoint digest differs')


def verify_entry(entry,descriptor,index,bundle,receipt_body,compressed,previous_entry_sha256):
 """Recompute every binding from the saved bytes; the stored entry is never trusted."""
 if type(entry) is not dict or entry.get('schema')!=SCHEMA or entry.get('completed') is not True:raise ValueError('checkpoint entry shape differs')
 if type(entry.get('resume_generation')) is not int or entry['resume_generation']<0:raise ValueError('checkpoint generation differs')
 expected=build_entry(descriptor,index,entry.get('match_id'),bundle,entry['resume_generation'],receipt_body,compressed,previous_entry_sha256)
 if canonical(expected)!=canonical(entry):raise ValueError('checkpoint entry differs from its saved evidence')
 return expected


def verify_ledger(rows,descriptor,bundle):
 """rows: {schedule_index: (entry, receipt_body, compressed)}. Returns the verified plan."""
 if type(rows) is not dict:raise ValueError('ledger rows must be indexed')
 indices=sorted(rows)
 if any(type(i) is not int for i in indices) or len(set(indices))!=len(indices):raise ValueError('ledger indices differ')
 previous=None;verified={};matches=set()
 for index in indices:
  entry,receipt_body,compressed=rows[index]
  checked=verify_entry(entry,descriptor,index,bundle,receipt_body,compressed,previous)
  if checked['match_id'] in matches:raise ValueError('duplicate match in ledger')
  matches.add(checked['match_id']);verified[index]=checked;previous=checked['entry_sha256']
 pending=[i for i in range(1,401) if i not in verified]
 return dict(schema='fixed400_checkpoint_plan.v1',attempt_id=descriptor['attempt_id'],completed_indices=indices,completed_rows=len(indices),
  pending_schedule_indices=pending,next_schedule_index=pending[0] if pending else None,
  checkpoint_sha256=checkpoint_digest(verified),pending_schedule_indices_sha256=digest(pending),last_entry_sha256=previous,entries=verified)


def checkpoint_digest(entries):
 return digest([entries[i]['entry_sha256'] for i in sorted(entries)])
