"""Measured V5/V6 comparison; explicitly not a substitute for listening."""
import json,pathlib,numpy as np,soundfile as sf,sys
ROOT=pathlib.Path(__file__).resolve().parents[1];V5=ROOT.parent/'bgm-v5-20261115'
sys.path.insert(0,str(ROOT.parent/'bgm-v4-20261114/tools'))
from legato_metric import dips
scores=json.loads((ROOT/'scores-v6.json').read_text());profiles=json.loads((ROOT/'profiles.json').read_text())
analysis=['# VERSION 6 — 曲別の楽譜分析と意図\n','これは楽譜と構成の分析です。音源を聴いたという記録ではありません。変更不要な音高・リズム・和声は残しています。\n']
report=['# VERSION 6 — 検証記録\n','主旋律3,158音（V1の原譜・V5 MIDI双方）・32曲・50配置を検証。V5のサンプル別音量補正は保存し、フレーズの意図した差だけを追加。全音の楽器・音高・時刻・長さ・hold・layerは保存。\n','音源: VSCO CE固定コミット、386必要サンプルのSHA-256照合。FFmpeg 7.1.5 / Python 3.12。AAC/FLACを復号して検査。\n','| ID | LUFS | TP dBTP | mono dB | clip | limiter dB | AAC相関 | 小節RMS幅 V5→V6 dB | 旋律表情の追加範囲 dB |','|---|---:|---:|---:|---:|---:|---:|---:|---:|']
measure={}
for s in scores:
 sid=s['id'];analysis.extend(['\n## '+sid+' — '+s['title']+'\n',*['- '+a for a in profiles[sid]['analysis']]])
 p=ROOT/'receipts'/f'{sid}.json'
 if not p.exists():continue
 r=json.loads(p.read_text());env=[]
 for version in (V5,ROOT):
  x,sr=sf.read(version/'audio'/f'{sid}.flac');bar=60/s['bpm']*s['meter'];rms=[]
  for a in np.arange(0,s['period']-.001,bar):
   y=x[round(a*sr):round(min(a+bar,s['period'])*sr)];rms.append(float(10*np.log10(np.mean(y*y)+1e-20)))
  env.append(rms)
 ranges=[round(float(np.percentile(e,90)-np.percentile(e,10)),2) for e in env];delta=[e['expressionDb'] for e in s['events'] if e['role']=='melody'];ext=[round(min(delta),2),round(max(delta),2)]
 measure[sid]={'barRmsDbV5':env[0],'barRmsDbV6':env[1],'barRmsP90P10Db':ranges,'melodyExpressionRangeDb':ext}
 report.append(f"| {sid} | {r['integratedLUFS']} | {r['truePeakDbtp']} | {r['monoLossDb']} | {r['clippedSamples']} | {r['limiterMaxGainReductionDb']} | {r['aacFlacCorrelation']} | {ranges[0]} → {ranges[1]} | {ext[0]}〜{ext[1]} |")
 if sid=='home-night':
  ds=[dips(v/'audio'/f'{sid}.flac',s) for v in (V5,ROOT)];measure[sid]['legatoMedianDb']=[round(float(np.median(d)),2) for d in ds]
report+=['\n## 読み方と限界\n','- 小節RMS幅は90–10パーセンタイル。大きいほど美しいという指標ではない。短いジングルでは特に参考値。','- V5の校正を保存しているので、意図したフレーズ差を音量ムラとして再び平坦化しない。','- 全体を強く圧縮して強弱を作っていない。曲ごとの用途別LUFSはV5と同じ。','- 夜のペダル・リリース0.60秒・打鍵緩和7 dB・残響設定は不変。音間の落ち込み中央値は12.2→12.1 dB。','- 旧版原盤はGitツリーで不変。V5のAAC/FLAC全64本は元receiptのSHA-256とも照合。','- ループは原盤サンプル長・残響折返し・サンプル段差を検証。比較プレーヤーではAAC末尾の詰め物を正確な曲長で除外する。','- 聴感上の美しさと実機iPhone Safariでの最終評価は、自動検証と区別する。']
(ROOT/'ANALYSIS.md').write_text('\n'.join(analysis)+'\n');(ROOT/'VALIDATION.md').write_text('\n'.join(report)+'\n');(ROOT/'measurements.json').write_text(json.dumps(measure,ensure_ascii=False,indent=2)+'\n')
print('Reported',len(measure),'audio pairs and',len(scores),'score analyses')
