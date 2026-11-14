"""Supported rendering entry point: validate actual samples before render/cache hits."""
import pathlib,runpy
from check_samples import check
if __name__=='__main__':
 check()
 runpy.run_path(str(pathlib.Path(__file__).with_name('render_v6.py')),run_name='__main__')
