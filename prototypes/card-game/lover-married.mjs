// 恋人18種類の「♥ 結婚したら」（結婚後の追加能力）。正式採用：2026-11-04（docs/card-game/480-lover-married-abilities.md）。
// 能力の正本は VERSION 5 最終（PR #517 414e344c の lib/v5-patches.mjs の FINAL とテスト）。規則は rules.mjs の末尾、本文はこの表。
// 新しい対戦の版（hotseat-8）からだけ働く。hotseat-7 以前の保存は、結婚後の追加能力なしで再生する（旧保存を新ルールへ変換しない）。
// 依存のない小さな表なので、rules / late-conditions / costs / effects / ability-copy / UI から読む。正式カタログ（canonical452）は変えない。
export const marriedText=id=>LOVER_MARRIED[id]?.married??null;
export const MARRIED_VERSIONS=Object.freeze(['hotseat-8']);
// 結婚後の追加能力がない版（hotseat-1 は legacy-engine）。うし・ゆきだるまの旧版用トリガーはこの版でだけ働く。
export const MARRIED_LEGACY_VERSIONS=Object.freeze(['hotseat-2','hotseat-3','hotseat-4','hotseat-5','hotseat-6','hotseat-7']);
export const marriedAbilitiesActive=s=>MARRIED_VERSIONS.includes(s?.version);
// kind：once＝結婚した時に1回、cont＝結婚している間ずっと、event＝結婚中に条件がそろった時（回数制限はカードどおり）。
// cpuKind：中級CPUの評価で「1回分」として数えるもの（せいれいは R10 だけの+5 なので1回分）。
export const LOVER_MARRIED=Object.freeze({
 'P-anglerfish':{kind:'once',married:'このこいびとと結婚した時、山札上4枚を見て、その中から「しんかい」1枚を公開して手札に加えてもよい。残りは山札の一番下に置く。'},
 'P-cat_ceo':{kind:'once',married:'このこいびとと結婚した時、1枚引く。このターン、自分が次に「あそび」カードをプレイするための時を1少なくする。'},
 'P-cliff_goat':{kind:'event',married:'「こいびとのとき」の能力は、時を1少なくする代わりに「1枚引く」にしてもよい。'},
 'P-desert_scorpion':{kind:'once',married:'このこいびとと結婚した時、自分の捨て札の「あそび」か「あいてむ」1枚を手札に戻す。'},
 'P-field_cow':{kind:'event',married:'「こいびとのとき」の能力で見たカードを手札に加え、手札1枚を山札の一番下に置いてもよい。'},
 'P-forest_bear':{kind:'cont',married:'1ラウンドに1回。このカードが相手の効果で手札に戻るなら、このカードにみにつけられたカード1枚を捨て札に置くことで、その移動を防いでもよい。'},
 'P-gentle_gorilla':{kind:'once',married:'このこいびとと結婚した時、このターン、自分のメインのちから+2。'},
 'P-grove_deer':{kind:'once',married:'結婚した時と、結婚している間の自分のターン開始時に手札が1枚以下の時にも、「こいびとのとき」の能力を発動できる。'},
 'P-high_eagle':{kind:'once',married:'このこいびとと結婚した時、1枚引く。'},
 'P-knitting_spider':{kind:'once',married:'このこいびとと結婚した時、自分の捨て札の「みにつける」のカード1枚を山札の一番上に置く。'},
 'P-oasis_cactus':{kind:'cont',married:'このカードにカードがみにつけられていない間、自分のメインのちから+1。'},
 'P-robot_neighbor':{kind:'cont',married:'結婚している間、自分のターンには、自分のメインのちえ+1も得る。'},
 'P-rock_octopus':{kind:'event',married:'「こいびとのとき」の能力は、時1を払わず、自分になかまがいなくても発動できる。'},
 'P-sea_mermaid':{kind:'cont',married:'1ターンに1回。自分がセカイを出すための時を1少なくしてもよい。'},
 'P-snow_spirit':{kind:'event',cpuKind:'once',married:'R10の自分のターン終了時に、このこいびとと結婚していれば発動する（R10に結婚したターンも含む）。自分のそだち+5。'},
 'P-snowman':{kind:'event',married:'結婚中に離れて「こいびとのとき」の能力が発動した時は、さらに1枚引く。'},
 'P-sunflower_partner':{kind:'event',married:'自分のメインがときおくりでメイン枠に置かれた時にも、「こいびとのとき」の能力を発動できる。'},
 'P-swamp_croc':{kind:'event',married:'相手から受けたちょうせんで引き分けた時にも、「こいびとのとき」の能力を発動できる。'},
});
// 中級CPU（heuristic-3）が結婚の能力を見積もる値。1回型はこの値、それ以外は「値×残りのターン数」（VERSION 5 で検証）。
export const MARRIED_CPU_VALUE=Object.freeze({'P-anglerfish':3,'P-cat_ceo':4,'P-cliff_goat':1,'P-desert_scorpion':3,'P-field_cow':1.2,'P-forest_bear':0.8,'P-gentle_gorilla':2,
 'P-grove_deer':4,'P-high_eagle':3,'P-knitting_spider':1.5,'P-oasis_cactus':1.8,'P-robot_neighbor':1.8,'P-rock_octopus':0.6,'P-sea_mermaid':1.5,'P-snow_spirit':5,
 'P-snowman':0.5,'P-sunflower_partner':0.8,'P-swamp_croc':0.6});
