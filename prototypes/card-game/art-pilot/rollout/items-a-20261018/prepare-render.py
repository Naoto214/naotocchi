from pathlib import Path
import json,shutil,subprocess,socket,time
p=Path(__file__).resolve().parents[2];q=Path(__file__).resolve().parent
scenes=json.loads((q/'items-prompts.json').read_text());ids=json.loads((p/'production-cards.json').read_text())
for s in scenes:
 dst=p/'illustrations'/f"{s['id']}.png"
 if not dst.exists():shutil.copyfile(s['generated_path'],dst)
 if s['id'] not in ids:ids.append(s['id'])
(p/'production-cards.json').write_text(json.dumps(ids,indent=2)+'\n')
server=subprocess.Popen(['python','-m','http.server','8776','--bind','127.0.0.1','--directory',str(p.parents[2])],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
try:
 for i in range(30):
  try:
   with socket.create_connection(('127.0.0.1',8776),timeout=.1):break
  except OSError:time.sleep(.1)
 r=subprocess.run(['node',str(q/'render.cjs')]);raise SystemExit(r.returncode)
finally:server.terminate()
