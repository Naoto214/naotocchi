"""Restore a forest checkpoint and deliver the frozen native 28-touch sequence."""
import argparse
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'home-mobility-v10'))
from forest_touch_v10 import run

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    for key in ('url','arm','chromium'):
        p.add_argument('--'+key,required=True)
    for key in ('width','order','seed'):
        p.add_argument('--'+key,required=True,type=int)
    for key in ('snapshot','out'):
        p.add_argument('--'+key,required=True,type=Path)
    p.add_argument('--reference-tape',type=Path)
    p.add_argument('--saved-game',action='store_true')
    p.set_defaults(historical_v9=False)
    run(p.parse_args())
