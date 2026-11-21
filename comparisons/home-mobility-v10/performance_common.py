"""Reuse the pinned WPE runner and unchanged native-clock/OS observers from PR 579."""
import importlib.util
from pathlib import Path

HERE=Path(__file__).resolve().parent
V9=HERE.parent/'home-mobility-v9'
spec=importlib.util.spec_from_file_location('v9_performance_common',V9/'performance_common.py')
prior=importlib.util.module_from_spec(spec)
spec.loader.exec_module(prior)
ARMS=['v8','v9','v10']
WPE,clock,distribution,native_page,save=prior.WPE,prior.clock,prior.distribution,prior.native_page,prior.save
load,digest,touch,intervals_summary,PARAMS=prior.load,prior.digest,prior.touch,prior.intervals_summary,prior.PARAMS
