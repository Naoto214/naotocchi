from pathlib import Path
import numpy as np,json
from PIL import Image
from scipy.ndimage import map_coordinates
from scipy.optimize import least_squares
p=Path(__file__).resolve().parent.parent;a=np.array(Image.open(p/'assets/dial-art-v4.png').convert('RGB').resize((1024,1024))).astype(float);rad=np.arange(345,376,.2);pts=[]
for deg in np.arange(-100,101,1):
 t=np.deg2rad(deg);x=512+rad*np.sin(t);y=500-rad*np.cos(t);rgb=np.stack([map_coordinates(a[:,:,c],[y,x],order=1)for c in range(3)],axis=1);score=rgb.mean(1)-(rgb.max(1)-rgb.min(1))*2;i=np.argmax(score);pts.append([float(x[i]),float(y[i]),float(rad[i]),float(deg)])
P=np.array(pts);fit=least_squares(lambda q:np.hypot(P[:,0]-q[0],P[:,1]-q[1])-q[2],[512,500,359],loss='soft_l1',f_scale=1);cx,cy,r=fit.x;res=np.hypot(P[:,0]-cx,P[:,1]-cy)-r
ellipse=least_squares(lambda q:(np.sqrt(((P[:,0]-q[0])/q[2])**2+((P[:,1]-q[1])/q[3])**2)-1)*359,[cx,cy,r,r],loss='soft_l1',f_scale=1)
out={'method':'Bright low-chroma ridge in radius345..376, upper exposed arc -100..100 degrees, 1 degree sampling; lower arc obscured by foliage. Not full-circle certification.','circle':fit.x.tolist(),'ellipse':ellipse.x.tolist(),'residualMedianAbs':float(np.median(abs(res))),'residualMaxAbs':float(max(abs(res))),'points':pts};(p/'v14/evidence/ring-fit.json').write_text(json.dumps(out,indent=2));print({k:v for k,v in out.items() if k!='points'})
