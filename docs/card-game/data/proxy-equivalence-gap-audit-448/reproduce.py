"""Read-only structural audit of447; exact atom equality is NOT a proof."""
import argparse,collections,gzip,hashlib,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/'data/proxy-equivalence-pilot-447'
GROUPS=('legacy_time_unique','legacy_safe_free_unique','already_seeded')

def canonical(x):return (json.dumps(x,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()
def build():
 blob=(SOURCE/'shadow.json.gz').read_bytes();m=json.loads((SOURCE/'manifest.json').read_text());raw=gzip.decompress(blob)
 assert hashlib.sha256(blob).hexdigest()==m['compressed_sha256'];assert hashlib.sha256(raw).hexdigest()==m['raw_sha256']
 report=json.loads(raw);assert report['planned_ids']==m['planned_ids']==[r['shadow_id'] for r in report['rows']];assert len(report['rows'])==313
 rows=[];pairs=[];candidates=[];refinements=[]
 import sys,copy
 sys.path.insert(0,str(ROOT/'tools'))
 from proxy_public_relationship_prefix import refine_outcomes
 from proxy_equivalence_proofs import _compare_derived
 from proxy_equivalence_outcomes import derive_outcomes
 from proxy_resource_value_selection import select_problem
 for r in report['rows']:
  w=r['selection'];refined=refine_outcomes(r['input']);refined_by_id={o['candidate_id']:o for o in refined};effective=copy.deepcopy(w['effective_problem']);new_proofs=[]
  for pair in effective['pairs']:
   proof=_compare_derived(refined_by_id[pair['left_id']],refined_by_id[pair['right_id']]);new_proofs.append(proof)
   if pair['kind']=='certified_safe_free_development':continue
   if proof['status']=='proved_equal':pair['relations']=proof['relations'];pair['source_refs']=proof['source_refs']
   elif proof['global_blockers']:pair['relations']={k:'incomparable' for k in ('hand','board','reservations')}
  choice=select_problem(effective)
  changed=[o for o,old in zip(refined,derive_outcomes(r['input'])) if o!=old]
  refinements.append(dict(shadow_id=r['shadow_id'],group=r['group'],changed_outcomes=changed,proved_equal_pairs=sum(p['status']=='proved_equal' for p in new_proofs),remaining_generator_unsupported=sum('generator_unsupported' in o['unknowns'] for o in refined),frontier_changed=choice['frontier_report']['frontier_ids']!=w['frontier_report']['frontier_ids'],choice_changed=choice['selected_candidate']!=w['selected_candidate'],decision_record_changed=choice['decision_record']!=w['decision_record'],selection_basis=choice['selection_basis']))
  front=set(w['frontier_report']['frontier_ids']);out={o['candidate_id']:o for o in w['outcomes']};actions={a['candidate_id']:a for a in r['input']['actions']};local=[]
  for o in out.values():
   if 'generator_unsupported' in o['unknowns']:
    a=actions[o['candidate_id']];candidates.append(dict(shadow_id=r['shadow_id'],group=r['group'],candidate_id=o['candidate_id'],action_type=a['action_type'],variant=a['candidate_variant'],in_frontier=o['candidate_id'] in front,main_present=r['input']['view']['public']['own_board']['main'] is not None,source_references=a['source_references']))
  for p in w['pair_proofs']:
   l,h=p['left_id'],p['right_id']
   if l not in front or h not in front:continue
   a,b=out[l],out[h];aa={z['atom_id']:z for z in a['atoms']};bb={z['atom_id']:z for z in b['atoms']}
   assert len(aa)==len(a['atoms']) and len(bb)==len(b['atoms'])
   diffs=[dict(atom_id=k,left=aa.get(k),right=bb.get(k)) for k in sorted(aa.keys()|bb.keys()) if aa.get(k)!=bb.get(k)]
   zones=sorted({(d['left'] or d['right'])['zone'] for d in diffs})
   unsupported='generator_unsupported' in a['unknowns']+b['unknowns']
   physical=any(z.startswith(('own_hand','own_board','opponent_board','discard','egg_state','activation_source')) for z in zones)
   la,ra=actions[l],actions[h]
   if unsupported:category='generator_gap_present'
   elif physical:category='physical_or_zone_residual'
   elif la['target_instance_ids']!=ra['target_instance_ids']:category='target_residual'
   elif la['candidate_variant']!=ra['candidate_variant']:category='declaration_variant_residual'
   else:category='other_residual'
   item=dict(shadow_id=r['shadow_id'],group=r['group'],left_id=l,right_id=h,category=category,action_types=[la['action_type'],ra['action_type']],source_references=sorted(set(la['source_references']+ra['source_references'])),differing_zones=zones,raw_equal_atom_count=sum(aa[k]==bb[k] for k in aa.keys()&bb.keys()),proven_cancelled_atom_count=len(p['matched_atom_ids']),generator_gap=unsupported,unknowns=p['unknowns'],differences=[dict(atom_id=d['atom_id'],left_sha256=hashlib.sha256(canonical(d['left'])).hexdigest(),right_sha256=hashlib.sha256(canonical(d['right'])).hexdigest(),differing_fields=sorted(k for k in (d['left'] or {}).keys()|(d['right'] or {}).keys() if (d['left'] or {}).get(k)!=(d['right'] or {}).get(k))) for d in diffs])
   pairs.append(item);local.append(category)
  rows.append(dict(shadow_id=r['shadow_id'],group=r['group'],frontier_count=len(front),pair_count=len(local),pair_categories=dict(collections.Counter(local))))
 selected=[p for p in pairs if p['group'] in GROUPS];assert len(selected)==1457
 groups={}
 for g in (*GROUPS,'control','legacy_unsupported'):
  rr=[r for r in rows if r['group']==g];pp=[p for p in pairs if p['group']==g];cc=[c for c in candidates if c['group']==g]
  groups[g]=dict(decisions=len(rr),frontier_pairs=len(pp),pair_categories=dict(collections.Counter(p['category'] for p in pp)),decisions_with_category={k:sum(k in r['pair_categories'] for r in rr) for k in sorted({p['category'] for p in pp})},unsupported_candidates=len(cc),unsupported_in_frontier=sum(c['in_frontier'] for c in cc),unsupported_actions=dict(collections.Counter(c['action_type'] for c in cc)))
 summary=dict(groups=groups,target_182_frontier_pairs=len(selected),target_182_categories=dict(collections.Counter(p['category'] for p in selected)),all_313_unsupported_candidates=len(candidates),target_182_unsupported_frontier_actions=dict(collections.Counter(c['action_type'] for c in candidates if c['group'] in GROUPS and c['in_frontier'])),target_182_no_physical_difference_actions=dict(collections.Counter('/'.join(p['action_types']) for p in selected if p['category'] in ('target_residual','declaration_variant_residual'))),refined_candidates=sum(len(r['changed_outcomes']) for r in refinements),remaining_generator_unsupported=sum(r['remaining_generator_unsupported'] for r in refinements),refinement_frontier_changes=sum(r['frontier_changed'] for r in refinements),refinement_choice_changes=sum(r['choice_changed'] for r in refinements),refinement_decision_record_changes=sum(r['decision_record_changed'] for r in refinements),diagnostic_only=True,new_equivalence_proofs=sum(r['proved_equal_pairs'] for r in refinements),policy_changes=0,new_runs=0,independent_balance_sample_count=0,policy_promoted=False)
 return dict(schema='naotocchi.card_game.equivalence_gap_audit.v1',source_raw_sha256=m['raw_sha256'],scope='current prefixes and unresolved obligations; not final-state inequivalence or hypothetical fallback reduction',rows=rows,relationship_prefix_diagnostics=refinements,frontier_pairs=pairs,unsupported_candidates=candidates,summary=summary)

def write(output):
 if output.exists() and any(output.iterdir()):raise ValueError('output must be empty')
 output.mkdir(parents=True,exist_ok=True);r=build();raw=canonical(r);blob=gzip.compress(raw,mtime=0)
 (output/'audit.json.gz').write_bytes(blob);(output/'summary.json').write_bytes(canonical(r['summary']))
 sources={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in (SOURCE/'manifest.json',SOURCE/'shadow.json.gz',Path(__file__),ROOT/'tools/proxy_public_relationship_prefix.py',ROOT/'tools/proxy_continuation_batch.py',ROOT/'01-core-rules.md')}
 (output/'manifest.json').write_bytes(canonical(dict(sources_sha256=sources,raw_sha256=hashlib.sha256(raw).hexdigest(),compressed_sha256=hashlib.sha256(blob).hexdigest())))
 print(json.dumps(r['summary'],ensure_ascii=False,sort_keys=True))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);write(p.parse_args().output)
