import unittest,json,pathlib
class Loudness(unittest.TestCase):
 def test_ffmpeg_trailing_progress(self):
  from render_compat import parse_loudness
  self.assertEqual(parse_loudness('[loudnorm] {"input_i":"-23.01", "input_tp":"-5"}\n[out#0] audio: 200KiB\n')['input_i'],'-23.01')
if __name__=='__main__':unittest.main()
