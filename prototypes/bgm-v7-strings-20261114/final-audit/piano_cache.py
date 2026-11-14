"""Candidate-only piano cache: complete native takes, unchanged note envelopes."""
import pathlib,sys
from fractions import Fraction
import numpy as np
from scipy.signal import resample_poly
BASE=pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0,str(BASE/'bgm-v6-20261114/tools'));import render_v6 as V
L=V.L
class PianoLibrary(L.Library):
 def shifted(self,inst,root,layer,rri,src,semis,maxlen):
  if inst!='piano':return super().shifted(inst,root,layer,rri,src,semis,maxlen)
  key=(inst,root,layer,rri,semis)
  if key not in self.cache:
   if semis:
    fr=Fraction(2**(-semis/12)).limit_denominator(1000);x=resample_poly(src,fr.numerator,fr.denominator,axis=0).astype(np.float32)
   else:x=src
   self.cache[key]=x
  return self.cache[key]
