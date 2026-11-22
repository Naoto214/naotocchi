"""Combine separately pinned production cohorts with the frozen candidate's native results."""
import argparse
import importlib.util
import json
from pathlib import Path
import itertools

from regional import REGIONS, HEIGHT

spec=importlib.util.spec_from_file_location('pair_report',Path(__file__).with_name('pair-report.py'))
report=importlib.util.module_from_spec(spec)
spec.loader.exec_module(report)


def main():
    cli=argparse.ArgumentParser(description=__doc__)
    for name in ('original','current','candidate','out'):
        cli.add_argument(name,type=Path)
    args=cli.parse_args()
    original=report.load_rows([args.original,args.candidate])
    current_rows=report.load_rows([args.current])
    expected=set(itertools.product(REGIONS,(1,4,10,20,28),HEIGHT))
    assert set(original)=={(*key,arm) for key in expected for arm in report.ARMS}
    assert set(current_rows)=={(*key,'production') for key in expected}
    _,old=report.summarize(original)
    _,new=report.summarize({**original,**current_rows})
    def summary(s):
        return {k:s[k] for k in ('phases','totals','stationaryDrags','maxSyncShift','modelSeconds','returnTrip')}
    result=dict(sources=dict(original='9539e462',current='384730f1',prior='d5bed0e0',candidate='f6719c51'),
                original=summary(old['production']),current=summary(new['production']),
                candidateAgainstCurrent=summary(new['candidate']))
    args.out.write_text(json.dumps(result,indent=2)+'\n')


if __name__=='__main__':main()
