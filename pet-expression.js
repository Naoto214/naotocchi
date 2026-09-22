(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NaotocchiPetExpression = api;
})(typeof window !== 'undefined' ? window : null, function () {
  const BASE_ASSET = 'assets/characters/cat/06.png';
  const EXPRESSIONS = Object.freeze([
    'normal','happy','strained','sulky','hungry','sick','tired','weak','critical','wantsPlay','sleeping',
  ]);
  const VARIANT_ASSETS = Object.freeze({
    happy: 'assets/characters/expressions/cat/06-happy-v3.png',
    strained: 'assets/characters/expressions/cat/06-strained.png',
    sulky: 'assets/characters/expressions/cat/06-sulky.png',
    hungry: 'assets/characters/expressions/cat/06-hungry.png',
    sick: 'assets/characters/expressions/cat/06-sick.png',
    tired: 'assets/characters/expressions/cat/06-tired.png',
    weak: 'assets/characters/expressions/cat/06-weak.png',
    critical: 'assets/characters/expressions/cat/06-critical.png',
    wantsPlay: 'assets/characters/expressions/cat/06-wantsPlay.png',
    sleeping: 'assets/characters/expressions/cat/06-sleeping-v3.png',
  });
  // BEGIN GENERATED FACE PLACEMENT
  const MARK_PLACEMENT = {
    "cat/01": {"face":[52,98],"sweat":{"leftInner":27.25,"rightInner":76.75,"centerY":79.625},"marks":{"happy":[-27.5,27],"strained":[2.5,39.5],"hungry":[-26.5,23.5],"sick":[-23,28.5],"tired":[-23.5,27],"sulky":[-22,22],"weak":[-24.5,33],"critical":[-21.5,28],"wantsPlay":[-39.5,43],"sleeping":[-30.5,24.5]}},
    "cat/02": {"face":[55,77],"sweat":{"leftInner":25.1875,"rightInner":78.6875,"centerY":62.5625},"marks":{"happy":[-10.5,9.5],"strained":[-12,16],"hungry":[-23.5,5],"sick":[-22,6],"tired":[-23,7.5],"sulky":[-18.5,1],"weak":[-19,8],"critical":[-10,8],"wantsPlay":[-37,17.5],"sleeping":[-23.5,6]}},
    "cat/03": {"face":[49,70],"sweat":{"leftInner":20.3125,"rightInner":41.8125,"centerY":19.875},"marks":{"happy":[-15.5,-2],"strained":[-19,13.5],"hungry":[-25.5,0.5],"sick":[-8.5,-17],"tired":[-25.5,4],"sulky":[-22.5,-6],"weak":[-20,2],"critical":[-21.5,-1],"wantsPlay":[-42,7.5],"sleeping":[-25,1]}},
    "cat/04": {"face":[34,74],"sweat":{"leftInner":9.625,"rightInner":51.125,"centerY":41.125},"marks":{"happy":[-28,8],"strained":[-26,21],"hungry":[-38.5,5.5],"sick":[-37.5,0],"tired":[-38,8],"sulky":[-36,0],"weak":[-36.5,6.5],"critical":[-28,7],"wantsPlay":[-54,15],"sleeping":[-37,5]}},
    "cat/05": {"face":[39,55],"sweat":{"leftInner":15.1875,"rightInner":88.6875,"centerY":44.6875},"marks":{"happy":[-26.5,-10],"strained":[-24,4],"hungry":[-33,-12],"sick":[-34,-13.5],"tired":[-36.5,-9.5],"sulky":[-34.5,-18.5],"weak":[-25.5,-8],"critical":[-26.5,-11.5],"wantsPlay":[-50,-3.5],"sleeping":[-35.5,-15]}},
    "cat/06": {"face":[48,52],"sweat":{"leftInner":14.625,"rightInner":66.625,"centerY":23.75},"marks":{"happy":[-30.5,-24],"strained":[-23,-4],"hungry":[-30.5,-15.5],"sick":[-31.5,-16.5],"tired":[-30.5,-12.5],"sulky":[-27.5,-23.5],"weak":[-28.5,-15.5],"critical":[-26.5,-18],"wantsPlay":[-42.5,-6.5],"sleeping":[-29.5,-16]}},
    "cat/07": {"face":[48,54],"sweat":{"leftInner":16.5,"rightInner":61.5,"centerY":43.875},"marks":{"happy":[-10,-5.5],"strained":[-21.5,-1],"hungry":[-18.5,-18],"sick":[-26.5,-16],"tired":[-4.5,-7],"sulky":[-23,-21],"weak":[-6,-6],"critical":[-18,-14],"wantsPlay":[-42.5,-2.5],"sleeping":[0,-9]}},
    "cat/08": {"face":[48,66],"sweat":{"leftInner":13,"rightInner":88.5,"centerY":53.125},"marks":{"happy":[-5,-5.5],"strained":[-24.5,6.5],"hungry":[-24.5,-6.5],"sick":[-20.5,-10],"tired":[-23.5,-5],"sulky":[-16.5,-15.5],"weak":[-18,-8],"critical":[-19.5,-12],"wantsPlay":[-42.5,6],"sleeping":[-23.5,-6.5]}},
    "dog/01": {"face":[52,108],"sweat":{"leftInner":26.75,"rightInner":77.25,"centerY":87.75},"marks":{"happy":[-26,32],"strained":[-2,50],"hungry":[-26.5,30],"sick":[-22,34.5],"tired":[-25.5,32.5],"sulky":[-21.5,28.5],"weak":[-23.5,39],"critical":[-21,34.5],"wantsPlay":[-39.5,48],"sleeping":[-26,31]}},
    "dog/02": {"face":[63,79],"sweat":{"leftInner":24.1875,"rightInner":79.6875,"centerY":64.1875},"marks":{"happy":[-2.5,9.5],"strained":[7,8.5],"hungry":[-12,2.5],"sick":[-10,4.5],"tired":[-11,4],"sulky":[-6.5,-0.5],"weak":[-5,10],"critical":[-6,6],"wantsPlay":[-30.5,16.5],"sleeping":[-10.5,2.5]}},
    "dog/03": {"face":[51,73],"sweat":{"leftInner":18.875,"rightInner":84.875,"centerY":59.3125},"marks":{"happy":[-7.5,0.5],"strained":[-21,12.5],"hungry":[-29,-5],"sick":[-26.5,-4.5],"tired":[-28.5,-2],"sulky":[-23,-9.5],"weak":[-24,-2.5],"critical":[-21.5,-5.5],"wantsPlay":[-40.5,9.5],"sleeping":[-28.5,-4]}},
    "dog/04": {"face":[52,76],"sweat":{"leftInner":22.875,"rightInner":39.375,"centerY":16.75},"marks":{"happy":[-18,-4.5],"strained":[-19,16],"hungry":[-28,-5],"sick":[-8,-21],"tired":[-29,2],"sulky":[-26,-11.5],"weak":[-24,0.5],"critical":[-25.5,-5],"wantsPlay":[-39.5,5],"sleeping":[-27,-5.5]}},
    "dog/05": {"face":[39,53],"sweat":{"leftInner":13.6875,"rightInner":52.6875,"centerY":35.0625},"marks":{"happy":[-27.5,-16.5],"strained":[-26.5,0],"hungry":[-11.5,-9.5],"sick":[-14.5,-10],"tired":[-14,-6],"sulky":[-33,-26],"weak":[-11,-3.5],"critical":[-24,-18],"wantsPlay":[-50,-4.5],"sleeping":[-9.5,-8]}},
    "dog/06": {"face":[40,53],"sweat":{"leftInner":14.625,"rightInner":52.625,"centerY":24.5625},"marks":{"happy":[-26,-18],"strained":[-25,0.5],"hungry":[-36,-17.5],"sick":[-40.5,-20],"tired":[-39,-15],"sulky":[-37,-26.5],"weak":[-37.5,-19],"critical":[-36,-21.5],"wantsPlay":[-49,-9.5],"sleeping":[-34,-19.5]}},
    "dog/07": {"face":[50,66],"sweat":{"leftInner":19.0625,"rightInner":69.0625,"centerY":53.125},"marks":{"happy":[-15,1.5],"strained":[-21.5,7.5],"hungry":[-29.5,-11.5],"sick":[-28.5,-7],"tired":[-25,-7],"sulky":[-24.5,-13.5],"weak":[-20,0],"critical":[-24,-6.5],"wantsPlay":[-41,-2.5],"sleeping":[-28.5,-12]}},
    "dog/08": {"face":[50,73],"sweat":{"leftInner":15.0625,"rightInner":77.0625,"centerY":59.3125},"marks":{"happy":[-12.5,5],"strained":[-16,7],"hungry":[-28.5,-9],"sick":[-23.5,-2.5],"tired":[-23.5,-4.5],"sulky":[-23.5,-10.5],"weak":[-18.5,3.5],"critical":[-19,-2],"wantsPlay":[-41,7],"sleeping":[-28,-8]}},
    "man/01": {"face":[65,91],"sweat":{"leftInner":32.3125,"rightInner":72.3125,"centerY":73.9375},"marks":{"happy":[-9,24.5],"strained":[3,34],"hungry":[8,41.5],"sick":[1,27],"tired":[5.5,42],"sulky":[1,15],"weak":[-4,26.5],"critical":[14,39],"wantsPlay":[-29,28.5],"sleeping":[10.5,43.5]}},
    "man/02": {"face":[65,67],"sweat":{"leftInner":29.3125,"rightInner":78.3125,"centerY":54.4375},"marks":{"happy":[-3.5,3],"strained":[0.5,12],"hungry":[5.5,0],"sick":[5.5,8],"tired":[3.5,3],"sulky":[10.5,-3],"weak":[4,8],"critical":[9,4.5],"wantsPlay":[-29,6.5],"sleeping":[7.5,1]}},
    "man/03": {"face":[65,60],"sweat":{"leftInner":28.3125,"rightInner":74.8125,"centerY":48.75},"marks":{"happy":[-3.5,-3],"strained":[1.5,2.5],"hungry":[8,-1.5],"sick":[5,2.5],"tired":[5.5,1],"sulky":[13.5,-5.5],"weak":[6.5,5],"critical":[12,2],"wantsPlay":[-29,0],"sleeping":[10,-1]}},
    "man/04": {"face":[65,46],"sweat":{"leftInner":28.3125,"rightInner":74.8125,"centerY":37.375},"marks":{"happy":[-3,-10.5],"strained":[-6.5,6],"hungry":[11,3.5],"sick":[1.5,-10.5],"tired":[8.5,4.5],"sulky":[11,-15],"weak":[4.5,-4.5],"critical":[10,-8],"wantsPlay":[-29,-8],"sleeping":[13,6]}},
    "man/05": {"face":[65,45],"sweat":{"leftInner":28.3125,"rightInner":75.8125,"centerY":36.5625},"marks":{"happy":[-3.5,-10.5],"strained":[1,-5.5],"hungry":[11.5,2.5],"sick":[-1,-13.5],"tired":[9.5,3],"sulky":[-8.5,-29],"weak":[2.5,-8],"critical":[7.5,-11.5],"wantsPlay":[-29,-8.5],"sleeping":[14,4.5]}},
    "man/06": {"face":[65,44],"sweat":{"leftInner":27.3125,"rightInner":76.8125,"centerY":35.75},"marks":{"happy":[-5,-14.5],"strained":[5.5,-10.5],"hungry":[13,1],"sick":[-0.5,-15],"tired":[10.5,2],"sulky":[-8.5,-30],"weak":[2.5,-9],"critical":[7.5,-12.5],"wantsPlay":[-29,-9.5],"sleeping":[15,3.5]}},
    "man/07": {"face":[65,45],"sweat":{"leftInner":27.3125,"rightInner":75.8125,"centerY":36.5625},"marks":{"happy":[-5.5,-13],"strained":[1,-5.5],"hungry":[12,2.5],"sick":[4.5,-9],"tired":[8.5,0],"sulky":[-5,-27.5],"weak":[3,-8.5],"critical":[7.5,-12],"wantsPlay":[-29,-8],"sleeping":[14,4.5]}},
    "man/08": {"face":[64,48],"sweat":{"leftInner":30,"rightInner":73,"centerY":39},"marks":{"happy":[-3,-5.5],"strained":[2,-1],"hungry":[9,5.5],"sick":[0,-8],"tired":[6,6.5],"sulky":[-10.5,-23.5],"weak":[6.5,3],"critical":[5.5,-8],"wantsPlay":[-29.5,-4],"sleeping":[11.5,7.5]}},
    "woman/01": {"face":[65,90],"sweat":{"leftInner":30.8125,"rightInner":72.3125,"centerY":73.125},"marks":{"happy":[-3,29.5],"strained":[3.5,34],"hungry":[3,21.5],"sick":[0.5,26.5],"tired":[3,27.5],"sulky":[7.5,18.5],"weak":[3,32],"critical":[0.5,21.5],"wantsPlay":[-29,28.5],"sleeping":[7.5,25.5]}},
    "woman/02": {"face":[66,64],"sweat":{"leftInner":23.125,"rightInner":80.625,"centerY":52},"marks":{"happy":[-1,3.5],"strained":[5.5,10],"hungry":[1,-2.5],"sick":[-1,2.5],"tired":[-3.5,-1.5],"sulky":[8,-2.5],"weak":[-0.5,6.5],"critical":[4.5,2.5],"wantsPlay":[-28,4.5],"sleeping":[2.5,-2]}},
    "woman/03": {"face":[64,61],"sweat":{"leftInner":27,"rightInner":77,"centerY":49.5625},"marks":{"happy":[8,13],"strained":[-2.5,5],"hungry":[8,-1.5],"sick":[5,3],"tired":[5.5,1],"sulky":[14,-6],"weak":[7.5,4.5],"critical":[12.5,1.5],"wantsPlay":[-29.5,-3],"sleeping":[10,-1]}},
    "woman/04": {"face":[66,59],"sweat":{"leftInner":26.625,"rightInner":76.625,"centerY":47.9375},"marks":{"happy":[-2.5,-4],"strained":[-1,3.5],"hungry":[9,-3],"sick":[5.5,2],"tired":[6.5,0],"sulky":[14,-6.5],"weak":[7.5,4],"critical":[12.5,1],"wantsPlay":[-28,-2.5],"sleeping":[11,-2]}},
    "woman/05": {"face":[65,54],"sweat":{"leftInner":26.8125,"rightInner":76.8125,"centerY":43.875},"marks":{"happy":[0,-6.5],"strained":[-2.5,3.5],"hungry":[9.5,-8],"sick":[6.5,-3],"tired":[7.5,-5.5],"sulky":[14.5,-11.5],"weak":[7.5,-1],"critical":[13,-4],"wantsPlay":[-29,-5.5],"sleeping":[12,-7.5]}},
    "woman/06": {"face":[65,54],"sweat":{"leftInner":23.3125,"rightInner":79.8125,"centerY":43.875},"marks":{"happy":[-1,-6],"strained":[-1,0],"hungry":[9,-7.5],"sick":[6,-3],"tired":[6.5,-5],"sulky":[14,-11.5],"weak":[7.5,-0.5],"critical":[10,-6.5],"wantsPlay":[-29,-5.5],"sleeping":[11.5,-7]}},
    "woman/07": {"face":[64,53],"sweat":{"leftInner":27,"rightInner":76.5,"centerY":43.0625},"marks":{"happy":[-0.5,-8],"strained":[-3,3],"hungry":[9.5,-9.5],"sick":[4,-8],"tired":[7.5,-7],"sulky":[11.5,-16.5],"weak":[7.5,-2],"critical":[12.5,-5],"wantsPlay":[-29.5,-6.5],"sleeping":[12,-9]}},
    "woman/08": {"face":[65,55],"sweat":{"leftInner":29.8125,"rightInner":74.3125,"centerY":44.6875},"marks":{"happy":[-3,1],"strained":[-4.5,10.5],"hungry":[3,-7],"sick":[0.5,-2],"tired":[8,12],"sulky":[-6,-17],"weak":[-1.5,-0.5],"critical":[8,1],"wantsPlay":[-29,-2],"sleeping":[5,-6.5]}},
    "penguin/01": {"face":[64,90],"sweat":{"leftInner":31,"rightInner":73,"centerY":73.125},"marks":{"happy":[-6,27.5],"strained":[5,32],"hungry":[1.5,21.5],"sick":[-11.5,18.5],"tired":[-0.5,25],"sulky":[6,19.5],"weak":[-0.5,30.5],"critical":[6.5,30],"wantsPlay":[-29.5,31],"sleeping":[3.5,22.5]}},
    "penguin/02": {"face":[63,80],"sweat":{"leftInner":25.1875,"rightInner":78.1875,"centerY":65},"marks":{"happy":[-4,16.5],"strained":[-0.5,23],"hungry":[4,10.5],"sick":[-7,8],"tired":[2,14],"sulky":[8,8],"weak":[2,19],"critical":[7,16],"wantsPlay":[-30.5,17.5],"sleeping":[6,11]}},
    "penguin/03": {"face":[64,69],"sweat":{"leftInner":22,"rightInner":81,"centerY":56.0625},"marks":{"happy":[-4,9],"strained":[3,12.5],"hungry":[5.5,6],"sick":[-6.5,0],"tired":[1,6.5],"sulky":[8,0],"weak":[3.5,14],"critical":[8.5,11],"wantsPlay":[-29.5,9],"sleeping":[8,7.5]}},
    "penguin/04": {"face":[65,62],"sweat":{"leftInner":26.8125,"rightInner":80.8125,"centerY":50.375},"marks":{"happy":[-1,0.5],"strained":[-1.5,6],"hungry":[6.5,-5.5],"sick":[-7.5,-11.5],"tired":[5,-2.5],"sulky":[14,-5],"weak":[5,3.5],"critical":[10,0],"wantsPlay":[-29,-1.5],"sleeping":[9,-4.5]}},
    "penguin/05": {"face":[64,50],"sweat":{"leftInner":32,"rightInner":75.5,"centerY":40.625},"marks":{"happy":[-2,-5],"strained":[2.5,1],"hungry":[6,-9.5],"sick":[-10,-17],"tired":[4,-6.5],"sulky":[11,-12.5],"weak":[4,-1.5],"critical":[6.5,-7.5],"wantsPlay":[-29.5,-4],"sleeping":[8.5,-8.5]}},
    "penguin/06": {"face":[64,49],"sweat":{"leftInner":29.5,"rightInner":75.5,"centerY":38.8125},"marks":{"happy":[-3,-8.5],"strained":[-0.5,-3],"hungry":[6.5,-10.5],"sick":[-6,-17],"tired":[4,-7.5],"sulky":[8.5,-17],"weak":[2.5,-6],"critical":[10,-6],"wantsPlay":[-29.5,-8],"sleeping":[9,-9.5]}},
    "penguin/07": {"face":[64,57],"sweat":{"leftInner":29.5,"rightInner":75.5,"centerY":38.8125},"marks":{"happy":[0.5,-5.5],"strained":[-4,0],"hungry":[9,-6.5],"sick":[-3,-16],"tired":[6.5,-3],"sulky":[14.5,-10],"weak":[8,0.5],"critical":[13.5,-2.5],"wantsPlay":[-29.5,-8],"sleeping":[11.5,-5]}},
    "penguin/08": {"face":[64,61],"sweat":{"leftInner":19.5,"rightInner":83.5,"centerY":49.5625},"marks":{"happy":[3.5,-5.5],"strained":[-4.5,8],"hungry":[13,-6.5],"sick":[-5.5,-18],"tired":[10.5,-3],"sulky":[19,-10.5],"weak":[12,0.5],"critical":[14,-6],"wantsPlay":[-29.5,-6.5],"sleeping":[15.5,-5.5]}},
    "turtle/01": {"face":[49,94],"sweat":{"leftInner":26.8125,"rightInner":77.3125,"centerY":76.375},"marks":{"happy":[-21,33.5],"strained":[-2,44.5],"hungry":[-16.5,30],"sick":[-30.5,30.5],"tired":[-18,33.5],"sulky":[-14.5,26.5],"weak":[-18,39],"critical":[-13,36],"wantsPlay":[-42,45.5],"sleeping":[-21,28.5]}},
    "turtle/02": {"face":[46,81],"sweat":{"leftInner":24.375,"rightInner":55.375,"centerY":41.8125},"marks":{"happy":[-23.5,19],"strained":[-6.5,28.5],"hungry":[-14.5,15.5],"sick":[-24.5,-3.5],"tired":[-16,19],"sulky":[-10,13],"weak":[-16,24.5],"critical":[-11.5,21],"wantsPlay":[-44.5,27.5],"sleeping":[-12,16]}},
    "turtle/03": {"face":[44,72],"sweat":{"leftInner":18.75,"rightInner":52.75,"centerY":36},"marks":{"happy":[-24,14.5],"strained":[-10.5,22],"hungry":[-18,9.5],"sick":[-26.5,-9.5],"tired":[-19,13],"sulky":[-13.5,7.5],"weak":[-19,18.5],"critical":[-14.5,15],"wantsPlay":[-46,23],"sleeping":[-15.5,10.5]}},
    "turtle/04": {"face":[32,63],"sweat":{"leftInner":12.5,"rightInner":83.5,"centerY":51.1875},"marks":{"happy":[-40.5,8.5],"strained":[-15,17.5],"hungry":[-33,3],"sick":[-44,4.5],"tired":[-34,6.5],"sulky":[-28.5,1.5],"weak":[-31.5,13.5],"critical":[-26.5,10],"wantsPlay":[-55.5,20],"sleeping":[-31,4]}},
    "turtle/05": {"face":[31,66],"sweat":{"leftInner":9.6875,"rightInner":85.1875,"centerY":48.125},"marks":{"happy":[-32.5,-2],"strained":[-18,20],"hungry":[-32,3.5],"sick":[-44,5],"tired":[-32.5,6.5],"sulky":[-30.5,0],"weak":[-32,7],"critical":[-28.5,4],"wantsPlay":[-56.5,19.5],"sleeping":[-30,4]}},
    "turtle/06": {"face":[28,68],"sweat":{"leftInner":8.75,"rightInner":90.25,"centerY":51.75},"marks":{"happy":[-32.5,-11.5],"strained":[-20.5,22],"hungry":[-40.5,2],"sick":[-47.5,0],"tired":[-37.5,0],"sulky":[-30,-9.5],"weak":[-31.5,-2.5],"critical":[-28.5,-5.5],"wantsPlay":[-59,19],"sleeping":[-36.5,-1.5]}},
    "turtle/07": {"face":[27,70],"sweat":{"leftInner":8.4375,"rightInner":96.4375,"centerY":56.875},"marks":{"happy":[-32.5,-11.5],"strained":[-23.5,21.5],"hungry":[-40.5,2],"sick":[-48.5,1],"tired":[-38,1],"sulky":[-30,-9.5],"weak":[-31.5,-2.5],"critical":[-28.5,-5.5],"wantsPlay":[-60,20],"sleeping":[-37.5,-0.5]}},
    "turtle/08": {"face":[26,84],"sweat":{"leftInner":8.125,"rightInner":96.125,"centerY":68.25},"marks":{"happy":[-20.5,-10],"strained":[-22,35],"hungry":[-29.5,-7],"sick":[-45,-3.5],"tired":[-27.5,-7],"sulky":[-23,-12],"weak":[-13,-1],"critical":[-15.5,-6],"wantsPlay":[-60.5,19],"sleeping":[-26.5,-9]}},
    "frog/01": {"face":[48,68],"sweat":{"leftInner":27.5,"rightInner":76.5,"centerY":55.25},"marks":{"happy":[-25,38.5],"strained":[-5,51.5],"hungry":[-13.5,36],"sick":[-29.5,34.5],"tired":[-15,39],"sulky":[-9.5,33.5],"weak":[-15.5,44.5],"critical":[-13,39.5],"wantsPlay":[-42.5,49],"sleeping":[-11.5,36.5]}},
    "frog/02": {"face":[40,66],"sweat":{"leftInner":19.5,"rightInner":84.5,"centerY":53.625},"marks":{"happy":[-30.5,37.5],"strained":[-10,52.5],"hungry":[-26,37],"sick":[-34.5,38],"tired":[-24.5,42],"sulky":[-21.5,34.5],"weak":[-27,46],"critical":[-24.5,40.5],"wantsPlay":[-49,52.5],"sleeping":[-20.5,39.5]}},
    "frog/03": {"face":[37,62],"sweat":{"leftInner":14.5625,"rightInner":89.5625,"centerY":50.375},"marks":{"happy":[-35,32],"strained":[-14.5,42.5],"hungry":[-24,29],"sick":[-33.5,29.5],"tired":[-25.5,32.5],"sulky":[-23,25.5],"weak":[-26,38],"critical":[-23.5,33],"wantsPlay":[-51.5,42.5],"sleeping":[-25,28]}},
    "frog/04": {"face":[33,93],"sweat":{"leftInner":9.8125,"rightInner":94.3125,"centerY":75.5625},"marks":{"happy":[-36.5,28],"strained":[-20,39],"hungry":[-26.5,26.5],"sick":[-38.5,24.5],"tired":[-28,30],"sulky":[-24.5,22],"weak":[-28,35],"critical":[-25.5,29.5],"wantsPlay":[-55,39],"sleeping":[-24,27.5]}},
    "frog/05": {"face":[51,79],"sweat":{"leftInner":21.9375,"rightInner":68.4375,"centerY":55.6875},"marks":{"happy":[-15.5,17.5],"strained":[-5,23.5],"hungry":[-16.5,9.5],"sick":[-23,12],"tired":[-16.5,12],"sulky":[-12.5,8],"weak":[-16.5,19],"critical":[-8,15],"wantsPlay":[-40.5,25.5],"sleeping":[-15,10.5]}},
    "frog/06": {"face":[53,70],"sweat":{"leftInner":19.0625,"rightInner":66.5625,"centerY":49.375},"marks":{"happy":[-13.5,10],"strained":[-5,14.5],"hungry":[-20.5,4],"sick":[-22.5,6.5],"tired":[-15.5,5.5],"sulky":[-11.5,1.5],"weak":[-12,12.5],"critical":[-11,7.5],"wantsPlay":[-38.5,20],"sleeping":[-14,4]}},
    "frog/07": {"face":[63,44],"sweat":{"leftInner":19.1875,"rightInner":84.6875,"centerY":35.75},"marks":{"happy":[2,-13.5],"strained":[3.5,-11],"hungry":[-11,-19.5],"sick":[-8,-19.5],"tired":[-4,-20.5],"sulky":[0.5,-24.5],"weak":[0.5,-13.5],"critical":[0.5,-18.5],"wantsPlay":[-30.5,-2.5],"sleeping":[-3,-22]}},
    "frog/08": {"face":[62,54],"sweat":{"leftInner":16.375,"rightInner":86.375,"centerY":43.875},"marks":{"happy":[2,-6],"strained":[-1.5,-3],"hungry":[-12,-10.5],"sick":[-9,-11],"tired":[-10,-11],"sulky":[-1,-16],"weak":[-0.5,-5.5],"critical":[-0.5,-10],"wantsPlay":[-31.5,3.5],"sleeping":[-9.5,-12.5]}},
    "clownfish/01": {"face":[47,65],"sweat":{"leftInner":28.1875,"rightInner":75.6875,"centerY":52.8125},"marks":{"happy":[-23.5,44.5],"strained":[-0.5,57.5],"hungry":[-28,39],"sick":[-32.5,41],"tired":[-24,40],"sulky":[-20,36],"weak":[-24,47],"critical":[-19,42],"wantsPlay":[-43.5,55.5],"sleeping":[-22.5,38.5]}},
    "clownfish/02": {"face":[42,65],"sweat":{"leftInner":23.125,"rightInner":80.625,"centerY":52.8125},"marks":{"happy":[-19.5,38],"strained":[-5,52],"hungry":[-27,35],"sick":[-35.5,36],"tired":[-28.5,37.5],"sulky":[-21.5,30.5],"weak":[-18.5,41],"critical":[-17.5,37],"wantsPlay":[-47.5,53],"sleeping":[-27,36]}},
    "clownfish/03": {"face":[36,66],"sweat":{"leftInner":26.75,"rightInner":60.25,"centerY":28.625},"marks":{"happy":[-23.5,28],"strained":[-9.5,47.5],"hungry":[-34,27],"sick":[-38,24.5],"tired":[-32.5,26],"sulky":[-22,19.5],"weak":[-22.5,30.5],"critical":[-26.5,26],"wantsPlay":[-52.5,44],"sleeping":[-31.5,24]}},
    "clownfish/04": {"face":[32,69],"sweat":{"leftInner":22,"rightInner":61,"centerY":30.0625},"marks":{"happy":[-22.5,23.5],"strained":[-14,46],"hungry":[-33.5,20.5],"sick":[-44,21],"tired":[-32.5,20.5],"sulky":[-27.5,15],"weak":[-22,26],"critical":[-22,21],"wantsPlay":[-55.5,40],"sleeping":[-31.5,18.5]}},
    "clownfish/05": {"face":[28,65],"sweat":{"leftInner":8.25,"rightInner":95.25,"centerY":52.8125},"marks":{"happy":[-29,-16.5],"strained":[-20.5,23],"hungry":[-33.5,-8],"sick":[-46,-6],"tired":[-33,-7],"sulky":[-25,-17.5],"weak":[-29.5,-5],"critical":[-25,-10.5],"wantsPlay":[-59,14],"sleeping":[-32,-9]}},
    "clownfish/06": {"face":[29,68],"sweat":{"leftInner":21.5625,"rightInner":62.5625,"centerY":28.25},"marks":{"happy":[-21.5,17],"strained":[-17,45],"hungry":[-38.5,21.5],"sick":[-46,17.5],"tired":[-34.5,16.5],"sulky":[-23,9],"weak":[-21.5,19.5],"critical":[-23,16],"wantsPlay":[-58,38],"sleeping":[-36,18.5]}},
    "clownfish/07": {"face":[26,62],"sweat":{"leftInner":19.125,"rightInner":64.125,"centerY":22.375},"marks":{"happy":[-19.5,9.5],"strained":[-19,33],"hungry":[-40.5,11],"sick":[-48.5,8],"tired":[-39.5,11],"sulky":[-31,-0.5],"weak":[-22.5,8],"critical":[-24.5,5],"wantsPlay":[-60.5,29],"sleeping":[-39.5,10.5]}},
    "clownfish/08": {"face":[24,68],"sweat":{"leftInner":8.5,"rightInner":96,"centerY":55.25},"marks":{"happy":[-19.5,4.5],"strained":[-22.5,37],"hungry":[-39,9],"sick":[-49.5,8],"tired":[-36,5.5],"sulky":[-29.5,-2],"weak":[-31,5],"critical":[-23,3.5],"wantsPlay":[-62,28.5],"sleeping":[-35,4]}},
    "salmon/01": {"face":[43,64],"sweat":{"leftInner":26.9375,"rightInner":77.4375,"centerY":52},"marks":{"happy":[-22,38],"strained":[-3.5,56],"hungry":[-28,37.5],"sick":[-36,40],"tired":[-28.5,40],"sulky":[-22.5,33.5],"weak":[-19.5,44],"critical":[-20,41.5],"wantsPlay":[-47,55.5],"sleeping":[-27,38.5]}},
    "salmon/02": {"face":[36,68],"sweat":{"leftInner":21.75,"rightInner":82.25,"centerY":55.25},"marks":{"happy":[-25,37],"strained":[-9,57.5],"hungry":[-32.5,37.5],"sick":[-43,38.5],"tired":[-36,40],"sulky":[-25.5,31],"weak":[-22,42],"critical":[-25,37.5],"wantsPlay":[-52.5,55.5],"sleeping":[-35.5,38.5]}},
    "salmon/03": {"face":[30,70],"sweat":{"leftInner":17.875,"rightInner":86.375,"centerY":56.875},"marks":{"happy":[-24.5,30.5],"strained":[-15,56],"hungry":[-41,36.5],"sick":[-45.5,37.5],"tired":[-40.5,38],"sulky":[-28,27],"weak":[-34,34.5],"critical":[-23,33.5],"wantsPlay":[-57.5,53],"sleeping":[-39.5,36]}},
    "salmon/04": {"face":[28,70],"sweat":{"leftInner":14.75,"rightInner":89.75,"centerY":56.875},"marks":{"happy":[-24,35],"strained":[-17,56],"hungry":[-42,36],"sick":[-47,38],"tired":[-38,37.5],"sulky":[-29.5,28],"weak":[-35.5,36],"critical":[-24.5,34.5],"wantsPlay":[-59,53],"sleeping":[-36.5,36]}},
    "salmon/05": {"face":[27,64],"sweat":{"leftInner":11.4375,"rightInner":92.9375,"centerY":52},"marks":{"happy":[-37.5,18],"strained":[-19,46],"hungry":[-38.5,26.5],"sick":[-48,30],"tired":[-39,29],"sulky":[-30,18.5],"weak":[-38.5,30],"critical":[-33.5,24],"wantsPlay":[-60,44.5],"sleeping":[-37.5,27.5]}},
    "salmon/06": {"face":[25,68],"sweat":{"leftInner":8.3125,"rightInner":96.3125,"centerY":55.25},"marks":{"happy":[-21.5,23.5],"strained":[-20,45.5],"hungry":[-38.5,26],"sick":[-49,29.5],"tired":[-39,28.5],"sulky":[-29,16.5],"weak":[-36.5,26],"critical":[-32.5,21],"wantsPlay":[-61.5,44],"sleeping":[-37.5,27]}},
    "salmon/07": {"face":[26,66],"sweat":{"leftInner":8.125,"rightInner":96.125,"centerY":53.625},"marks":{"happy":[-36,12],"strained":[-19,42.5],"hungry":[-38,23],"sick":[-48,26.5],"tired":[-38.5,25.5],"sulky":[-28.5,13],"weak":[-36.5,24],"critical":[-32,18],"wantsPlay":[-60.5,41.5],"sleeping":[-37,24]}},
    "salmon/08": {"face":[25,66],"sweat":{"leftInner":8.8125,"rightInner":96.3125,"centerY":53.625},"marks":{"happy":[-38.5,17.5],"strained":[-18.5,47],"hungry":[-45,29],"sick":[-49.5,30.5],"tired":[-40.5,29.5],"sulky":[-35.5,18],"weak":[-40.5,31.5],"critical":[-34.5,23.5],"wantsPlay":[-61.5,45.5],"sleeping":[-43.5,28.5]}},
    "hermit_crab/01": {"face":[80,96],"sweat":{"leftInner":27,"rightInner":76.5,"centerY":78},"marks":{"happy":[0.5,39],"strained":[19.5,34],"hungry":[10,35.5],"sick":[-5,31],"tired":[7.5,38.5],"sulky":[12.5,30.5],"weak":[6.5,41.5],"critical":[13,40.5],"wantsPlay":[-16.5,42.5],"sleeping":[12.5,36.5]}},
    "hermit_crab/02": {"face":[83,96],"sweat":{"leftInner":21.9375,"rightInner":82.4375,"centerY":78},"marks":{"happy":[7,38],"strained":[14.5,30],"hungry":[15,33.5],"sick":[-1.5,28.5],"tired":[12.5,36.5],"sulky":[18,27.5],"weak":[12,38.5],"critical":[16.5,35.5],"wantsPlay":[-14.5,35.5],"sleeping":[17,34.5]}},
    "hermit_crab/03": {"face":[90,82],"sweat":{"leftInner":12.125,"rightInner":92.625,"centerY":66.625},"marks":{"happy":[12.5,24],"strained":[16.5,7],"hungry":[20,18],"sick":[10.5,17.5],"tired":[18,21.5],"sulky":[21,14],"weak":[18,27],"critical":[22.5,23.5],"wantsPlay":[-8.5,13],"sleeping":[18,17]}},
    "hermit_crab/04": {"face":[87,91],"sweat":{"leftInner":16.6875,"rightInner":87.1875,"centerY":73.9375},"marks":{"happy":[11,33.5],"strained":[12,18.5],"hungry":[14,28.5],"sick":[8,25],"tired":[12.5,31.5],"sulky":[19,26],"weak":[12.5,37],"critical":[18.5,32.5],"wantsPlay":[-11,25.5],"sleeping":[16.5,29]}},
    "hermit_crab/05": {"face":[91,88],"sweat":{"leftInner":12.9375,"rightInner":90.4375,"centerY":71.5},"marks":{"happy":[14,31],"strained":[16.5,18],"hungry":[19,24.5],"sick":[11,23],"tired":[19,30],"sulky":[23.5,22],"weak":[17,33],"critical":[22,30],"wantsPlay":[-8,24],"sleeping":[23.5,28]}},
    "hermit_crab/06": {"face":[88,84],"sweat":{"leftInner":10,"rightInner":93.5,"centerY":68.25},"marks":{"happy":[16,24.5],"strained":[13,13.5],"hungry":[21.5,21.5],"sick":[11,7],"tired":[17.5,22],"sulky":[24,16],"weak":[17.5,27],"critical":[24.5,26.5],"wantsPlay":[-10,14.5],"sleeping":[24,22.5]}},
    "hermit_crab/07": {"face":[88,81],"sweat":{"leftInner":8.5,"rightInner":96,"centerY":65.8125},"marks":{"happy":[15.5,18.5],"strained":[15.5,7],"hungry":[20,15.5],"sick":[10,7],"tired":[17.5,19.5],"sulky":[27.5,15],"weak":[21,25.5],"critical":[26.5,22],"wantsPlay":[-10,15],"sleeping":[22,16.5]}},
    "hermit_crab/08": {"face":[89,83],"sweat":{"leftInner":8.8125,"rightInner":95.3125,"centerY":67.4375},"marks":{"happy":[11.5,24.5],"strained":[14,-4.5],"hungry":[16.5,16.5],"sick":[6.5,18],"tired":[15,19.5],"sulky":[23.5,16],"weak":[17.5,27],"critical":[22.5,23.5],"wantsPlay":[-9.5,11.5],"sleeping":[18.5,17]}},
    "jellyfish/01": {"face":[64,72],"sweat":{"leftInner":31,"rightInner":76.5,"centerY":58.5},"marks":{"happy":[7,0],"strained":[-4,12.5],"hungry":[10,5],"sick":[-9.5,-12],"tired":[8,8],"sulky":[19,-1.5],"weak":[12.5,9.5],"critical":[18.5,5.5],"wantsPlay":[-29.5,-8.5],"sleeping":[12.5,6]}},
    "jellyfish/02": {"face":[62,56],"sweat":{"leftInner":19.375,"rightInner":79.875,"centerY":45.5},"marks":{"happy":[8.5,-10],"strained":[2,-9.5],"hungry":[10.5,-16.5],"sick":[-10.5,-26],"tired":[9,-14],"sulky":[6.5,-24.5],"weak":[9,-8.5],"critical":[14.5,-12],"wantsPlay":[-31.5,-11.5],"sleeping":[13,-16]}},
    "jellyfish/03": {"face":[64,72],"sweat":{"leftInner":13,"rightInner":89.5,"centerY":58.5},"marks":{"happy":[16.5,-5],"strained":[-21,0.5],"hungry":[0,-8.5],"sick":[-13.5,-10],"tired":[4,-13],"sulky":[9.5,-19.5],"weak":[18,-5.5],"critical":[8.5,-10.5],"wantsPlay":[-29.5,4.5],"sleeping":[4.5,-14.5]}},
    "jellyfish/04": {"face":[65,59],"sweat":{"leftInner":8.3125,"rightInner":96.3125,"centerY":47.9375},"marks":{"happy":[15,-12],"strained":[4.5,-1],"hungry":[0,-8],"sick":[-11.5,-9],"tired":[-4.5,-7],"sulky":[5,-19.5],"weak":[13.5,-9.5],"critical":[11.5,-13.5],"wantsPlay":[-29,5.5],"sleeping":[-2.5,-10]}},
    "jellyfish/05": {"face":[64,50],"sweat":{"leftInner":9,"rightInner":96,"centerY":40.625},"marks":{"happy":[8,-15.5],"strained":[6,-7.5],"hungry":[-2,-16],"sick":[-13,-16],"tired":[-2.5,-13],"sulky":[6.5,-24],"weak":[8,-13.5],"critical":[6,-17],"wantsPlay":[-29.5,-2],"sleeping":[-1,-15.5]}},
    "jellyfish/06": {"face":[63,47],"sweat":{"leftInner":8.6875,"rightInner":96.1875,"centerY":38.1875},"marks":{"happy":[9,-22],"strained":[2,-10],"hungry":[2.5,-21],"sick":[-6,-20],"tired":[1.5,-17.5],"sulky":[5,-28],"weak":[-4,-17.5],"critical":[10,-20],"wantsPlay":[-30.5,-9.5],"sleeping":[0.5,-23]}},
    "jellyfish/07": {"face":[74,42],"sweat":{"leftInner":13.625,"rightInner":93.625,"centerY":34.125},"marks":{"happy":[9.5,-9],"strained":[11,-4.5],"hungry":[5,-13],"sick":[-7.5,-14.5],"tired":[1,-12],"sulky":[7,-18.5],"weak":[8,-8.5],"critical":[7,-11.5],"wantsPlay":[-21.5,0],"sleeping":[3.5,-15]}},
    "jellyfish/08": {"face":[75,51],"sweat":{"leftInner":8.4375,"rightInner":95.4375,"centerY":41.4375},"marks":{"happy":[15,-13],"strained":[13,-9],"hungry":[4.5,-20],"sick":[-3.5,-18],"tired":[10.5,-18],"sulky":[15,-22.5],"weak":[16,-11.5],"critical":[15,-16],"wantsPlay":[-21,-3.5],"sleeping":[6,-20.5]}},
    "starfish/01": {"face":[63,75],"sweat":{"leftInner":8.1875,"rightInner":96.1875,"centerY":60.9375},"marks":{"happy":[13,-3],"strained":[-14,0],"hungry":[21,-9],"sick":[-5.5,-21.5],"tired":[23,-1],"sulky":[25.5,-11.5],"weak":[19,-0.5],"critical":[28,1],"wantsPlay":[-30.5,-9],"sleeping":[27.5,-3]}},
    "starfish/02": {"face":[62,73],"sweat":{"leftInner":36.375,"rightInner":67.875,"centerY":23.3125},"marks":{"happy":[-0.5,4.5],"strained":[-3.5,18.5],"hungry":[4.5,6.5],"sick":[-13,-18.5],"tired":[3,9],"sulky":[10,3],"weak":[4,13.5],"critical":[9.5,10],"wantsPlay":[-31.5,-4.5],"sleeping":[6.5,7.5]}},
    "starfish/03": {"face":[64,67],"sweat":{"leftInner":38.5,"rightInner":65.5,"centerY":19.4375},"marks":{"happy":[-0.5,1.5],"strained":[-1,14.5],"hungry":[3,4.5],"sick":[-12,-22.5],"tired":[2,7],"sulky":[8.5,1],"weak":[4,10.5],"critical":[8,8.5],"wantsPlay":[-29.5,-2],"sleeping":[5,5.5]}},
    "starfish/04": {"face":[57,65],"sweat":{"leftInner":8.3125,"rightInner":96.3125,"centerY":52.8125},"marks":{"happy":[1.5,0],"strained":[-2,-2],"hungry":[4.5,-1],"sick":[-12,-25.5],"tired":[2,2.5],"sulky":[10.5,-4.5],"weak":[4.5,5.5],"critical":[9.5,2.5],"wantsPlay":[-35.5,-11.5],"sleeping":[6.5,0.5]}},
    "starfish/05": {"face":[64,66],"sweat":{"leftInner":37.5,"rightInner":66.5,"centerY":19.125},"marks":{"happy":[-1.5,1],"strained":[-1,13],"hungry":[4.5,1.5],"sick":[-6,-23.5],"tired":[-0.5,2.5],"sulky":[8.5,-0.5],"weak":[3.5,9.5],"critical":[8,6.5],"wantsPlay":[-29.5,-2.5],"sleeping":[6.5,2.5]}},
    "starfish/06": {"face":[64,68],"sweat":{"leftInner":38.5,"rightInner":65.5,"centerY":19.75},"marks":{"happy":[-7.5,1.5],"strained":[1.5,15.5],"hungry":[4.5,6.5],"sick":[-11.5,-20],"tired":[-1,8],"sulky":[8,-1],"weak":[-1.5,9.5],"critical":[4,3.5],"wantsPlay":[-29.5,3],"sleeping":[6,7.5]}},
    "starfish/07": {"face":[65,70],"sweat":{"leftInner":40.8125,"rightInner":64.3125,"centerY":21.875},"marks":{"happy":[-2.5,4.5],"strained":[1,21.5],"hungry":[2.5,12],"sick":[-11,-17],"tired":[-2,13],"sulky":[7.5,2.5],"weak":[-1,12.5],"critical":[4,7],"wantsPlay":[-29,5],"sleeping":[2.5,8.5]}},
    "starfish/08": {"face":[65,69],"sweat":{"leftInner":8.3125,"rightInner":96.3125,"centerY":56.0625},"marks":{"happy":[16.5,1.5],"strained":[2.5,3],"hungry":[-1,1],"sick":[-7,-1],"tired":[-1,3.5],"sulky":[3,-8],"weak":[1.5,-1],"critical":[15,-1.5],"wantsPlay":[-29,3],"sleeping":[1,1]}},
    "coral/01": {"face":[64,70],"sweat":{"leftInner":8.5,"rightInner":96,"centerY":56.875},"marks":{"happy":[10.5,0],"strained":[-10,2.5],"hungry":[18,-6.5],"sick":[-7,-15],"tired":[16,-3],"sulky":[22,-8.5],"weak":[16,2.5],"critical":[21,-1],"wantsPlay":[-29.5,-2],"sleeping":[20,-5.5]}},
    "coral/02": {"face":[64,84],"sweat":{"leftInner":10,"rightInner":94,"centerY":68.25},"marks":{"happy":[13,3.5],"strained":[-10.5,8.5],"hungry":[24.5,2.5],"sick":[-11,-14.5],"tired":[18.5,1.5],"sulky":[28.5,0.5],"weak":[22,10.5],"critical":[27.5,7.5],"wantsPlay":[-29.5,-2],"sleeping":[27,3.5]}},
    "coral/03": {"face":[68,75],"sweat":{"leftInner":12.75,"rightInner":91.25,"centerY":60.9375},"marks":{"happy":[12.5,0],"strained":[-8,0.5],"hungry":[17.5,-3.5],"sick":[0.5,-12],"tired":[15,1],"sulky":[25.5,-1.5],"weak":[19,9],"critical":[25,5],"wantsPlay":[-26.5,-11.5],"sleeping":[19.5,-2]}},
    "coral/04": {"face":[65,90],"sweat":{"leftInner":12.8125,"rightInner":96.3125,"centerY":73.125},"marks":{"happy":[16.5,6],"strained":[-1.5,8],"hungry":[9,-1.5],"sick":[-7.5,0],"tired":[8,2],"sulky":[13.5,-3.5],"weak":[4.5,5.5],"critical":[12.5,4.5],"wantsPlay":[-29,8.5],"sleeping":[10.5,-1]}},
    "coral/05": {"face":[63,95],"sweat":{"leftInner":8.1875,"rightInner":96.1875,"centerY":77.1875},"marks":{"happy":[7.5,10.5],"strained":[-9.5,20],"hungry":[4.5,6.5],"sick":[-4,5],"tired":[0,6.5],"sulky":[10.5,2.5],"weak":[6.5,13],"critical":[4.5,8.5],"wantsPlay":[-30.5,17],"sleeping":[7.5,5]}},
    "coral/06": {"face":[56,90],"sweat":{"leftInner":8.5,"rightInner":96,"centerY":73.125},"marks":{"happy":[9.5,5.5],"strained":[-10,27.5],"hungry":[9,-1.5],"sick":[-14,-3],"tired":[8,2],"sulky":[13.5,-3.5],"weak":[8.5,7.5],"critical":[12.5,4],"wantsPlay":[-36,19],"sleeping":[11,-1]}},
    "coral/07": {"face":[63,72],"sweat":{"leftInner":23.1875,"rightInner":74.6875,"centerY":29.5},"marks":{"happy":[1,10],"strained":[-5.5,6],"hungry":[8,6],"sick":[-16.5,-8],"tired":[5.5,9.5],"sulky":[14,2],"weak":[7.5,13],"critical":[9.5,6.5],"wantsPlay":[-30.5,4.5],"sleeping":[9.5,8]}},
    "coral/08": {"face":[73,81],"sweat":{"leftInner":8.3125,"rightInner":96.3125,"centerY":65.8125},"marks":{"happy":[2.5,19],"strained":[19,24.5],"hungry":[6,11.5],"sick":[-8.5,12.5],"tired":[8,16.5],"sulky":[13.5,11.5],"weak":[8,22.5],"critical":[12.5,19],"wantsPlay":[-22.5,27],"sleeping":[8,12]}},
    "butterfly/01": {"face":[46,58],"sweat":{"leftInner":26.875,"rightInner":51.375,"centerY":29.625},"marks":{"happy":[-24.5,40],"strained":[-4.5,44],"hungry":[-16.5,35],"sick":[-27,16],"tired":[-18.5,38],"sulky":[-13.5,29.5],"weak":[-18.5,43],"critical":[-15,38],"wantsPlay":[-44.5,45],"sleeping":[-13.5,36]}},
    "butterfly/02": {"face":[42,58],"sweat":{"leftInner":20.125,"rightInner":52.625,"centerY":35.125},"marks":{"happy":[-26.5,25],"strained":[-11,33],"hungry":[-16.5,22],"sick":[-36.5,14],"tired":[-18.5,25],"sulky":[-14,16.5],"weak":[-18.5,30],"critical":[-15.5,24.5],"wantsPlay":[-47.5,31.5],"sleeping":[-14,23]}},
    "butterfly/03": {"face":[36,52],"sweat":{"leftInner":12.75,"rightInner":59.25,"centerY":36.75},"marks":{"happy":[-27.5,8.5],"strained":[-16,16.5],"hungry":[-20,2.5],"sick":[-37.5,0],"tired":[-22,6],"sulky":[-19,-2],"weak":[-22,11.5],"critical":[-15,11],"wantsPlay":[-52.5,14.5],"sleeping":[-18,3.5]}},
    "butterfly/04": {"face":[43,77],"sweat":{"leftInner":16.4375,"rightInner":85.4375,"centerY":62.5625},"marks":{"happy":[-10,-20],"strained":[-13,26],"hungry":[-12,-17],"sick":[-23.5,-14.5],"tired":[-12,-14.5],"sulky":[-7.5,-19],"weak":[-9,-11],"critical":[-6,-14],"wantsPlay":[-47,-6],"sleeping":[-11,-16]}},
    "butterfly/05": {"face":[70,70],"sweat":{"leftInner":38.875,"rightInner":74.375,"centerY":56.875},"marks":{"happy":[17.5,-5.5],"strained":[9,20.5],"hungry":[19.5,1],"sick":[-9,-13.5],"tired":[15.5,5.5],"sulky":[32,-8],"weak":[25.5,2],"critical":[31.5,-1.5],"wantsPlay":[-25,-1.5],"sleeping":[26,-1.5]}},
    "butterfly/06": {"face":[56,72],"sweat":{"leftInner":28.5,"rightInner":90,"centerY":56},"marks":{"happy":[12.5,-12],"strained":[-0.5,25.5],"hungry":[-4.5,-16.5],"sick":[-15.5,-13.5],"tired":[1,-13],"sulky":[0.5,-19.5],"weak":[-2.5,-10],"critical":[1.5,-14.5],"wantsPlay":[-36,-9.5],"sleeping":[-4,-15.5]}},
    "butterfly/07": {"face":[63,65],"sweat":{"leftInner":9.6875,"rightInner":96.1875,"centerY":52.8125},"marks":{"happy":[-4.5,-10],"strained":[-3,-9],"hungry":[5.5,-7],"sick":[-13,-7],"tired":[4,-3.5],"sulky":[10,-10],"weak":[-3.5,-1],"critical":[10.5,-3.5],"wantsPlay":[-30.5,5.5],"sleeping":[7.5,-7]}},
    "butterfly/08": {"face":[61,65],"sweat":{"leftInner":8.5625,"rightInner":96.0625,"centerY":52.8125},"marks":{"happy":[-8.5,-3.5],"strained":[-5,-7],"hungry":[-7.5,-4.5],"sick":[-15.5,-2.5],"tired":[5.5,2],"sulky":[-2.5,-7.5],"weak":[-1.5,3.5],"critical":[7.5,0.5],"wantsPlay":[-32,8],"sleeping":[-6,-5]}},
    "beetle/01": {"face":[86,77],"sweat":{"leftInner":24.375,"rightInner":79.875,"centerY":62.5625},"marks":{"happy":[5.5,26],"strained":[21.5,19.5],"hungry":[13.5,21],"sick":[2,17],"tired":[11.5,24],"sulky":[16.5,16],"weak":[11.5,29],"critical":[15,24],"wantsPlay":[-12,25.5],"sleeping":[16,22]}},
    "beetle/02": {"face":[102,92],"sweat":{"leftInner":11.375,"rightInner":92.875,"centerY":74.75},"marks":{"happy":[16.5,37.5],"strained":[37.5,31],"hungry":[25.5,34],"sick":[12,29.5],"tired":[22,35],"sulky":[26,28],"weak":[22,40.5],"critical":[26.5,37.5],"wantsPlay":[1,40.5],"sleeping":[28,35]}},
    "beetle/03": {"face":[103,49],"sweat":{"leftInner":8.6875,"rightInner":94.1875,"centerY":39.8125},"marks":{"happy":[21,-1],"strained":[35,-15.5],"hungry":[29,-3],"sick":[20,-7.5],"tired":[27,0],"sulky":[34.5,-6.5],"weak":[28,4],"critical":[31,-1],"wantsPlay":[2,-5.5],"sleeping":[31.5,-2]}},
    "beetle/04": {"face":[80,55],"sweat":{"leftInner":26,"rightInner":74.5,"centerY":44.6875},"marks":{"happy":[14.5,-3.5],"strained":[15.5,0.5],"hungry":[11,1],"sick":[2,-21],"tired":[8.5,4.5],"sulky":[22.5,-7],"weak":[16,3],"critical":[22,-0.5],"wantsPlay":[-16.5,-6],"sleeping":[15,1]}},
    "beetle/05": {"face":[83,91],"sweat":{"leftInner":12.9375,"rightInner":91.4375,"centerY":73.9375},"marks":{"happy":[22.5,15.5],"strained":[11.5,15],"hungry":[22,23.5],"sick":[6.5,2.5],"tired":[19,27],"sulky":[35.5,13.5],"weak":[29,23.5],"critical":[35,20],"wantsPlay":[-14.5,17],"sleeping":[28,21.5]}},
    "beetle/06": {"face":[87,91],"sweat":{"leftInner":9.6875,"rightInner":91.6875,"centerY":73.9375},"marks":{"happy":[22.5,12.5],"strained":[19,13.5],"hungry":[20.5,27.5],"sick":[10,1],"tired":[20.5,28.5],"sulky":[38,13.5],"weak":[31.5,24.5],"critical":[37.5,20.5],"wantsPlay":[-11,15.5],"sleeping":[23,28.5]}},
    "beetle/07": {"face":[84,89],"sweat":{"leftInner":8.25,"rightInner":96.25,"centerY":72.3125},"marks":{"happy":[28,9],"strained":[14.5,8],"hungry":[22,22.5],"sick":[9,-4],"tired":[21,24.5],"sulky":[39.5,9],"weak":[32,20],"critical":[38.5,16],"wantsPlay":[-13.5,10.5],"sleeping":[23.5,24.5]}},
    "beetle/08": {"face":[87,102],"sweat":{"leftInner":9.6875,"rightInner":88.6875,"centerY":82.875},"marks":{"happy":[30.5,26],"strained":[14,13.5],"hungry":[21,36],"sick":[13,2.5],"tired":[17,40.5],"sulky":[37.5,23],"weak":[28,36],"critical":[34,32.5],"wantsPlay":[-11,17],"sleeping":[23.5,37]}},
    "stagbeetle/01": {"face":[82,74],"sweat":{"leftInner":29.625,"rightInner":73.125,"centerY":60.125},"marks":{"happy":[0.5,22.5],"strained":[21.5,21.5],"hungry":[9,20],"sick":[-0.5,13.5],"tired":[6.5,23],"sulky":[14.5,16],"weak":[8,27],"critical":[13,24],"wantsPlay":[-15,26.5],"sleeping":[11.5,21]}},
    "stagbeetle/02": {"face":[105,102],"sweat":{"leftInner":10.3125,"rightInner":93.8125,"centerY":82.875},"marks":{"happy":[20,45],"strained":[40.5,39.5],"hungry":[28.5,41.5],"sick":[20.5,37.5],"tired":[26,45],"sulky":[32,36],"weak":[27,49.5],"critical":[30.5,44.5],"wantsPlay":[3.5,47],"sleeping":[31,43]}},
    "stagbeetle/03": {"face":[98,41],"sweat":{"leftInner":19.125,"rightInner":87.625,"centerY":33.3125},"marks":{"happy":[16,-6.5],"strained":[29,-12.5],"hungry":[23.5,-8.5],"sick":[15.5,-13],"tired":[21.5,-5.5],"sulky":[30,-12.5],"weak":[21.5,-3.5],"critical":[28,-4.5],"wantsPlay":[-2,-6],"sleeping":[26,-7]}},
    "stagbeetle/04": {"face":[80,42],"sweat":{"leftInner":25.5,"rightInner":78.5,"centerY":34.125},"marks":{"happy":[1.5,-6],"strained":[13,-8],"hungry":[10,-8.5],"sick":[1,-12.5],"tired":[8,-5.5],"sulky":[13.5,-14.5],"weak":[8.5,-1],"critical":[13.5,-4],"wantsPlay":[-16.5,-4.5],"sleeping":[12.5,-7.5]}},
    "stagbeetle/05": {"face":[92,81],"sweat":{"leftInner":12.75,"rightInner":91.25,"centerY":65.8125},"marks":{"happy":[13.5,20],"strained":[24.5,7],"hungry":[10.5,15],"sick":[6,15.5],"tired":[22,18],"sulky":[20.5,10.5],"weak":[22,23.5],"critical":[29,23],"wantsPlay":[-7,22.5],"sleeping":[12.5,13.5]}},
    "stagbeetle/06": {"face":[87,90],"sweat":{"leftInner":9.6875,"rightInner":94.1875,"centerY":73.125},"marks":{"happy":[10.5,33],"strained":[24.5,22],"hungry":[6,28],"sick":[0,28.5],"tired":[6.5,29.5],"sulky":[12.5,23.5],"weak":[11.5,34],"critical":[11.5,31.5],"wantsPlay":[-11,40],"sleeping":[8.5,27]}},
    "stagbeetle/07": {"face":[89,81],"sweat":{"leftInner":12.3125,"rightInner":94.3125,"centerY":61.3125},"marks":{"happy":[10.5,27],"strained":[27.5,16.5],"hungry":[18.5,22.5],"sick":[2.5,18],"tired":[16,25.5],"sulky":[21.5,16.5],"weak":[16.5,30],"critical":[20,25],"wantsPlay":[-9.5,32.5],"sleeping":[20.5,23.5]}},
    "stagbeetle/08": {"face":[94,99],"sweat":{"leftInner":9.875,"rightInner":94.375,"centerY":80.4375},"marks":{"happy":[15.5,34],"strained":[25.5,21.5],"hungry":[12.5,29.5],"sick":[7.5,30.5],"tired":[17.5,29.5],"sulky":[21.5,25.5],"weak":[17.5,36.5],"critical":[22,31.5],"wantsPlay":[-5.5,38],"sleeping":[14,28.5]}},
    "cicada/01": {"face":[78,86],"sweat":{"leftInner":26.875,"rightInner":77.375,"centerY":69.875},"marks":{"happy":[-1,23.5],"strained":[17,33.5],"hungry":[13.5,23],"sick":[-5,19],"tired":[11,26.5],"sulky":[9.5,14],"weak":[10.5,27.5],"critical":[15,24.5],"wantsPlay":[-18.5,32.5],"sleeping":[15.5,24.5]}},
    "cicada/02": {"face":[83,63],"sweat":{"leftInner":51.4375,"rightInner":83.9375,"centerY":33.6875},"marks":{"happy":[9,6],"strained":[22,16],"hungry":[17,-0.5],"sick":[3,-11.5],"tired":[17,6],"sulky":[13.5,-5],"weak":[15,8.5],"critical":[22,8],"wantsPlay":[-14.5,15.5],"sleeping":[11,-2.5]}},
    "cicada/03": {"face":[88,49],"sweat":{"leftInner":58,"rightInner":84.5,"centerY":12.8125},"marks":{"happy":[14.5,-3],"strained":[25,-1],"hungry":[16.5,-2.5],"sick":[10.5,-32.5],"tired":[15,0],"sulky":[28,-11],"weak":[19.5,-3],"critical":[26.5,-3.5],"wantsPlay":[-10,0],"sleeping":[23,-5]}},
    "cicada/04": {"face":[84,43],"sweat":{"leftInner":55.25,"rightInner":86.25,"centerY":8.9375},"marks":{"happy":[15.5,-11.5],"strained":[20,-3.5],"hungry":[22.5,-15.5],"sick":[7,-36.5],"tired":[20,-12],"sulky":[22,-25],"weak":[19.5,-11.5],"critical":[24,-14.5],"wantsPlay":[-13.5,-5.5],"sleeping":[24.5,-14]}},
    "cicada/05": {"face":[66,27],"sweat":{"leftInner":38.125,"rightInner":69.125,"centerY":13.4375},"marks":{"happy":[-10.5,-20.5],"strained":[10.5,-14.5],"hungry":[-13,-25],"sick":[-14,-32],"tired":[-4.5,-24.5],"sulky":[-3,-30],"weak":[-4.5,-18.5],"critical":[0,-22.5],"wantsPlay":[-28,-10.5],"sleeping":[-6,-27.5]}},
    "cicada/06": {"face":[63,37],"sweat":{"leftInner":34.6875,"rightInner":68.1875,"centerY":25.5625},"marks":{"happy":[-10.5,-11.5],"strained":[10,-7.5],"hungry":[-16,-15.5],"sick":[-18,-19.5],"tired":[-15.5,-14.5],"sulky":[-6.5,-21],"weak":[-7.5,-10],"critical":[-6.5,-14],"wantsPlay":[-30.5,0],"sleeping":[-14.5,-16.5]}},
    "cicada/07": {"face":[64,34],"sweat":{"leftInner":22,"rightInner":83,"centerY":27.625},"marks":{"happy":[-2,-18],"strained":[9.5,-12],"hungry":[-4.5,-23],"sick":[-17,-22.5],"tired":[-8.5,-21],"sulky":[-2.5,-27.5],"weak":[-2.5,-17.5],"critical":[-2.5,-20.5],"wantsPlay":[-29.5,-8],"sleeping":[-5.5,-24.5]}},
    "cicada/08": {"face":[59,36],"sweat":{"leftInner":26.9375,"rightInner":75.9375,"centerY":27.25},"marks":{"happy":[-8.5,-18],"strained":[0,-9],"hungry":[-16.5,-21],"sick":[-20.5,-22.5],"tired":[-15.5,-21],"sulky":[-5.5,-27.5],"weak":[-9.5,-17],"critical":[-10,-19.5],"wantsPlay":[-34,-6],"sleeping":[-14.5,-23]}},
    "antlion/01": {"face":[49,86],"sweat":{"leftInner":14.8125,"rightInner":89.8125,"centerY":69.875},"marks":{"happy":[-3.5,9.5],"strained":[-5,31.5],"hungry":[-15.5,3.5],"sick":[-28.5,6.5],"tired":[-15,5.5],"sulky":[-10,0],"weak":[-3.5,11.5],"critical":[-3.5,6],"wantsPlay":[-42,25.5],"sleeping":[-14.5,4]}},
    "antlion/02": {"face":[64,99],"sweat":{"leftInner":8.5,"rightInner":96,"centerY":80.4375},"marks":{"happy":[19,10],"strained":[-26,21],"hungry":[29.5,10.5],"sick":[-4,-5.5],"tired":[27,14],"sulky":[35,7.5],"weak":[28.5,17.5],"critical":[33.5,14.5],"wantsPlay":[-29.5,7.5],"sleeping":[32,11.5]}},
    "antlion/03": {"face":[49,87],"sweat":{"leftInner":8.3125,"rightInner":96.3125,"centerY":70.6875},"marks":{"happy":[9.5,-2.5],"strained":[-20,14.5],"hungry":[-7.5,-9.5],"sick":[-24.5,-8.5],"tired":[-7,-8],"sulky":[-2,-13.5],"weak":[3,-5],"critical":[5,-6],"wantsPlay":[-42,7.5],"sleeping":[-6,-9.5]}},
    "antlion/04": {"face":[61,50],"sweat":{"leftInner":20.5625,"rightInner":83.5625,"centerY":40.625},"marks":{"happy":[-0.5,-12.5],"strained":[1.5,-2],"hungry":[7,-18.5],"sick":[-13,-26],"tired":[5.5,-16],"sulky":[12,-22],"weak":[5.5,-10.5],"critical":[10.5,-13.5],"wantsPlay":[-32,-9.5],"sleeping":[9,-18]}},
    "antlion/05": {"face":[64,40],"sweat":{"leftInner":23,"rightInner":81,"centerY":32},"marks":{"happy":[-4,-15],"strained":[3.5,-6],"hungry":[6,-17.5],"sick":[-10.5,-25],"tired":[4,-14.5],"sulky":[8,-23.5],"weak":[4,-9.5],"critical":[6.5,-15.5],"wantsPlay":[-29.5,-11],"sleeping":[8.5,-16.5]}},
    "antlion/06": {"face":[30,61],"sweat":{"leftInner":8.375,"rightInner":39.875,"centerY":35.0625},"marks":{"happy":[-33,7],"strained":[-23,12],"hungry":[-26,3],"sick":[-41,-10],"tired":[-28.5,6.5],"sulky":[-22,-4],"weak":[-28.5,7.5],"critical":[-21.5,7],"wantsPlay":[-57.5,11.5],"sleeping":[-24.5,5]}},
    "antlion/07": {"face":[78,60],"sweat":{"leftInner":8.375,"rightInner":96.375,"centerY":48.75},"marks":{"happy":[5,5.5],"strained":[21,16],"hungry":[13.5,8],"sick":[-3.5,5],"tired":[11.5,11.5],"sulky":[18.5,5],"weak":[10,14],"critical":[17,13],"wantsPlay":[-18.5,19.5],"sleeping":[16,8.5]}},
    "antlion/08": {"face":[99,61],"sweat":{"leftInner":16.4375,"rightInner":87.4375,"centerY":49.5625},"marks":{"happy":[25.5,4.5],"strained":[32,4.5],"hungry":[32,5],"sick":[14.5,-5],"tired":[24,13],"sulky":[40,-0.5],"weak":[31,7],"critical":[38.5,7],"wantsPlay":[-1.5,8],"sleeping":[34.5,6]}},
    "dandelion/01": {"face":[32,96],"sweat":{"leftInner":10.5,"rightInner":82,"centerY":78},"marks":{"happy":[11,-10.5],"strained":[-18,44],"hungry":[3,-26],"sick":[-32,-23.5],"tired":[22.5,-6.5],"sulky":[7,-27.5],"weak":[2.5,-16.5],"critical":[15.5,-17.5],"wantsPlay":[-55.5,1],"sleeping":[4,-25]}},
    "dandelion/02": {"face":[64,94],"sweat":{"leftInner":27.5,"rightInner":77,"centerY":76.375},"marks":{"happy":[32.5,2.5],"strained":[5.5,36],"hungry":[23,12],"sick":[-6.5,-23.5],"tired":[20.5,15.5],"sulky":[39.5,-0.5],"weak":[2.5,35.5],"critical":[38,7],"wantsPlay":[-29.5,3.5],"sleeping":[13.5,23]}},
    "dandelion/03": {"face":[64,106],"sweat":{"leftInner":8.5,"rightInner":96,"centerY":86.125},"marks":{"happy":[19.5,22.5],"strained":[-17.5,33.5],"hungry":[16.5,27],"sick":[-9.5,-1.5],"tired":[15,29.5],"sulky":[28,19],"weak":[18.5,31.5],"critical":[26.5,26.5],"wantsPlay":[-29.5,19.5],"sleeping":[19.5,28]}},
    "dandelion/04": {"face":[64,95],"sweat":{"leftInner":8.5,"rightInner":96,"centerY":77.1875},"marks":{"happy":[2.5,17],"strained":[0,24],"hungry":[14.5,20],"sick":[-11.5,12.5],"tired":[12,23.5],"sulky":[2,7.5],"weak":[3.5,18.5],"critical":[2.5,14],"wantsPlay":[-29.5,26.5],"sleeping":[17,21]}},
    "dandelion/05": {"face":[63,55],"sweat":{"leftInner":33.1875,"rightInner":72.1875,"centerY":44.6875},"marks":{"happy":[-7,-0.5],"strained":[7,7],"hungry":[2,-3],"sick":[-9,-8.5],"tired":[-0.5,0.5],"sulky":[7,-6],"weak":[-1.5,2.5],"critical":[3,-1],"wantsPlay":[-30.5,2.5],"sleeping":[4.5,-1.5]}},
    "dandelion/06": {"face":[63,69],"sweat":{"leftInner":8.1875,"rightInner":88.6875,"centerY":55.5625},"marks":{"happy":[2,1.5],"strained":[-1,9],"hungry":[2.5,-4],"sick":[-5,-4.5],"tired":[2.5,-1.5],"sulky":[7.5,-6.5],"weak":[2,5],"critical":[7,0.5],"wantsPlay":[-30.5,9],"sleeping":[4.5,-3.5]}},
    "dandelion/07": {"face":[68,63],"sweat":{"leftInner":20.75,"rightInner":87.25,"centerY":50.6875},"marks":{"happy":[4.5,-1.5],"strained":[-2.5,3.5],"hungry":[12,-7.5],"sick":[0,-10.5],"tired":[13,-0.5],"sulky":[16.5,-10],"weak":[13,4],"critical":[15,-2],"wantsPlay":[-26.5,0.5],"sleeping":[17.5,-3]}},
    "dandelion/08": {"face":[52,65],"sweat":{"leftInner":8.75,"rightInner":96.25,"centerY":52.8125},"marks":{"happy":[0,-0.5],"strained":[-19,3],"hungry":[-9.5,-11.5],"sick":[-24.5,-8],"tired":[-3.5,-9],"sulky":[-4.5,-14],"weak":[-3,-2.5],"critical":[6.5,-4.5],"wantsPlay":[-39.5,8],"sleeping":[-8,-11.5]}},
    "sakura/01": {"face":[51,85],"sweat":{"leftInner":14.9375,"rightInner":80.9375,"centerY":69.0625},"marks":{"happy":[21,-4.5],"strained":[-13,24.5],"hungry":[25,-6],"sick":[-18.5,-25],"tired":[22.5,-2.5],"sulky":[33,-11.5],"weak":[26.5,-1],"critical":[31.5,-4],"wantsPlay":[-40.5,7],"sleeping":[27,-4.5]}},
    "sakura/02": {"face":[65,85],"sweat":{"leftInner":21.8125,"rightInner":79.8125,"centerY":65.0625},"marks":{"happy":[30.5,-2.5],"strained":[-11,-1],"hungry":[23,5.5],"sick":[-7,-26],"tired":[20.5,9],"sulky":[38.5,-6.5],"weak":[31.5,4.5],"critical":[38,0.5],"wantsPlay":[-29,-5],"sleeping":[29.5,3]}},
    "sakura/03": {"face":[64,95],"sweat":{"leftInner":8.5,"rightInner":96,"centerY":77.1875},"marks":{"happy":[14.5,11],"strained":[-17.5,25],"hungry":[19,8.5],"sick":[-10.5,-7],"tired":[21,15.5],"sulky":[28,9.5],"weak":[21,20.5],"critical":[26.5,17.5],"wantsPlay":[-29.5,4],"sleeping":[21,9]}},
    "sakura/04": {"face":[64,87],"sweat":{"leftInner":8.5,"rightInner":96,"centerY":70.6875},"marks":{"happy":[14.5,4.5],"strained":[-17,11.5],"hungry":[21.5,-0.5],"sick":[-9.5,-17],"tired":[19,3],"sulky":[30,1.5],"weak":[23.5,12],"critical":[28,9.5],"wantsPlay":[-29.5,-2.5],"sleeping":[23.5,0]}},
    "sakura/05": {"face":[65,69],"sweat":{"leftInner":18.8125,"rightInner":91.8125,"centerY":48.0625},"marks":{"happy":[10.5,-5],"strained":[6.5,4.5],"hungry":[-7,-2.5],"sick":[-17,-2.5],"tired":[-4.5,-4.5],"sulky":[2.5,-13.5],"weak":[10,-2.5],"critical":[8.5,-6.5],"wantsPlay":[-29,17],"sleeping":[-4,-5.5]}},
    "sakura/06": {"face":[46,76],"sweat":{"leftInner":8.375,"rightInner":96.375,"centerY":61.75},"marks":{"happy":[-13,3],"strained":[-11.5,23],"hungry":[-23.5,5],"sick":[-28.5,3.5],"tired":[-21.5,4],"sulky":[-11.5,-1.5],"weak":[-16,9.5],"critical":[-17,6.5],"wantsPlay":[-44.5,21.5],"sleeping":[-21,2.5]}},
    "sakura/07": {"face":[58,94],"sweat":{"leftInner":9.625,"rightInner":90.125,"centerY":76.375},"marks":{"happy":[23.5,9.5],"strained":[-32.5,19.5],"hungry":[21,13.5],"sick":[-12,-17.5],"tired":[19.5,16],"sulky":[30,7.5],"weak":[21.5,19.5],"critical":[28,15.5],"wantsPlay":[-34.5,5],"sleeping":[23.5,14.5]}},
    "sakura/08": {"face":[62,89],"sweat":{"leftInner":8.375,"rightInner":96.375,"centerY":72.3125},"marks":{"happy":[17.5,1.5],"strained":[-9,8.5],"hungry":[14,-2],"sick":[-8,-6],"tired":[12.5,1],"sulky":[19.5,-5.5],"weak":[3.5,1.5],"critical":[19,2],"wantsPlay":[-31.5,6],"sleeping":[16.5,-2.5]}},
    "venus_flytrap/01": {"face":[57,73],"sweat":{"leftInner":9.8125,"rightInner":94.3125,"centerY":59.3125},"marks":{"happy":[16,-14],"strained":[-12.5,10.5],"hungry":[27,-13],"sick":[-3,-26],"tired":[25,-10.5],"sulky":[8,-31],"weak":[25,-5.5],"critical":[26,-14],"wantsPlay":[-35.5,-8],"sleeping":[29.5,-12]}},
    "venus_flytrap/02": {"face":[64,94],"sweat":{"leftInner":15.5,"rightInner":90,"centerY":76.375},"marks":{"happy":[14,11],"strained":[1,16.5],"hungry":[-4,10.5],"sick":[-15.5,10.5],"tired":[-1,8.5],"sulky":[4.5,2.5],"weak":[13,13],"critical":[11,8.5],"wantsPlay":[-29.5,28.5],"sleeping":[0,6.5]}},
    "venus_flytrap/03": {"face":[61,104],"sweat":{"leftInner":8.0625,"rightInner":96.0625,"centerY":84.5},"marks":{"happy":[10,20.5],"strained":[-8.5,30],"hungry":[-3.5,14],"sick":[-11.5,13],"tired":[-2.5,15],"sulky":[2,10.5],"weak":[10,21.5],"critical":[9,16.5],"wantsPlay":[-32,23],"sleeping":[-1.5,13.5]}},
    "venus_flytrap/04": {"face":[43,50],"sweat":{"leftInner":8.4375,"rightInner":55.4375,"centerY":31.125},"marks":{"happy":[-26,-1.5],"strained":[-9.5,2.5],"hungry":[-19,-7.5],"sick":[-32.5,-13.5],"tired":[-20.5,-4.5],"sulky":[-12,-8],"weak":[-20,0.5],"critical":[-15.5,-2.5],"wantsPlay":[-47,5],"sleeping":[-16.5,-7]}},
    "venus_flytrap/05": {"face":[65,42],"sweat":{"leftInner":25.8125,"rightInner":78.3125,"centerY":28.625},"marks":{"happy":[-6,-10.5],"strained":[6,-7],"hungry":[1.5,-17],"sick":[-8.5,-17],"tired":[0,-13.5],"sulky":[6,-19.5],"weak":[0,-8],"critical":[5,-11.5],"wantsPlay":[-29,-5],"sleeping":[4,-16]}},
    "venus_flytrap/06": {"face":[65,87],"sweat":{"leftInner":8.3125,"rightInner":96.3125,"centerY":70.6875},"marks":{"happy":[6,14],"strained":[-3.5,18.5],"hungry":[7.5,6.5],"sick":[-10.5,5.5],"tired":[6.5,10],"sulky":[12.5,4],"weak":[6.5,16],"critical":[11.5,12],"wantsPlay":[-29,18],"sleeping":[10,6.5]}},
    "venus_flytrap/07": {"face":[65,43],"sweat":{"leftInner":34.8125,"rightInner":70.8125,"centerY":19.9375},"marks":{"happy":[-10,-6],"strained":[10,-1],"hungry":[0,-9.5],"sick":[-17.5,-21.5],"tired":[-2,-6.5],"sulky":[2.5,-14.5],"weak":[-2,-1.5],"critical":[3,-4.5],"wantsPlay":[-29,1.5],"sleeping":[2.5,-8.5]}},
    "venus_flytrap/08": {"face":[61,39],"sweat":{"leftInner":33.0625,"rightInner":68.0625,"centerY":6.1875},"marks":{"happy":[-11,-15.5],"strained":[2.5,-5.5],"hungry":[-6.5,-19.5],"sick":[-16.5,-39],"tired":[-7.5,-16],"sulky":[1,-19.5],"weak":[-4.5,-9],"critical":[-3,-14],"wantsPlay":[-32,-6.5],"sleeping":[-4.5,-19]}},
    "mushroom/01": {"face":[62,64],"sweat":{"leftInner":8.375,"rightInner":96.375,"centerY":52},"marks":{"happy":[15.5,-3.5],"strained":[-2.5,3],"hungry":[-5,-8.5],"sick":[0.5,-14],"tired":[-4,-8],"sulky":[4.5,-19],"weak":[7.5,-9],"critical":[5,-13],"wantsPlay":[-31.5,2],"sleeping":[-3.5,-8.5]}},
    "mushroom/02": {"face":[64,84],"sweat":{"leftInner":8.5,"rightInner":96,"centerY":68.25},"marks":{"happy":[13.5,10],"strained":[-16.5,17],"hungry":[13,5],"sick":[-7.5,-8],"tired":[14,5.5],"sulky":[21.5,-1],"weak":[15,10],"critical":[21,5.5],"wantsPlay":[-29.5,1],"sleeping":[17,4]}},
    "mushroom/03": {"face":[61,57],"sweat":{"leftInner":18.5625,"rightInner":86.0625,"centerY":46.3125},"marks":{"happy":[0,-2.5],"strained":[-1,1],"hungry":[1.5,-14],"sick":[-11,-14.5],"tired":[3.5,-8],"sulky":[5.5,-16],"weak":[3.5,-2.5],"critical":[8,-5.5],"wantsPlay":[-32,-1.5],"sleeping":[7.5,-10.5]}},
    "mushroom/04": {"face":[64,55],"sweat":{"leftInner":23.5,"rightInner":79.5,"centerY":44.6875},"marks":{"happy":[1,-3],"strained":[-2.5,0.5],"hungry":[7,-6.5],"sick":[-4.5,-15],"tired":[5,-3.5],"sulky":[12.5,-10],"weak":[5.5,1],"critical":[11,-2],"wantsPlay":[-29.5,-9.5],"sleeping":[9.5,-5.5]}},
    "mushroom/05": {"face":[64,90],"sweat":{"leftInner":8.5,"rightInner":96,"centerY":73.125},"marks":{"happy":[15.5,6],"strained":[-19.5,12],"hungry":[26.5,6],"sick":[-3,-15],"tired":[24,9],"sulky":[31,3],"weak":[24.5,13.5],"critical":[30,10.5],"wantsPlay":[-29.5,-4.5],"sleeping":[29,7]}},
    "mushroom/06": {"face":[64,88],"sweat":{"leftInner":19.5,"rightInner":84.5,"centerY":71.5},"marks":{"happy":[17.5,2.5],"strained":[-5.5,10.5],"hungry":[8,-2.5],"sick":[-12,-7],"tired":[7,1],"sulky":[12.5,-5],"weak":[3.5,4.5],"critical":[13.5,0],"wantsPlay":[-29.5,6.5],"sleeping":[9,-2]}},
    "mushroom/07": {"face":[55,80],"sweat":{"leftInner":8.1875,"rightInner":89.6875,"centerY":65},"marks":{"happy":[16.5,-10],"strained":[-15.5,15],"hungry":[-5,-1],"sick":[-18,-1.5],"tired":[-10.5,0.5],"sulky":[2.5,-18.5],"weak":[1,-11],"critical":[4.5,-14.5],"wantsPlay":[-37,10],"sleeping":[-8,-3.5]}},
    "mushroom/08": {"face":[78,85],"sweat":{"leftInner":8.375,"rightInner":96.375,"centerY":69.0625},"marks":{"happy":[13,20.5],"strained":[-2.5,5.5],"hungry":[14.5,16],"sick":[7.5,8],"tired":[12,20],"sulky":[22.5,16],"weak":[16,26],"critical":[22,22.5],"wantsPlay":[-18.5,8],"sleeping":[16.5,17]}}
  };
  // END GENERATED FACE PLACEMENT
  const HUMAN_LINES = ['man','woman'];
  const STAGE_ASSETS = Object.freeze({
    ...Object.fromEntries([...HUMAN_LINES,'penguin','turtle','frog','clownfish','salmon','hermit_crab','jellyfish','starfish','coral','butterfly','beetle','stagbeetle','cicada','antlion','dandelion','sakura','venus_flytrap','mushroom'].flatMap(line => Array.from({length:8},(_,index) => {
      const stage=String(index+1).padStart(2,'0');
      return [`assets/characters/${line}/${stage}.png`,Object.freeze(Object.fromEntries(
        Object.keys(VARIANT_ASSETS).map(name => [name,`assets/characters/expressions/${line}/${stage}-${name}.png`])
      ))];
    }))),
    'assets/characters/dog/01.png': Object.freeze(Object.fromEntries(
      Object.keys(VARIANT_ASSETS).map(name => [name,`assets/characters/expressions/dog/01-${name}.png`])
    )),
    'assets/characters/dog/02.png': Object.freeze(Object.fromEntries(
      Object.keys(VARIANT_ASSETS).map(name => [name,`assets/characters/expressions/dog/02-${name}.png`])
    )),
    'assets/characters/dog/08.png': Object.freeze(Object.fromEntries(
      Object.keys(VARIANT_ASSETS).map(name => [name,`assets/characters/expressions/dog/08-${name}.png`])
    )),
    'assets/characters/dog/04.png': Object.freeze(Object.fromEntries(
      Object.keys(VARIANT_ASSETS).map(name => [name,`assets/characters/expressions/dog/04-${name}.png`])
    )),
    'assets/characters/dog/05.png': Object.freeze(Object.fromEntries(
      Object.keys(VARIANT_ASSETS).map(name => [name,`assets/characters/expressions/dog/05-${name}.png`])
    )),
    'assets/characters/dog/07.png': Object.freeze(Object.fromEntries(
      Object.keys(VARIANT_ASSETS).map(name => [name,`assets/characters/expressions/dog/07-${name}.png`])
    )),
    'assets/characters/dog/03.png': Object.freeze(Object.fromEntries(
      Object.keys(VARIANT_ASSETS).map(name => [name,`assets/characters/expressions/dog/03-${name}.png`])
    )),
    'assets/characters/dog/06.png': Object.freeze(Object.fromEntries(
      Object.keys(VARIANT_ASSETS).map(name => [name,`assets/characters/expressions/dog/06-${name}.png`])
    )),
    [BASE_ASSET]: VARIANT_ASSETS,
    'assets/characters/cat/03.png': Object.freeze(Object.fromEntries(
      Object.keys(VARIANT_ASSETS).map(name => [name,`assets/characters/expressions/cat/03-${name}.png`])
    )),
    'assets/characters/cat/04.png': Object.freeze(Object.fromEntries(
      Object.keys(VARIANT_ASSETS).map(name => [name,`assets/characters/expressions/cat/04-${name}.png`])
    )),
    'assets/characters/cat/05.png': Object.freeze(Object.fromEntries(
      Object.keys(VARIANT_ASSETS).map(name => [name,`assets/characters/expressions/cat/05-${name}.png`])
    )),
    'assets/characters/cat/07.png': Object.freeze(Object.fromEntries(
      Object.keys(VARIANT_ASSETS).map(name => [name,`assets/characters/expressions/cat/07-${name}.png`])
    )),
    'assets/characters/cat/08.png': Object.freeze(Object.fromEntries(
      Object.keys(VARIANT_ASSETS).map(name => [name,`assets/characters/expressions/cat/08-${name}.png`])
    )),
    'assets/characters/cat/02.png': Object.freeze(Object.fromEntries(
      Object.keys(VARIANT_ASSETS).map(name => [name,`assets/characters/expressions/cat/02-${name}.png`])
    )),
    'assets/characters/cat/01.png': Object.freeze(Object.fromEntries(
      Object.keys(VARIANT_ASSETS).map(name => [name,`assets/characters/expressions/cat/01-${name}.png`])
    )),
  });
  const PERSISTENT = Object.freeze({
    hungry:'hungry', sick:'sick', tired:'tired', weak:'weak', unhappy:'sulky', wantsPlay:'wantsPlay', normal:'normal',
  });
  const ACCENTS = Object.freeze({
    happy: '<svg viewBox="0 0 104 104" focusable="false"><path class="accent-warm" d="M76 17l2.2 5.2 5.3 2.2-5.3 2.2-2.2 5.2-2.2-5.2-5.3-2.2 5.3-2.2zM88 34l1.4 3.2 3.2 1.4-3.2 1.4-1.4 3.2-1.4-3.2-3.2-1.4 3.2-1.4z"/></svg>',
    strained: '<svg viewBox="0 0 104 104" focusable="false"><path class="accent-warm-line accent-outline" d="M17 24l7-5 4 7 7-5"/><path class="accent-warm-line" d="M17 24l7-5 4 7 7-5"/></svg>',
    sulky: '<svg viewBox="0 0 104 104" focusable="false"><path class="accent-cloud" d="M67 24c1-6 10-7 13-2 5-4 13 1 10 7 6 2 5 11-2 12H68c-9 0-10-13-1-17z"/><path class="accent-cloud-line" d="M70 29c4-4 7 5 11 0s7 4 4 7"/></svg>',
    hungry: '<svg viewBox="0 0 104 104" focusable="false"><circle class="accent-thought" cx="71" cy="37" r="2.5"/><circle class="accent-thought" cx="77" cy="29" r="4"/><path class="accent-food" d="M82 17c6-5 12-2 14 2-2 4-8 7-14 2l-4 3v-10z"/><circle class="accent-food-eye" cx="91" cy="18.5" r="1"/></svg>',
    sick: '<svg viewBox="0 0 104 104" focusable="false"><path class="accent-cool" d="M69 15h23v5H69zM72 23h17v3H72z"/><path class="accent-cool-line accent-outline" d="M72 31h17M75 35h11"/><path class="accent-cool-line" d="M72 31h17M75 35h11"/></svg>',
    tired: '<svg viewBox="0 0 104 104" focusable="false"><circle class="accent-sleepy" cx="84" cy="23" r="7"/><circle class="accent-sleepy" cx="74" cy="34" r="3"/></svg>',
    weak: '<svg viewBox="0 0 104 104" focusable="false"><path class="accent-weak accent-outline" d="M72 16v13m0 0-4-5m4 5 4-5M83 18v15m0 0-4-5m4 5 4-5"/><path class="accent-weak" d="M72 16v13m0 0-4-5m4 5 4-5M83 18v15m0 0-4-5m4 5 4-5"/></svg>',
    critical: '<svg viewBox="0 0 104 104" focusable="false"><path class="accent-critical accent-outline" d="M69 13v20m0 0-6-7m6 7 6-7M84 13v22m0 0-6-7m6 7 6-7"/><path class="accent-critical" d="M69 13v20m0 0-6-7m6 7 6-7M84 13v22m0 0-6-7m6 7 6-7"/></svg>',
    wantsPlay: '<svg viewBox="0 0 104 104" focusable="false"><path class="accent-call accent-outline" d="M72 18l-6-7M82 16V7M91 20l7-6"/><path class="accent-call" d="M72 18l-6-7M82 16V7M91 20l7-6"/></svg>',
    sleeping: '<svg viewBox="0 0 104 104" focusable="false"><path class="accent-sleep-z accent-outline" d="M68 31h6l-6 6h6"/><path class="accent-sleep-z" d="M68 31h6l-6 6h6"/><path class="accent-sleep-z accent-outline" d="M78 21h8l-8 8h8"/><path class="accent-sleep-z" d="M78 21h8l-8 8h8"/><path class="accent-sleep-z accent-outline" d="M88 8h11L88 19h11"/><path class="accent-sleep-z" d="M88 8h11L88 19h11"/></svg>',
  });
  const REACTIONS = Object.freeze({
    play_with: 'happy',
    play_with_annoyed: 'sulky',
    overfeed: 'strained',
    medicine_wrong: 'strained',
    feed: 'normal',
    medicine_cure: 'normal',
    sleep: 'normal',
    wake: 'normal',
  });

  function resolve(emotion, options = {}) {
    const profile = emotion && typeof emotion === 'object' ? emotion : {};
    const settings = options && typeof options === 'object' ? options : {};
    if (settings.blocked === true) return 'normal';
    if (settings.sleeping === true) return 'sleeping';
    if (profile.state === 'weak' && profile.severity === 'critical') return 'critical';
    if (settings.reaction != null) {
      return EXPRESSIONS.includes(settings.reaction) ? settings.reaction : 'normal';
    }
    return Object.hasOwn(PERSISTENT,profile.state) ? PERSISTENT[profile.state] : 'normal';
  }

  function assetFor(baseAsset, expression) {
    if (!Object.hasOwn(STAGE_ASSETS,baseAsset)) return baseAsset;
    const variants=STAGE_ASSETS[baseAsset];
    return Object.hasOwn(variants,expression) ? variants[expression] : baseAsset;
  }

  function accentFor(baseAsset, expression) {
    if (!Object.hasOwn(STAGE_ASSETS,baseAsset) || !Object.hasOwn(ACCENTS,expression)) return '';
    const human = /^assets\/characters\/(man|woman)\/(0[1-8])\.png$/.exec(baseAsset);
    const placement = MARK_PLACEMENT[baseAsset.slice(18,-4)];
    const offset = (placement?.marks[expression] || [0,0]).join(' ');
    // Each species thinks of recognizable food; keep the shared yellow palette and thought bubbles.
    const artwork = /^assets\/characters\/(?:frog|venus_flytrap)\/0[1-8]\.png$/.test(baseAsset) && expression === 'hungry'
      ? '<svg viewBox="0 0 104 104" focusable="false"><circle class="accent-thought" cx="71" cy="37" r="2.5"/><circle class="accent-thought" cx="77" cy="29" r="4"/><ellipse class="accent-food" cx="88" cy="19" rx="5" ry="3"/><path class="accent-food" d="M83 17l-5-4m5 8-5 4m15-8 5-4m-5 8 5 4"/><circle class="accent-food-eye" cx="86" cy="18" r="1"/></svg>'
      : /^assets\/characters\/clownfish\/0[1-8]\.png$/.test(baseAsset) && expression === 'hungry'
        ? '<svg viewBox="0 0 104 104" focusable="false"><circle class="accent-thought" cx="71" cy="37" r="2.5"/><circle class="accent-thought" cx="77" cy="29" r="4"/><circle class="accent-food" cx="84" cy="18" r="3"/><circle class="accent-food" cx="92" cy="15" r="2.5"/><circle class="accent-food" cx="94" cy="23" r="2"/></svg>'
      : ['assets/characters/turtle/01.png','assets/characters/turtle/02.png','assets/characters/turtle/03.png','assets/characters/turtle/04.png','assets/characters/turtle/05.png','assets/characters/turtle/06.png','assets/characters/turtle/07.png','assets/characters/turtle/08.png','assets/characters/dog/01.png','assets/characters/dog/02.png','assets/characters/dog/03.png','assets/characters/dog/04.png','assets/characters/dog/05.png','assets/characters/dog/06.png','assets/characters/dog/07.png','assets/characters/dog/08.png'].includes(baseAsset) && expression === 'hungry'
      ? '<svg viewBox="0 0 104 104" focusable="false"><circle class="accent-thought" cx="71" cy="37" r="2.5"/><circle class="accent-thought" cx="77" cy="29" r="4"/><path class="accent-food" d="M79 18h18l-3 7H82z"/><circle class="accent-food" cx="84" cy="16" r="2"/><circle class="accent-food" cx="91" cy="16" r="2"/></svg>'
      : human && expression === 'hungry'
        ? '<svg viewBox="0 0 104 104" focusable="false"><circle class="accent-thought" cx="71" cy="37" r="2.5"/><circle class="accent-thought" cx="77" cy="29" r="4"/><path class="accent-thought accent-rice" d="M80 19c0-4 4-7 8-7s8 3 8 7z"/><path class="accent-food" d="M79 19h18l-3 8H82z"/></svg>'
        : ACCENTS[expression];
    const accent = artwork.replace(/(<svg[^>]*>)/, `$1<g transform="translate(${offset})">`).replace('</svg>', '</g></svg>');
    return `<span class="pet-expression-accent pet-expression-accent--${expression}" aria-hidden="true">${accent}</span>`;
  }

  function sweatFor(baseAsset, width, height, artOffsetY=0) {
    const placement=MARK_PLACEMENT[typeof baseAsset==='string' ? baseAsset.slice(18,-4) : ''];
    if(!placement || !Object.hasOwn(STAGE_ASSETS,baseAsset)) return null;
    const dropWidth=Math.max(6,Math.min(11,width*.1));
    const dropHeight=Math.max(9,Math.min(16,height*.15));
    const travel=Math.min(7,height*.07);
    const spread=(dropWidth*Math.cos(Math.PI/10)+dropHeight*Math.sin(Math.PI/10)-dropWidth)/2+2;
    return {
      left:width*placement.sweat.leftInner/104-dropWidth-spread,
      right:width-width*placement.sweat.rightInner/104-dropWidth-spread,
      top:height*placement.sweat.centerY/104+artOffsetY-dropHeight/2-travel/2,
      travel,
    };
  }

  function reactionFor(event) {
    return Object.hasOwn(REACTIONS,event) ? REACTIONS[event] : null;
  }

  return Object.freeze({ resolve, assetFor, accentFor, sweatFor, reactionFor });
});
