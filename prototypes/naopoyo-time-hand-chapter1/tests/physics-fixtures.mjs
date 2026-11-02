const actor=(level,x,y)=>({id:'parent',species:'dog',level,x,y});
const board=(level,x,y,sx,sy,extra={})=>({id:'',w:8,h:8,gravity:false,gravityRules:'supported-v1',movementRules:'contact-v2',terrainRules:'magic-gate-v2',splitRules:'recombine-once-v1',splitPriority:'D',timeHand:{maxSteps:7,resetHeading:false,passGenerated:false},actors:[actor(level,x,y)],walls:[],gates:[],exits:[],spikes:[{x:sx,y:sy,power:7}],water:[],...extra});
export const lessons=[
 {title:'後ろへ生まれる',text:'トゲに入ると、うしろに1がうまれるよ。',goal:'いぬを選んで、すぐ下のトゲへ。',hint:'下へ1マス進もう。',board:board(2,3,3,3,4,{spikes:[{x:3,y:4,power:1}]}),count:1},
 {title:'一直線に伸びる',text:'1は、うしろへつづいてうまれるよ。',goal:'トゲへ進み、4体の1を一列に並べよう。',hint:'下へ1マス。うしろの空間を見よう。',board:board(5,3,5,3,6),count:4},
 {title:'岩で曲がる',text:'いけないときは、とけいまわりにまがるよ。',goal:'岩の手前で、右へ曲がるところを見よう。',hint:'下へ進むと、1は上へ。岩で右へ曲がるよ。',board:board(5,3,5,3,6,{walls:[[3,3]]}),count:4,turns:1},
 {title:'仲間で道を変える',text:'なかまをおいて、うまれるばしょをかえよう。',goal:'かえるを動かして、★へ1を誘導しよう。',hint:'かえるを右へ1マス。そのあと、いぬを下のトゲへ。',board:board(5,3,5,3,6,{actors:[actor(5,3,5),{id:'friend',species:'frog',level:1,x:2,y:3}]}),count:4,target:[5,4]},
 {title:'斜めから入る',text:'ななめでも、90どまがるよ。',goal:'右下のトゲへ。左上から、右上へ曲がろう。',hint:'右下↘へ。2つの岩で閉じた角は通れないよ。',board:board(5,4,5,5,6,{walls:[[2,4],[3,3]]}),count:4,diagonal:true},
 {title:'何度でも90度',text:'またつまったら、もう90どまがるよ。',goal:'曲がる場所を予想して、7体に分裂しよう。',hint:'下のトゲへ。上→右→下→左と進むよ。',board:board(8,3,5,3,6,{walls:[[3,3],[6,4],[5,7]]}),count:7,turns:2},
 {title:'落ちて、また育つ',text:'おちてくっつくと、またそだつよ。',goal:'右のトゲへ。分裂直後と落下後を比べよう。',hint:'右へ1マス。岩の上にできた1たちが落ちて合体するよ。',board:board(4,3,3,4,3,{gravity:true,walls:[[2,3],[3,4]]}),count:3,gravity:true},
 {title:'時を取り戻す',text:'わかれたじかんをあつめて、また8にもどろう。',goal:'7体に分裂→8まで回収→上の出口へ。',hint:'下へ分裂。そのまま上へ7マス集め、右の出口へ。',board:board(8,1,6,1,7,{exits:[{x:2,y:0,exact:8}]}),count:7,exit:true}
].map((l,i)=>({...l,id:`T${i+1}`,board:{...l.board,id:`time-hand-tutorial-T${i+1}-v1`}}));
