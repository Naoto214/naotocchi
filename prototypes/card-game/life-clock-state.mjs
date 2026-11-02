// Display boundary only. createGame defines A as the canonical first seat;
// humanSeat and the current turn do not change this. No mutation/save API here.
export function clockState(view,{firstSeat='A',endRound=10}={}){
 if(!view?.players||!['A','B'].includes(firstSeat))throw Error('時計に表示する対戦がありません');
 const secondSeat=firstSeat==='A'?'B':'A',first=view.players[firstSeat],second=view.players[secondSeat];
 const state={round:view.round,firstTime:first.time,secondTime:second.time,firstGrowth:first.growth,secondGrowth:second.growth,end:endRound,firstSeat,secondSeat};
 for(const key of ['round','firstTime','secondTime','end'])if(!Number.isInteger(state[key])||state[key]<0||state[key]>12||(key==='end'&&state[key]<1))throw Error('時計の値が不正です');
 for(const key of ['firstGrowth','secondGrowth'])if(!Number.isInteger(state[key])||state[key]<0||state[key]>100||state[key]%5)throw Error('時計のそだちが不正です');
 return state;
}
