// Independent prototype only. Official engine and saved decks do not import this file.
export function currentPolicy(cards){return Object.freeze({version:'comparison-current',defaultLimit:3,overrides:Object.freeze(Object.fromEntries(cards.filter(c=>c.rare).map(c=>[c.id,1])))});}
export function deckLimit(id,cards,policy){if(!cards.some(c=>c.id===id))throw Error('未知のカードID');const n=policy.overrides[id]??policy.defaultLimit;if(!Number.isInteger(n)||n<1||n>40)throw Error('上限が不正です');return n;}
export function trialPolicy(policy,id,limit){if(![1,2,3].includes(limit))throw Error('比較値は1/2/3');return {...policy,version:'comparison-trial',overrides:{...policy.overrides,[id]:limit}};}
