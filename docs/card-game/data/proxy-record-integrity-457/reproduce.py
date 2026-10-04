"""Read pinned447 records, never run matches or replays. Optional output directory."""
import hashlib
import json
from pathlib import Path
import sys
from collections import Counter
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT/'tools'))
from proxy_replay_evidence_audit import PATHS, load_saved_path, MANIFEST_SHA, SOURCE
from proxy_judgment_evidence_audit import canonical, build_sidecar
from proxy_record_integrity_audit import audit_record


def main(output):
    output.mkdir(parents=True, exist_ok=True)
    totals = Counter()
    anchor_counts = Counter()
    missing_kinds = Counter()
    files = {}
    for path in PATHS:
        rows = []
        for run in load_saved_path(path):
            evidence = audit_record(run)
            projected = build_sidecar(run)
            evidence['recorded_evaluation'] = projected['evaluation']
            rows.append(evidence)
            totals.update(saved_runs=1, events=evidence['event_count'],
                          snapshots=evidence['snapshot_count'], recorded_decisions=evidence['decision_count'])
            anchor_counts.update(evidence['explicit_anchor_counts'])
            for d in run['decisions']:
                if 'event_seq' not in d:
                    missing_kinds[d['seed_context']['choice_kind'].split(':')[0]] += 1
        packet = dict(path_id=path, saved_manifest_sha256=MANIFEST_SHA,
                      saved_file_sha256=hashlib.sha256((SOURCE/(path+'.json.gz')).read_bytes()).hexdigest(), results=rows)
        raw = canonical(packet)
        name = path+'.json'
        (output/name).write_bytes(raw)
        files[name] = hashlib.sha256(raw).hexdigest()
    sources = [
        '114-normal-decision-protocol-hardening.md', '116-normal-decision-fallback-contract.md',
        '119-response-window-contract.md', '452-independent-balance-readiness.md',
        '453-experiment-design-decision.md', '454-all-judgment-evaluation-design.md',
        '455-judgment-evidence-contract.md', '456-saved-replay-evidence.md',
        'data/proxy-experiment-design-453/plan-draft.json',
        'tools/proxy_record_integrity_audit.py', 'tools/proxy_replay_evidence_audit.py',
        'tools/proxy_judgment_evidence_audit.py', 'tools/proxy_resource_value_selection.py',
        'tools/proxy_normal_decision_seeded_restart.py', 'tools/proxy_continuation_choices.py',
        'tools/proxy_continuation_runner.py', 'tools/proxy_continuation_actions.py',
        'data/proxy-record-integrity-457/reproduce.py',
    ]
    summary = dict(schema='record_integrity_summary_457.v1', **dict(totals),
                   explicit_anchor_counts=dict(sorted(anchor_counts.items())),
                   missing_top_level_event_seq_by_choice_kind=dict(sorted(missing_kinds.items())),
                   files_sha256=files, new_matches=0, new_replays=0,
                   balance_admitted=None, independent_balance_sample_count=0,
                   policy_promoted=False, opportunity_scope='existing_executor_only',
                   opportunity_coverage='not_certified', state_schema_semantics='not_certified',
                   rule_transition_legality='not_certified',
                   sources_sha256={s:hashlib.sha256((ROOT/s).read_bytes()).hexdigest() for s in sources})
    (output/'summary.json').write_bytes(canonical(summary))
    print(json.dumps({k:v for k,v in summary.items() if k not in ('sources_sha256','files_sha256')}, ensure_ascii=False))


if __name__ == '__main__':
    main(Path(sys.argv[1]) if len(sys.argv)>1 else Path(__file__).parent)
