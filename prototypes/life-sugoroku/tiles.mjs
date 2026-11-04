// One source for tile appearance, accessible explanations, and landing effects.
export const TILE_SCHEMA=Object.freeze({
 plus:{label:'おこづかい',fill:'#f5d180',icon:'¥+5',shape:'round',effect:{sodachi:2,money:5},description:'お金＋5・そだち＋2'},
 minus:{label:'あれれ…',fill:'#e6b6a8',icon:'¥−5',shape:'cut',effect:{sodachi:-2,money:-5},description:'お金−5・そだち−2。おまもりで防げる'},
 event:{label:'人生のできごと',fill:'#fff3d5',icon:'?',shape:'round',effect:{kind:'event',category:null},description:'その場所のできごとを選ぶ'},
 social:{label:'ふれあい',fill:'#c6ddad',icon:'♥',shape:'round',effect:{kind:'event',category:'friend'},description:'出会いや家族のできごと'},
 item:{label:'贈りもの',fill:'#d8c7e4',icon:'箱',shape:'cut',effect:{sodachi:2,money:0,kind:'item',overflowMoney:5},description:'アイテム1個・そだち＋2。満杯ならお金＋5'},
 fate:{label:'時の扉',fill:'#a7d5d4',icon:'時',shape:'arch',effect:{kind:'event',category:'fate'},description:'時や進化にまつわるできごと'},
 facility:{label:'よりみち商店',fill:'#dfc59a',icon:'店',shape:'gable',effect:{sodachi:3,money:3,kind:'shop'},description:'お金＋3・そだち＋3。お買い物もできる'},
});
export function tileDefinition(type){const tile=TILE_SCHEMA[type];if(!tile)throw new RangeError(`Unknown tile type: ${type}`);return tile;}
