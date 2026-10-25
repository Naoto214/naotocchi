// blackjack-21 (games.js:6850-6909) の規則をそのまま写した モンテカルロ
function run(policy,N=200000){const dist={S:0,A:0,B:0,C:0,D:0};let sum=0;
for(let n=0;n<N;n++){let deck=[];const newDeck=()=>{deck=[];for(let s=0;s<4;s++)for(let r=1;r<=13;r++)deck.push(r);for(let i=deck.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}};
const draw=()=>{if(deck.length<10)newDeck();return deck.pop();};const val=c=>{let v=0,a=0;for(const r of c){if(r===1){a++;v+=11;}else v+=Math.min(10,r);}while(v>21&&a>0){v-=10;a--;}return v;};
newDeck();let chips=100;for(let hand=0;hand<4;hand++){if(chips<20)break;const me=[draw(),draw()],de=[draw(),draw()];let mult;
 if(val(me)===21){while(val(de)<17)de.push(draw());mult=val(de)!==21?1.5:(0);/* natural vs dealer21: mv===dv → 0 */}
 else{while(policy(me,de[0])&&val(me)<21)me.push(draw());const mv=val(me);if(mv>21)mult=-1;else{while(val(de)<17)de.push(draw());const dv=val(de);mult=dv>21?1:mv>dv?1:mv===dv?0:-1;}}
 chips+=Math.round(20*mult);}
const sc=Math.max(15,Math.min(100,Math.round(50+(chips-100)*0.5)));sum+=sc;dist[sc>=90?'S':sc>=75?'A':sc>=55?'B':sc>=35?'C':'D']++;}
return {avg:(sum/N).toFixed(1),...Object.fromEntries(Object.entries(dist).map(([k,v])=>[k,(v/N*100).toFixed(1)+'%']))};}
console.log('always stand ', run(()=>false));
console.log('hit<17      ', run((me)=>{let v=0,a=0;for(const r of me){if(r===1){a++;v+=11;}else v+=Math.min(10,r);}while(v>21&&a>0){v-=10;a--;}return v<17;}));
console.log('basic(dealer up)', run((me,up)=>{let v=0,a=0;for(const r of me){if(r===1){a++;v+=11;}else v+=Math.min(10,r);}while(v>21&&a>0){v-=10;a--;}const u=up===1?11:Math.min(10,up);return v<=11||(v<=16&&u>=7)||(v===12&&u<=3);}));
