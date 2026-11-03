// Image-space authored metadata. Coordinates are fractions of the complete 1024×1536 artwork.
// These are independent scenes, never sampled from v22 terrain or camera.
export const ART_CANDIDATES = [
 {id:'forest-a',region:'forest',name:'苔と巨木の聖域',medium:'光の層を描くシネマティック絵画',note:'静かな奥行き。岩と根の起伏は歩行領域から除外。'},
 {id:'forest-b',region:'forest',name:'樹上の小さな庭',medium:'柔らかなガッシュと空中庭園',note:'明快な形と開放感。細い連絡路が28体の生活には不利。'},
 {id:'water-a',region:'river_lake',name:'透きとおる湖の白い岸',medium:'明るい石灰岩と透明な水の風景画',note:'輪郭が読みやすい。水際の段差と白いキャラの明度差に注意。'},
 {id:'water-b',region:'river_lake',name:'滝の音が届く水庭',medium:'群青と朱の夕暮れの水庭',note:'濃い背景に明るいキャラが映える。暗色キャラと石段には注意。'},
 {id:'city-a',region:'city',name:'夕景の屋上庭園',medium:'夕日の建築画と柔らかな庭',note:'街を眺める生活空間。夕日の焼き込みは昼夜差分の制作が必要。'},
 {id:'city-b',region:'city',name:'雨上がりの灯る街角',medium:'宝石色の手描きの街並み',note:'人の営みが伝わる。奥の細道と反射の密度は28体で不利。'}
].map(c=>({...c,src:`assets/home-art-v1/${c.id}.webp`}));
export const ART_SCENES = {
 forest:{candidate:'forest-a',ground:[[.39,.43],[.75,.37],[.90,.4],[.88,.50],[.97,.53],[.97,.69],[.92,.78],[.94,.89],[.72,.93],[.42,.84],[.25,.77],[.12,.71],[.14,.60],[.35,.57]],
  exclude:[[[.34,.60],[.54,.60],[.59,.67],[.40,.69]],[[.67,.71],[.84,.69],[.9,.78],[.72,.79]]],blockedSamples:[[.1,.4],[.45,.64],[.8,.74]],
  foreground:[[[0,.71],[.18,.75],[.28,.81],[.40,.90],[.38,1],[0,1]]],points:[[.52,.52,'observe','tree'],[.62,.83,'rest','shelter']],accent:'pollen'},
 river_lake:{candidate:'water-a',ground:[[.03,.34],[.38,.31],[.75,.36],[.79,.39],[.73,.42],[.54,.43],[.60,.47],[.64,.49],[.58,.54],[.50,.56],[.51,.60],[.71,.63],[.95,.67],[.92,.80],[.75,.82],[.65,.92],[.04,.94]],
  exclude:[],blockedSamples:[[.85,.5],[.8,.6],[.9,.3]],foreground:[[[.86,.70],[1,.64],[1,1],[.89,1],[.83,.85]]],points:[[.58,.39,'observe','water'],[.42,.76,'rest','shelter']],accent:'water'},
 city:{candidate:'city-a',ground:[[.16,.37],[.37,.33],[.40,.41],[.59,.45],[.75,.50],[.77,.59],[.96,.66],[.97,.95],[.66,.95],[.59,.86],[.44,.81],[.30,.74],[.27,.65],[.14,.61],[.07,.50]],
  exclude:[],blockedSamples:[[.8,.45],[.2,.8],[.5,.3]],foreground:[[[0,.52],[.15,.58],[.21,.68],[.45,.76],[.52,.84],[.49,1],[0,1]]],points:[[.43,.49,'observe','building'],[.67,.72,'rest','shelter']],accent:'glow'}
};
