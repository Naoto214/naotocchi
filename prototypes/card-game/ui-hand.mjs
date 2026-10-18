// Presentation preferences only. Never writes into a view, state, deck or replay.
export class HandOrder {
 #key=''; #orders={A:[],B:[]};
 constructor(raw){try{const p=JSON.parse(raw);if(p?.version===1&&typeof p.key==='string'&&['A','B'].every(a=>Array.isArray(p.orders?.[a])&&p.orders[a].length<=200&&p.orders[a].every(id=>typeof id==='string'))){this.#key=p.key;this.#orders=p.orders;}}catch{}}
 bind(savedGame){const {seed,decks}=JSON.parse(savedGame),key=JSON.stringify({seed,decks});if(key!==this.#key){this.#key=key;this.#orders={A:[],B:[]};}}
 arrange(seat,hand){const byId=new Map(hand.map(c=>[c.id,c])),ids=[...new Set([...(this.#orders[seat]??[]),...hand.map(c=>c.id)])].filter(id=>byId.has(id));this.#orders[seat]=ids;return ids.map(id=>byId.get(id));}
 move(seat,hand,id,direction){const cards=this.arrange(seat,hand),ids=cards.map(c=>c.id),i=ids.indexOf(id),j=i+direction;if(i>=0&&[-1,1].includes(direction)&&j>=0&&j<ids.length){[ids[i],ids[j]]=[ids[j],ids[i]];this.#orders[seat]=ids;}return this.arrange(seat,hand);}
 reorder(seat,hand,ids){const available=new Set(hand.map(c=>c.id));this.#orders[seat]=[...new Set([...ids,...hand.map(c=>c.id)])].filter(id=>available.has(id));return this.arrange(seat,hand);}
 serialize(){return JSON.stringify({version:1,key:this.#key,orders:this.#orders});}
}
