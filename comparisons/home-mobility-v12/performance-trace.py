"""Measure time actually executing curved iterator steps inside the existing WPE trace."""
import argparse
import importlib.util
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('p11', HERE.parent / 'home-mobility-v11/performance.py')
old = importlib.util.module_from_spec(spec)
spec.loader.exec_module(old)


def observe_iteration(source):
    # Suspending at yield is free. Only time spent inside each next() counts.
    pattern = r'function\s*\*\s*curvedHandoff\s*\('
    assert len(re.findall(pattern, source)) == 1, 'Missing or ambiguous native generator'
    attach = '''function curvedHandoff(...args){
      const iterator = timedCurveIterator(...args), advance = iterator.next;
      iterator.next = function(...values){
        if (!mobilityPerf.active) return advance.apply(this,values);
        const start=performance.now();
        try {return advance.apply(this,values);}
        finally {mobilityPerf.finish('curvedHandoffSlice',start,8);}
      };
      return iterator;
    } function* timedCurveIterator('''
    return re.sub(pattern, attach, source)


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--order', required=True)
    p.add_argument('--seconds', type=float, default=40)
    p.add_argument('--warmup', type=float, default=8)
    p.add_argument('--base', default='http://127.0.0.1:8377/game')
    p.add_argument('--out', type=Path, required=True)
    args = p.parse_args()
    args.trace = True
    native_page = old.common.native_page

    def page(browser, base, arm, *, transform, **options):
        def wrap(name, body):
            source = transform(name, body)
            return observe_iteration(source) if arm == 'v12' and 'production-model' in name else source
        return native_page(browser, base, arm, transform=wrap, **options)

    old.common.native_page = page
    old.native.native_page = old.attributed_page
    old.native.run(args)


if __name__ == '__main__':
    main()
