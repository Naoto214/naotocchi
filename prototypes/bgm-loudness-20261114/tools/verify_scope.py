import pathlib,subprocess,re,hashlib,json
ROOT=pathlib.Path(__file__).resolve().parents[1];REPO=ROOT.parents[1];P=pathlib.Path('/workspace/work/playtest');BASE='0433a39d2b75a3a7931d095dd18127958b0bb89a'
files=subprocess.check_output(['git','diff','--name-only',BASE],cwd=P,text=True).splitlines();expected=['bgm-subapps.js','prototypes/naopoyo-time-hand-chapter1/index.html','prototypes/life-sugoroku/index.html','prototypes/card-game/index.html'];assert set(files)==set(expected),files
assert (P/'bgm-subapps.js').read_bytes()==(ROOT/'preview/bgm-subapps.js').read_bytes()
old=(ROOT/'reference/bgm-subapps.js').read_text();new=(P/'bgm-subapps.js').read_text();assert new==old.replace('const bgm = B.forPage({ base:', '// 本体のBGM出力: master 0.9 × FILE_LEVEL 0.4 = 0.36。効果音には適用しない。\n  const bgm = B.forPage({ level: 0.36, base:')
for f in files:
 if f=='bgm-subapps.js':continue
 a=subprocess.check_output(['git','show',BASE+':'+f],cwd=P,text=True);b=(P/f).read_text();norm=lambda s:re.sub(r'bgm-subapps\.js(?:\?v=[a-f0-9]+)?','bgm-subapps.js',s);assert norm(a)==norm(b)
changes=subprocess.check_output(['git','diff','--name-only','01a5591'],cwd=REPO,text=True).splitlines();assert all(f.startswith(('prototypes/bgm-loudness-20261114/','docs/superpowers/plans/2026-11-14-bgm-loudness.md')) for f in changes)
result={'passed':True,'previewBaseline':BASE,'changedFiles':files,'audioChanged':False,'SFXVoiceSaveCodeChanged':False,'conditionFadeOutputCodeChanged':False,'sourceGainBefore':.9,'sourceGainAfter':.36,'gainDb':-7.958800173440752};(ROOT/'verification/scope.json').write_text(json.dumps(result,indent=1)+'\n');print('PASS preview scope4files: BGM parameter + cache only; original PR549 files unchanged')
