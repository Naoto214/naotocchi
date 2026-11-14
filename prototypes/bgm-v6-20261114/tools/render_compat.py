"""FFmpeg 7 may append output statistics after loudnorm's JSON object."""
import json,subprocess
def parse_loudness(text):
 obj,_=json.JSONDecoder().raw_decode(text[text.rfind('{'):])
 for k in ('input_i','input_tp'):float(obj[k])
 return obj
def loudness(path):
 p=subprocess.run(['ffmpeg','-hide_banner','-nostdin','-i',str(path),'-af','loudnorm=I=-23:TP=-2:LRA=11:print_format=json','-f','null','-'],capture_output=True,text=True,check=True)
 return parse_loudness(p.stderr)
