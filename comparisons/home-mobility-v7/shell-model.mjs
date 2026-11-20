import {regions,times} from '../shell-model.mjs';

export function readScene(query) {
  const value = (choices,key,fallback) => choices.some(([id])=>id===query.get(key)) ? query.get(key) : fallback;
  const count=query.get('count');
  return {
    arm:['v5','v6'].includes(query.get('arm')) ? query.get('arm') : 'v7',
    region:value(regions,'region','forest'), time:value(times,'time','day'),
    count:/^(?:[1-9]|1\d|2[0-8])$/.test(count)?Number(count):28,
    paused:query.get('paused')==='1', diagnostics:query.get('diagnostics')==='1',
  };
}
export function sceneQuery({arm,region,time,count,paused,diagnostics}) {
  return new URLSearchParams({arm,region,time,count,paused:Number(paused),diagnostics:Number(diagnostics)});
}
export function gameURL({arm,region,time,count,diagnostics},base) {
  const url=new URL('../game/mobility-'+arm+'.html',base);
  url.search=new URLSearchParams({region,time,count,paused:1,clock:0,ground:'on',paired:1,
    variant:'B',compareSplit:0,season:'autumn',weather:'sunny',diagnostics:Number(diagnostics)});
  return url;
}
