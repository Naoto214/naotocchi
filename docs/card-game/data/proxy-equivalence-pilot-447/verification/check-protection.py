import subprocess,pathlib,json,hashlib
root=pathlib.Path.cwd();base='81f5a31e48cf1a4e7bf4ccb986bdc998a70cf8df';prefix='docs/card-game/'
tracked=subprocess.check_output(['git','ls-tree','-r','--name-only',base],text=True).splitlines()
allowed={'docs/card-game/README.md','docs/card-game/tools/proxy_continuation_candidates.py','docs/card-game/tools/proxy_continuation_runner.py'}
checked=[];changed=[]
for n in tracked:
 p=root/n;before=subprocess.check_output(['git','rev-parse',base+':'+n],text=True).strip()
 after=subprocess.check_output(['git','hash-object',str(p)],text=True).strip() if p.exists() else 'missing'
 if before!=after:changed.append(n)
 elif n.startswith(prefix):checked.append(n)
outside=[n for n in changed if not n.startswith(prefix)]
changed=[n for n in changed if n.startswith(prefix)]
assert set(changed)<=allowed,changed
manifests=list((root/'docs/card-game/data').glob('*439*/manifest.json'));assert len(manifests)==1,manifests
m=json.loads(manifests[0].read_text());execution=m['execution_sources_sha256'];different=[]
for p,h in execution.items():
 n=prefix+p;old=subprocess.check_output(['git','show',base+':'+n]);assert hashlib.sha256(old).hexdigest()==h,n
 if hashlib.sha256((root/n).read_bytes()).hexdigest()!=h:different.append(p)
assert set(different)=={'tools/proxy_continuation_candidates.py','tools/proxy_continuation_runner.py'}
r=dict(base_head=base,all_tracked_files_checked=len(tracked),unchanged_card_game_files=len(checked),changed_existing_files=changed,past_data_files_unchanged=sum(n.startswith(prefix+'data/') for n in checked),historical_execution_sources_verified_at_base=len(execution),historical_execution_sources_unchanged_now=len(execution)-len(different),explicit_opt_in_hook_changes=different,protected_114_505_414_443_444_445_446_unchanged=True,outside_card_game_changes_to_save=0,observed_outside_workspace_differences_excluded=outside)
(root/'docs/card-game/data/proxy-equivalence-pilot-447/verification/protection.json').write_text(json.dumps(r,indent=2)+'\n');print(json.dumps(r))
