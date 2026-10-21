"""Current107 antlion01 movement adapter; saved native registries stay intact.

Its source55 ability modifies set-item cost only: no arrival/start/end trigger.
Reuse the existing batch movement/cost/policy machinery without a new score.
"""
import copy,hashlib
from contextlib import contextmanager
from threading import Lock
import proxy_continuation_batch as batch
from proxy_mandatory_policy_contract import ROOT

REFERENCE='55-insect-three-lines-card-text-draft.md#M-antlion-01'
SECTION_SHA='cb8e0aa264f85b06c4e156b3501d6ce6b019cf307000add4f1cb26b263870673'
_LOCK=Lock()

@contextmanager
def scope():
 if not _LOCK.acquire(blocking=False):raise ValueError('main route scope concurrency/reentry forbidden')
 original=batch.CAPABILITIES
 try:
  body,_=batch.rules.source_section(REFERENCE)
  if hashlib.sha256(body.encode()).hexdigest()!=SECTION_SHA:raise ValueError('antlion01 movement source changed')
  cap=copy.deepcopy(batch.rules.CAPABILITIES['M-antlion-01'])
  if cap['kind']!='cost_modifier' or cap['timing']!='set_item_payment' or cap['ability_key']!='set_discount' or cap['reference']!=REFERENCE:raise ValueError('antlion01 existing capability differs')
  cap.pop('fragments',None);cap.update(semantic_section_sha256=SECTION_SHA,arrival_trigger=False,no_start_trigger=True,no_end_trigger=True)
  batch.CAPABILITIES=dict(original,**{'M-antlion-01':cap})
  yield
 finally:batch.CAPABILITIES=original;_LOCK.release()
