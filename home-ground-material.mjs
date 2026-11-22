// Normalized coordinates in the full painting, before viewport cropping.
const boundaries = {
  forest: [[0,.606],[.20,.575],[.42,.556],[.61,.550],[.80,.558],[1,.600]],
  home: [[0,.525],[.12,.487],[.23,.442],[.30,.410],[.54,.383],[.60,.389],
         [.64,.404],[.69,.374],[.78,.375],[1,.413]],
  city: [[0,.615],[.14,.574],[.24,.554],[.36,.537],[.45,.526],[.57,.540],
         [.69,.550],[.78,.559],[.792,.624],[1,.669]],
  // Follow the line of shoreline stones, leaving a small uncertain margin.
  river_lake: [[0,.329],[.11,.324],[.24,.349],[.36,.389],[.49,.436],
               [.62,.489],[.75,.548],[.87,.596],[1,.644]]
};
// Exposed stones just inside the near shoreline interrupt the water surface.
const channelRocks = [[.237,.324,.024,.010],[.288,.324,.028,.014],[.343,.332,.021,.010]];
const farBank = [[0,.285],[.2,.285],[.42,.281],[.58,.279],[.75,.290],[1,.315]];

function edgeHeight(vertices, x) {
  for (let i=1; i<vertices.length; i++) {
    const [right, y2] = vertices[i];
    if (x<=right) {
      const [left, y1] = vertices[i-1];
      return y1+(y2-y1)*(x-left)/(right-left);
    }
  }
  return vertices[vertices.length-1][1];
}

export function surfaceAt(region, x, y) {
  if (!Object.hasOwn(boundaries, region) || !(x>=0 && x<=1 && y>=0 && y<=1)) return '';
  const edge = edgeHeight(boundaries[region], x);
  if (region==='river_lake') {
    if (y>edge+.013) return 'pebbles';
    if (x>.16 && y>=edgeHeight(farBank,x)+.008 && y<edge-.015) {
      const exposed=channelRocks.some(([cx,cy,rx,ry])=>((x-cx)/rx)**2+((y-cy)/ry)**2<=1);
      if (!exposed) return 'river';
    }
    return 'uncertain';
  }
  if (y<edge) return 'uncertain';
  if (region==='city') {
    // The foreground bench and flowering planter rise above the tiled path.
    if (x<.48 && y>.626+x*.45) return 'uncertain';
    return 'paving';
  }
  if (region==='home') return x<.24 && y>.86+x*.62 ? 'uncertain' : 'boards';
  // The lower left bank is dense leaf litter and rocks, not a grass surface.
  return x<.55 && y>.77+x*.42 ? 'uncertain' : 'clearing';
}
