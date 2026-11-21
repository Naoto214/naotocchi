"""Run the unchanged V9 native observation methods on the three V10 comparison entries."""
import argparse,runpy,sys
from performance_common import HERE,V9

if __name__=='__main__':
    parser=argparse.ArgumentParser(add_help=False)
    parser.add_argument('experiment',choices=['native','touch'])
    args,rest=parser.parse_known_args()
    path=HERE/'native-gates.py' if args.experiment=='native' else V9/'performance-touch.py'
    sys.argv=[str(path),*rest]
    runpy.run_path(str(path),run_name='__main__')
