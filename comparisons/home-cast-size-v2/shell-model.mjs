export const regions = [
  ['river_lake','みずべ'], ['forest','もり'], ['city','とかい'], ['home','おうち'],
  ['countryside','いなか'], ['mountain','やま'], ['snow','ゆきぐに'], ['sea','うみ'],
  ['jungle','ジャングル'], ['desert','さばく'], ['deepsea','しんかい'],
  ['star_stop','ほしぞらのていりゅうじょ'], ['memory_lake','きおくのみずうみ'],
];
export const times = [['morning','朝'], ['day','昼'], ['evening','夕'], ['night','夜']];
export const counts = [1,4,10,20,28];
export const roles = [['pet','主人公'],['partner','恋人'],['companion','仲間']];
export const modes = {current:[100,100,100],adopted:[120,120,105],final:[120,120,105]};

export function isArchivedLink(query) {
  if (query.has('mode')) return false;
  if (['castPreset','preset','hero','partner','companions'].some(key=>query.has(key))) return true;
  // Three original #570 report links described a frozen reference scene without
  // a preset key. Keep only these signed-off URL shapes pointed at that archive.
  return [...query.keys()].length===3 && ['forest','city','home'].includes(query.get('region'))
    && query.get('count')==='28' && query.get('paused')==='1';
}
export function readScene(query) {
  const allowed = (values,key,fallback)=>values.some(([id])=>id===query.get(key))?query.get(key):fallback;
  return {
    mode:Object.hasOwn(modes,query.get('mode'))?query.get('mode'):'final',
    region:allowed(regions,'region','river_lake'),time:allowed(times,'time','day'),
    count:counts.includes(Number(query.get('count')))?Number(query.get('count')):28,
    paused:['1','true'].includes(query.get('paused')),
  };
}
export function trialSettings(scene) {
  const [hero,partner,companions] = modes[scene.mode];
  return {preset:scene.mode==='current'?'current':'custom',hero,partner,companions,time:scene.time,paused:scene.paused};
}
export function gameURL(scene, base) {
  const url = new URL(scene.mode==='final'?'./game/final.html':'./game/index.html',base);
  const s=trialSettings(scene);
  const values={region:scene.region,time:s.time,count:scene.count,variant:'B',compareSplit:0,paused:scene.paused?1:0,
    castPreset:s.preset,hero:s.hero,partner:s.partner,companions:s.companions};
  for(const [key,value] of Object.entries(values))url.searchParams.set(key,value);
  return url;
}
export function median(values) {
  if(!values.length)return null;
  const sorted=[...values].sort((a,b)=>a-b);
  const middle=Math.floor(sorted.length/2);
  return sorted.length%2 ? sorted[middle] : (sorted[middle-1]+sorted[middle])/2;
}
