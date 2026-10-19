from pathlib import Path
import json,shutil,subprocess,socket,time
p=Path(__file__).resolve().parents[2];q=Path(__file__).resolve().parent
server=subprocess.Popen(['python','-m','http.server','8779','--bind','127.0.0.1','--directory',str(p.parents[2])],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
try:
 for i in range(30):
  try:
   with socket.create_connection(('127.0.0.1',8779),timeout=.1):break
  except OSError:time.sleep(.1)
 r=subprocess.run(['node',str(q/'render.cjs')]);raise SystemExit(r.returncode)
finally:server.terminate()
