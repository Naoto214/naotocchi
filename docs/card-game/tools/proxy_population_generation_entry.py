"""Future OS generation entry; MUST NOT be invoked before external approval.

A supplied reference records an operator assertion, never authenticates consent.
No CLI/default invocation. Current preparation/tests do not call this function
successfully. No games, automatic retry, resume, remote publication or lock.
"""
import os,platform
from pathlib import Path
import proxy_population_execution_edition as edition
import proxy_population_input_history as history
import proxy_population_remote_publication as remote
from proxy_population_material_protocol import Cursor
from proxy_population_manifest_builder import assemble_supplied
from proxy_population_generation_journal import collect_supplied,audit_journal
from proxy_population_contract import load_json
from proxy_mandatory_policy_contract import ROOT,canonical


def write_exclusive(path,value):
 with path.open('xb') as stream:
  stream.write(canonical(value));stream.flush();os.fsync(stream.fileno())
 directory=os.open(path.parent,os.O_RDONLY|os.O_DIRECTORY)
 try:os.fsync(directory)
 finally:os.close(directory)


def generate_after_external_approval(repository,commit,destination,approval_reference):
 """Operational caller must obtain approval; reference text is not a token."""
 if type(approval_reference) is not str or not approval_reference.strip():raise ValueError('external approval reference required; text does not authenticate approval')
 repository=Path(repository).resolve();destination=Path(destination).resolve()
 if repository!=ROOT.parents[1].resolve() or not destination.is_relative_to((ROOT/'data').resolve()) or destination==(ROOT/'data').resolve():raise ValueError('generation must use current source repository and a new CARD GAME data directory')
 certificate=edition.capture(repository,commit)
 publication=remote.verify(repository,certificate['commit'],certificate['tree'])
 if not publication['fresh_remote_head_verified']:raise ValueError('fresh remote source edition unverified')
 registry=history.build_cutoff_registry()
 if not registry['registry_verified']:raise ValueError('historical registry unproved')
 fixture=load_json(ROOT/'data/proxy-fixtures-107/fixture-107-normal-decision-a-first.json')
 decks={p['player_id']:p['deck_order_top_to_bottom'] for p in fixture['input']['players']}
 cursor=Cursor(registry,decks,group_count=200)
 destination.mkdir() # No overwrite, merge, continuation or implicit parent creation.
 directory=os.open(destination.parent,os.O_RDONLY|os.O_DIRECTORY)
 try:os.fsync(directory)
 finally:os.close(directory)
 metadata=dict(schema='population_generation_operation.v1',api='os.urandom',os_name=os.name,
  platform=platform.platform(),approval_reference=approval_reference,remote_publication_observation=publication,external_approval_verified=False,
  provenance_verified=False,input_lock_verified=False,execution_authorized=False,ready_for_execution=False)
 write_exclusive(destination/'operation.json',metadata)
 write_exclusive(destination/'edition.json',certificate)
 write_exclusive(destination/'historical-registry.json',registry)
 collected=collect_supplied(cursor,destination/'sampling-journal.jsonl',os.urandom)
 material=cursor.record();write_exclusive(destination/'material.json',material)
 journal=audit_journal(destination/'sampling-journal.jsonl',material)
 if not journal['journal_consistent'] or not journal['complete']:raise ValueError('sampling journal not complete/consistent')
 check=edition.verify(certificate,repository)
 if not check['local_edition_verified']:raise ValueError('execution source changed during generation')
 sources={name:row['sha256'] for name,row in certificate['files'].items()}
 bundle=assemble_supplied(material,registry,decks,sources,certificate['python']['version'])
 write_exclusive(destination/'manifest.json',bundle)
 report=dict(schema='population_generation_local_completion.v1',collection=collected,journal=journal,
  actual_os_read_calls=len(material['calls']),returned_byte_count=sum(r['byte_count'] for r in material['calls']),
  planned_groups=200,planned_matches=400,completed_local_generation=True,external_approval_verified=False,
  provenance_verified=False,input_lock_verified=False,remote_publication_verified=False,
  ready_for_execution=False,independent_balance_sample_count=0,new_matches=0,policy_promoted=False)
 write_exclusive(destination/'completion.json',report)
 return report
