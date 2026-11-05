// Display-only line breaks for non-main card names. Official names never contain
// line breaks; this table only marks the single natural break point ("|") that a
// card face may use when the name does not fit on one line at its current size.
// Names absent from the table (or whose split would strand 1-2 characters) are
// kept on one line and shrunk only as much as needed.
const BREAKS = `ぐうたら|パンダ
ふわふわ|ヒツジ
いたずら|たぬき
みている|なにか
さいごの|じかん
よなかの|あかり
趣味を|見つけた
小さな|旅の計画
ブロック|くずし
コネクト|フォー
クレーン|ゲーム
ドット|イーター
ゆきの|ゲレンデ
ブロック|パズル
ヒット&|ブロー
ピンポン|ラリー
よけて|キャッチ
スキー|ジャンプ
スライド|パズル
かくとう|バトル
たこやき|やさん
ラッキー|コイン
ずかん|チケット
ふしぎな|たまご
いのちの|くすり
なおとの|リング
ふかふか|まくら
リュック|サック
ビルの|ねこ社長
がけの|ヤギさん
もりの|クマさん
やさしい|ゴリラ
うみの|にんぎょ
ゆきの|せいれい
ぬまの|ワニさん
よふかし|コウモリ
はやおき|ニワトリ
ものしり|ふくろう
おしゃべり|オウム
とけかけの|ぷにゅ
ごろごろ|アザラシ
おおきな|びょうき
はじめての|デート
50さいの|お祝い
あたらしい|であい
けっこん|きねんび
どうぶつ|しょうぎ
ブラック|ジャック
バブル|シューター
やまの|岩場のぼり
おべんとう|づくり
うみの|さかなつり
ジャンプ|クエスト
フルーツ|マッチ3
マイン|スイーパー
ミサイル|コマンド
うちゅう|フライト
ゴールを|めざして
リズム|ハイウェイ
スカイ|シューター
スペース|ガンナー
しゅうかく|タワー
ゆきだるま|タワー
つみかさね|タワー
おともだち|バッジ
いのちの|おまもり
おみあい|チケット
へんしん|チケット
なおとの|おまもり
なおとの|かんむり
なおとの|ランタン
のはらの|うしさん
いわばの|タコさん
きおくの|みずうみ
びっくり|ハリネズミ
あそびずき|カワウソ
すばしっこい|うさぎ
うんめいの|へんしん
そらにうかぶ|とりい
としをとった|じぶん
ケーキの|かざりつけ
みずべの|さかなつり
しんけい|すいじゃく
ハイウェイ|ドライブ
ほんかく|さかなつり
リング|フライト3D
なつのうみ|フライト
たまころがし|めいろ
タワー|ディフェンス
ボクセル|マイニング
おともだち|チケット
レアなかま|チケット
トイレット|ペーパー
さばくの|サソリさん
とけない|ゆきだるま
ほおぶくろ|ハムスター
しっぽのおおい|きつね
すべりたがり|ペンギン
せっかちな|カタツムリ
庭に小さな|花を植えた
ふゆの|カーリング大会
ぴょんぴょん|ジャンプ
しんかい|フィッシング
かえるの|おうちがえり
ときの|チケット・まえ
ときの|チケット・あと
となりまちの|ロボット
はたけの|ひまわりさん
サングラスの|カメレオン
じかんにルーズな|とけい
ひとなつっこい|しばいぬ
まよいこんだ|ユニコーン
たからさがし|ダンジョン
オアシスの|サボテンさん
むひょうじょうの|せきぞう
とくべつなたびの|おもいで
ひかる|チョウチンアンコウ
あみものがすきな|クモさん
ほしぞらの|ていりゅうじょ
あやまりにきた|だいおういか
どこにもつながらない|かいだん`.split('\n').map(row=>[row.replace('|',''),row.split('|')]);
export const TITLE_BREAKS=new Map(BREAKS);

// Name lanes in cqw of the card face: compact faces use the symmetric 23% side
// padding, full faces the 4%/24% lane left of the cost circle. A small margin
// absorbs font differences between Hiragino Mincho and fallback fonts.
const LANE={compact:54*.97,full:72*.97},SPACING=1.02,MIN_LINE=3;
const em=s=>[...s].reduce((n,ch)=>n+(/[\x20-\x7e]/.test(ch)?.6:1),0)*SPACING;
const round=n=>Math.floor(n*100)/100;
// Existing size token by name length; names that fit keep it unchanged.
export const baseTitleSize=title=>{const n=[...title].length;return n>13?5.8:n>8?6.8:8;};

function fit(title,segments,lane){
 const base=baseTitleSize(title),one=lane/em(title);
 if(one>=base)return {size:base,lines:1};
 const usable=segments.length===2&&segments.every(s=>[...s].length>=MIN_LINE);
 const two=usable?Math.min(base,lane/Math.max(...segments.map(em))):0;
 // Prefer one line when it costs at most 10% of the size or reads larger than two.
 if(!usable||one>=base*.9||one>=two)return {size:round(one),lines:1};
 return {size:round(two),lines:2};
}

export function titleLayout(title){
 const segments=TITLE_BREAKS.get(title)??[title];
 return {segments,full:fit(title,segments,LANE.full),compact:fit(title,segments,LANE.compact)};
}

// The break opportunity exists only between segments; each segment is unbreakable.
export function titleMarkup(title,escape){
 const {segments}=titleLayout(title);
 return segments.map(s=>`<span class="title-seg">${escape(s)}</span>`).join('<wbr>');
}
