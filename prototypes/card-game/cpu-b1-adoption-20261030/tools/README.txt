check-equivalence.mjs: official cpu-policy/cpu-observation vs PR #491 runs (ref/: manifest and E1/base records copied read-only
from claude/naotocchi-cpu-b123-x8rev0). Run from this folder: for k in 0 1 2 3; do node tools/check-equivalence.mjs 4 $k 4 > evidence/equivalence-$k.json & done; wait
