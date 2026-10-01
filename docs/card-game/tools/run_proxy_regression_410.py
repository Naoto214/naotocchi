#!/usr/bin/env python3
"""Run unchanged proxy modules in isolated workers; prove exact test-ID coverage."""
import argparse
import hashlib
import importlib
import json
import os
from pathlib import Path
import subprocess
import sys
import time
import unittest

TOOLS = Path(__file__).resolve().parent


def flatten(suite):
    for item in suite:
        if isinstance(item, unittest.TestSuite):
            yield from flatten(item)
        else:
            yield item


def save(path, value):
    temp = path.with_suffix(path.suffix + '.tmp')
    temp.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
    temp.replace(path)


class RecordingResult(unittest.TextTestResult):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.started = []
        self.finished = []
        self.status = {}

    def startTest(self, test):
        self.started.append(test.id())
        self.status[test.id()] = []
        super().startTest(test)

    def stopTest(self, test):
        self.finished.append(test.id())
        super().stopTest(test)

    def addSuccess(self, test):
        self.status[test.id()].append('pass')
        super().addSuccess(test)

    def addFailure(self, test, err):
        self.status[test.id()].append('fail')
        super().addFailure(test, err)

    def addError(self, test, err):
        self.status[test.id()].append('error')
        super().addError(test, err)

    def addSkip(self, test, reason):
        self.status[test.id()].append('skip')
        super().addSkip(test, reason)

    def addExpectedFailure(self, test, err):
        self.status[test.id()].append('expected_failure')
        super().addExpectedFailure(test, err)

    def addUnexpectedSuccess(self, test):
        self.status[test.id()].append('unexpected_success')
        super().addUnexpectedSuccess(test)

    def addSubTest(self, test, subtest, err):
        if err is not None:
            self.status[test.id()].append('subtest_error')
        super().addSubTest(test, subtest, err)


def worker(output, index):
    manifest = json.loads((output / 'manifest.json').read_text())
    row = manifest['workers'][index]
    suite = unittest.TestSuite()
    for name in row['modules']:
        suite.addTests(unittest.defaultTestLoader.loadTestsFromModule(importlib.import_module(name)))
    planned = [test.id() for test in flatten(suite)]
    if planned != row['planned_ids']:
        raise ValueError('worker discovered IDs differ from manifest')
    start = time.monotonic()
    result = unittest.TextTestRunner(verbosity=2, resultclass=RecordingResult).run(suite)
    payload = {'worker': index, 'seconds': time.monotonic()-start,
               'planned_ids': planned, 'started_ids': result.started,
               'finished_ids': result.finished, 'status': result.status,
               'tests_run': result.testsRun, 'successful': result.wasSuccessful()}
    save(output / f'worker-{index}.json', payload)
    return 0 if result.wasSuccessful() else 1


def main(output, count):
    output.mkdir(parents=True, exist_ok=True)
    modules = sorted(path.stem for path in TOOLS.glob('test_proxy_*.py'))
    workers = [{'modules': [], 'planned_ids': []} for _ in range(count)]
    for index, name in enumerate(modules):
        ids = [test.id() for test in flatten(unittest.defaultTestLoader.loadTestsFromModule(importlib.import_module(name)))]
        workers[index % count]['modules'].append(name)
        workers[index % count]['planned_ids'].extend(ids)
    planned = [item for row in workers for item in row['planned_ids']]
    if len(planned) != len(set(planned)):
        raise ValueError('duplicate planned test IDs')
    manifest = {'pattern': 'test_proxy_*.py', 'modules': modules, 'workers': workers,
                'planned_count': len(planned),
                'source_sha256': {name: hashlib.sha256((TOOLS / (name+'.py')).read_bytes()).hexdigest() for name in modules}}
    save(output / 'manifest.json', manifest)
    processes = []
    handles = []
    for index in range(count):
        handle = (output / f'worker-{index}.log').open('w')
        handles.append(handle)
        processes.append(subprocess.Popen([sys.executable, str(Path(__file__).resolve()), str(output), '--worker', str(index)], stdout=handle, stderr=subprocess.STDOUT))
    codes = [process.wait() for process in processes]
    for handle in handles:
        handle.close()
    results = [json.loads((output / f'worker-{index}.json').read_text()) if (output / f'worker-{index}.json').exists() else None for index in range(count)]
    actual = [item for row in results if row for item in row['started_ids']]
    finished = [item for row in results if row for item in row['finished_ids']]
    status = {key: value for row in results if row for key,value in row['status'].items()}
    checks = {'all_exit_zero': all(code==0 for code in codes),
              'all_summaries_present': all(row is not None for row in results),
              'all_workers_successful': all(row and row['successful'] for row in results),
              'exact_started_coverage': sorted(actual)==sorted(planned),
              'exact_finished_coverage': sorted(finished)==sorted(planned),
              'no_duplicates': len(actual)==len(set(actual)) and len(finished)==len(set(finished)),
              'all_pass_no_skip': len(status)==len(planned) and all(value==['pass'] for value in status.values()),
              'source_unchanged': all(hashlib.sha256((TOOLS / (name+'.py')).read_bytes()).hexdigest()==digest for name,digest in manifest['source_sha256'].items())}
    summary = {'checks': checks, 'success': all(checks.values()), 'worker_exit_codes': codes,
               'planned': len(planned), 'started': len(actual), 'finished': len(finished),
               'missing': sorted(set(planned)-set(actual)), 'unexpected': sorted(set(actual)-set(planned)),
               'non_pass': {key:value for key,value in status.items() if value!=['pass']}}
    save(output / 'summary.json', summary)
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0 if summary['success'] else 1


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('output', type=Path)
    parser.add_argument('--workers', type=int, default=6)
    parser.add_argument('--worker', type=int)
    args = parser.parse_args()
    sys.path.insert(0, str(TOOLS))
    sys.exit(worker(args.output.resolve(), args.worker) if args.worker is not None else main(args.output.resolve(), args.workers))
