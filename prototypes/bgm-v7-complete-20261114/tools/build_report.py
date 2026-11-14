import pathlib,json,hashlib
from policies import POLICIES
ROOT=pathlib.Path(__file__).resolve().parents[1]
scores=json.loads((ROOT/'scores-v7.json').read_text());receipts=[json.loads((ROOT/'receipts'/(s['id']+'.json')).read_text()) for s in scores];encoded=json.loads((ROOT/'verification/encoded-audio.json').read_text())
summary={'tracks':32,'melodyNotes':3158,'placements':50,'homeExactFiles':16,'remainingGroups':[7,7,7,7],'lufsMaxTargetDeviation':max(abs(r['integratedLUFS']-r['targetLUFS']) for r in receipts),'highestFlacTruePeakDbtp':max(r['truePeakDbtp'] for r in receipts),'highestAacTruePeakDbtp':max(r['aacTruePeakDbtp'] for r in encoded),'minimumMonoLossDb':min(r['monoLossDb'] for r in receipts),'clippedSamples':sum(r['clippedSamples'] for r in receipts),'maxLimiterReductionDb':max(r['limiterMaxGainReductionDb'] for r in receipts),'minimumAacFullCorrelation':min(r['aacFlacCorrelation'] for r in encoded),'minimumAacChannelCorrelation':min(min(r['channelCorrelations']) for r in encoded),'aacStartupLags':sorted({r['startupLagFrames'] for r in encoded}),'remaining28SyntheticLoops':sum(r.get('syntheticLoops',0) for r in receipts[4:]),'sustainedMaxTranspose':max(abs(u['transpose']) for r in receipts[4:] for u in r['nativeSourceUses'] if u['instrument'] in ('flute','clarinet','violins','violas','cellos','cello_chamber','trumpet')),'productionMain':'105dba519890c2dc17e94a8c9d1b7679720fddf3','protectedPRHeads':{'546':'146383829818fc986926c05700986705d7241858','547':'25c69a0a78e7f72351ffad1836ec4932760f0552','548':'c9c4b82b06b304ea19ca1b86f558fb0467daa3f8'}}
(ROOT/'verification/summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=1)+'\n')
lines=['# 全32曲の制作方針と検証','','ホーム4曲の原盤を完全維持。残り28曲はV6楽譜・強弱と一致。各曲の詳細ハッシュと録音選択はreceiptsへ。','','| ID | 曲名 | 方針 | LUFS | dBTP | mono dB |','|---|---|---|---:|---:|---:|']
for s,r in zip(scores,receipts):
 note='正式採用B2＋原盤をコピー。再生成・再編曲なし。' if s['id'].startswith('home-') else POLICIES[s['id']][2]
 lines.append(f"| {s['id']} | {s['title']} | {note} | {r['integratedLUFS']} | {r['truePeakDbtp']} | {r['monoLossDb']} |")
(ROOT/'TRACKS.md').write_text('\n'.join(lines)+'\n')
files=sorted([* (ROOT/'audio').glob('*.flac'),*(ROOT/'audio').glob('*.m4a'),*(ROOT/'midi').glob('*.mid')]);(ROOT/'SHA256SUMS').write_text(''.join(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+str(p.relative_to(ROOT))+'\n' for p in files))
print(json.dumps(summary,ensure_ascii=False))
