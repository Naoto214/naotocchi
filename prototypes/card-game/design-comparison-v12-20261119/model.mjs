// Review-only projection. Never mutates canonical objects or writes storage.
export function chosenName(row, choices={}) {return choices[row.id]??row.recommended;}
export function projectCard(card,data,{candidate=true,choices={}}={}){
 if(!candidate||!card||card.hidden)return card;
 const id=card.cardId??card.id,row=data.names.find(r=>r.id===id),k=data.kanji.find(r=>r.id===id);
 const out={...card};
 if(row)out.form=chosenName(row,choices);
 if(k)out.name=chosenName(k,choices);
 for(const ref of data.kanji)if(ref.cardTextReferences.includes(id)){
  const name=chosenName(ref,choices);
  for(const field of ['text','married'])if(typeof out[field]==='string')out[field]=out[field].replaceAll(ref.original,name);
 }
 return out;
}
export function matches(row,query){return [row.id,row.species,row.cardName,row.currentMain,row.currentDex,row.currentCard,row.recommended,row.original,row.proposed,row.readingCandidate,...(row.aliases??[])].join(' ').normalize('NFKC').toLowerCase().includes(query.normalize('NFKC').toLowerCase());}
