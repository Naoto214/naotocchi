export const DAYPARTS={
  "home": {
    "morning": "comparisons/dayparts-20261103/v2/home-morning.webp",
    "day": "comparisons/dayparts-20261103/v2/home-day.webp",
    "evening": "comparisons/dayparts-20261103/images/home-evening.webp",
    "night": "comparisons/dayparts-20261103/v6/home-night.webp"
  },
  "forest": {
    "morning": "comparisons/dayparts-20261103/v2/forest-morning.webp",
    "day": "comparisons/dayparts-20261103/v2/forest-day.webp",
    "evening": "comparisons/dayparts-20261103/images/forest-evening.webp",
    "night": "comparisons/dayparts-20261103/v6/forest-night.webp"
  },
  "river_lake": {
    "morning": "comparisons/dayparts-20261103/v4/river_lake-morning.webp",
    "day": "comparisons/dayparts-20261103/v4/river_lake-day.webp",
    "evening": "comparisons/dayparts-20261103/v4/river_lake-evening.webp",
    "night": "comparisons/dayparts-20261103/v6/river_lake-night.webp"
  },
  "city": {
    "morning": "comparisons/dayparts-20261103/v2/city-morning.webp",
    "day": "comparisons/dayparts-20261103/v2/city-day.webp",
    "evening": "comparisons/dayparts-20261103/images/city-evening.webp",
    "night": "comparisons/dayparts-20261103/v6/city-night.webp"
  },
  "countryside": {
    "morning": "comparisons/dayparts-20261103/v4/countryside-morning.webp",
    "day": "comparisons/dayparts-20261103/v4/countryside-day.webp",
    "evening": "comparisons/dayparts-20261103/v4/countryside-evening.webp",
    "night": "comparisons/dayparts-20261103/v6/countryside-night.webp"
  },
  "mountain": {
    "morning": "comparisons/dayparts-20261103/v4/mountain-morning.webp",
    "day": "comparisons/dayparts-20261103/v4/mountain-day.webp",
    "evening": "comparisons/dayparts-20261103/v4/mountain-evening.webp",
    "night": "comparisons/dayparts-20261103/v6/mountain-night.webp"
  },
  "snow": {
    "morning": "comparisons/dayparts-20261103/v4/snow-morning.webp",
    "day": "comparisons/dayparts-20261103/v4/snow-day.webp",
    "evening": "comparisons/dayparts-20261103/v4/snow-evening.webp",
    "night": "comparisons/dayparts-20261103/v6/snow-night.webp"
  },
  "sea": {
    "morning": "comparisons/dayparts-20261103/v4/sea-morning.webp",
    "day": "comparisons/dayparts-20261103/v4/sea-day.webp",
    "evening": "comparisons/dayparts-20261103/v4/sea-evening.webp",
    "night": "comparisons/dayparts-20261103/v6/sea-night.webp"
  },
  "jungle": {
    "morning": "comparisons/dayparts-20261103/v4/jungle-morning.webp",
    "day": "comparisons/dayparts-20261103/v4/jungle-day.webp",
    "evening": "comparisons/dayparts-20261103/v4/jungle-evening.webp",
    "night": "comparisons/dayparts-20261103/v6/jungle-night.webp"
  },
  "desert": {
    "morning": "comparisons/dayparts-20261103/v4/desert-morning.webp",
    "day": "comparisons/dayparts-20261103/v4/desert-day.webp",
    "evening": "comparisons/dayparts-20261103/v4/desert-evening.webp",
    "night": "comparisons/dayparts-20261103/v6/desert-night.webp"
  },
  "deepsea": {
    "morning": "comparisons/dayparts-20261103/v4/deepsea-morning.webp",
    "day": "comparisons/dayparts-20261103/v4/deepsea-day.webp",
    "evening": "comparisons/dayparts-20261103/v4/deepsea-evening.webp",
    "night": "comparisons/dayparts-20261103/v4/deepsea-night.webp"
  },
  "star_stop": {
    "morning": "comparisons/dayparts-20261103/v4/star_stop-morning.webp",
    "day": "comparisons/dayparts-20261103/v4/star_stop-day.webp",
    "evening": "comparisons/dayparts-20261103/v4/star_stop-evening.webp",
    "night": "comparisons/dayparts-20261103/v6/star_stop-night.webp"
  },
  "memory_lake": {
    "morning": "comparisons/dayparts-20261103/v4/memory_lake-morning.webp",
    "day": "comparisons/dayparts-20261103/v4/memory_lake-day.webp",
    "evening": "comparisons/dayparts-20261103/v4/memory_lake-evening.webp",
    "night": "comparisons/dayparts-20261103/v6/memory_lake-night.webp"
  }
};
// Presentation state only. Never touches residents, terrain or persistent state.
export function createDayparts(win){
 let key='',token=0,image=null,previous=null,elapsed=4,pending=null,dead=false,error=null;
 return {
  select(region,time){const src=DAYPARTS[region]?.[time];if(!src||src===key||dead)return;key=src;pending=null;const id=++token,next=new win.Image();next.decoding='async';
   next.onload=()=>{if(dead||id!==token)return;if(elapsed<4){pending=next;}else{previous=image;image=next;elapsed=previous?0:4;}error=null;};
   next.onerror=()=>{if(dead||id!==token)return;error=src;};next.src=src;
  },
  frame(dt,reduced=false){elapsed=reduced?4:Math.min(4,elapsed+Math.max(0,dt||0));if(elapsed===4){previous=null;if(pending){previous=image;image=pending;pending=null;elapsed=reduced?4:0;}}return {image,previous,alpha:elapsed/4,error};},
  destroy(){dead=true;token++;image=previous=null;}
 };
}
export function atmosphere(e){
 const special=['deepsea','star_stop','memory_lake'].includes(e.region),dry=['desert','jungle'].includes(e.region);
 const precipitation=special?'none':e.weather==='rain'?'rain':e.weather==='snow'&&!dry?'snow':'none';
 const seasonal=['forest','countryside','river_lake','mountain'].includes(e.region);
 const particle=precipitation!=='none'?precipitation:special?(e.region==='deepsea'?'plankton':'spark'):seasonal&&e.season==='spring'?'petal':seasonal&&e.season==='autumn'?'leaf':'none';
 return {precipitation,particle,cloud:!special&&['cloudy','rain','snow'].includes(e.weather),frost:seasonal&&e.season==='winter'};
}
