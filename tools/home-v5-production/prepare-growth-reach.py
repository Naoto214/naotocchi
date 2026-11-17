"""Apply only the reviewed production controller hunks to PR558's instrumented fixture."""
import argparse, difflib, pathlib, subprocess
p = argparse.ArgumentParser()
p.add_argument('fixture_controller')
p.add_argument('output')
a = p.parse_args()
old = subprocess.check_output(['git', 'show', '7ba27a4e:home-production-diorama.js'], text=True).splitlines(True)
new = pathlib.Path('home-production-diorama.js').read_text().splitlines(True)
fixture = pathlib.Path(a.fixture_controller).read_text()
for group in difflib.SequenceMatcher(None, old, new).get_grouped_opcodes(3):
    before = ''.join(old[group[0][1]:group[-1][2]])
    after = ''.join(new[group[0][3]:group[-1][4]])
    assert fixture.count(before) == 1, 'Controller hunk must match exactly once'
    fixture = fixture.replace(before, after)
pathlib.Path(a.output).write_text(fixture)
