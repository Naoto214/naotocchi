// Conversation v2 Pilot — 掛け合い(本人⇄来ている相手)と、プレイヤーへの選択肢つき問いかけ。
// 台詞のデータと、候補を絞るだけの純関数。DOM・セーブ・タイマー・乱数は持たない。
// いつ・どれを出すかは script.js と Conversation Director が決める。
// 文章は docs/TEXT_STYLE.md と既存会話監査の Conversation DNA に合わせる(真顔・短い・半歩ずれ)。
// 設計: docs/design/conversation-v2-pilot-2026-10-22.md
(function(root) {
  'use strict';

  // role: 'pet' = 本人、'them' = いま家に来ている こいびと / なかま
  const beat = (role, text) => Object.freeze({role, text});
  const P = text => beat('pet', text);
  const T = text => beat('them', text);
  // with: 'partner:<id>' / 'companion:<id>' はその相手だけ。'partner' / 'companion' はその種類の誰でも(寡黙なキャラは除く)
  const banter = (id, withKey, ...beats) => Object.freeze({id, with:withKey, beats:Object.freeze(beats)});

  const BANTERS = Object.freeze([
    // こいびと(各キャラの性質のフィルタで返す)
    banter('b-octopus-hands', 'partner:rock_octopus', T('手、あいてる?'), P('二本ともあいてる'), T('少ないね')),
    banter('b-octopus-snack', 'partner:rock_octopus', T('おやつ、8つに分けといた'), P('食べるの、ぼくひとりだよ'), T('じゃあ8回食べて')),
    banter('b-snowman-hug', 'partner:snowman', P('ぎゅってしていい?'), T('3秒までなら形を保てる'), P('数えるの、ゆっくりでいい?')),
    banter('b-cactus-hand', 'partner:oasis_cactus', P('手つなごう'), T('つないだつもりで歩こう'), P('いま、ちょっと強くにぎった?')),
    banter('b-croc-passing', 'partner:swamp_croc', T('……べつに会いに来たわけじゃない'), P('じゃあ何しに来たの?'), T('……通りかかった。三回')),
    banter('b-gorilla-flower', 'partner:gentle_gorilla', T('この花、どう持てばいい?'), P('ふつうに'), T('ふつうがいちばん難しい')),
    banter('b-eagle-flight', 'partner:high_eagle', P('きょう、何してたの?'), T('……飛んでた'), P('どこまで?'), T('……ここまで')),
    banter('b-scorpion-water', 'partner:desert_scorpion', T('……水'), P('くれるの?'), T('……置いとく')),
    banter('b-robot-glad', 'partner:robot_neighbor', P('いま、うれしい?'), T('確認しています'), P('……まだ?'), T('うれしいので処理が遅れています')),
    banter('b-cat-meeting', 'partner:cat_ceo', P('お仕事は?'), T('いま会議中'), P('どこで?'), T('ここ。きみが議長')),
    banter('b-goat-above', 'partner:cliff_goat', P('どこから来たの?'), T('上から'), P('上には何もないよ'), T('だから近かった')),
    banter('b-sunflower-sun', 'partner:sunflower_partner', P('太陽、あっちだよ'), T('知ってる。こっちを向いてるだけ')),
    banter('b-angler-light', 'partner:anglerfish', T('ちょっと電気、消していい?'), P('いま、昼だよ'), T('じゃあ目をつぶってて')),
    banter('b-cow-grass', 'partner:field_cow', T('草、持ってきたよ'), P('ぼく、草は食べないよ'), T('知ってる。毎年持ってくる')),
    banter('b-deer-seat', 'partner:grove_deer', T('……そこ、座っていい?'), P('となり、あいてるよ'), T('じゃあ、そのとなりのとなり')),
    banter('b-mermaid-walk', 'partner:sea_mermaid', T('歩くって、毎回ころばない練習?'), P('……言われると、そうかも')),
    banter('b-bear-chair', 'partner:forest_bear', T('ここ、座っていい?'), P('いいよ'), T('……いすが、いいよって言ってない')),
    // なかま
    banter('b-snail-ahead', 'companion:snail', T('先に行ってるね!'), P('まだここにいるよ'), T('気持ちは、もう着いた')),
    banter('b-clock-time', 'companion:clock', P('いま何時?'), T('だいたい、きのうのつづき')),
    banter('b-box-inside', 'companion:box', P('なか、何が入ってるの?'), T('……ただのはこです'), P('答えになってないよ'), T('……なってないのが中身です')),
    banter('b-statue-moved', 'companion:sekizou', P('いま、動いた?'), T('……見てたなら、動いてない')),
    banter('b-parrot-morning', 'companion:parrot', P('おはよう'), T('おはよう!……いまのは自分で考えた')),
    banter('b-hamster-cheek', 'companion:hamster', P('おやつ、あるよ'), T('右に入れて。左は予約でいっぱい')),
    banter('b-owl-late', 'companion:owl', P('夜ふかし?'), T('昼ふかし')),
    banter('b-fox-tails', 'companion:many_tail_fox', P('しっぽ、何本?'), T('数えてるあいだに一本ふえる'), P('じゃあ、数えないでおく'), T('……それはそれで減る気がする')),
    banter('b-watcher-known', 'companion:watcher', T('……さっきから見てる'), P('知ってるよ'), T('……知られてたの、はじめて')),
    banter('b-monkey-copy', 'companion:monkey', P('まねしないで'), T('まねしないで'), P('ずるい'), T('ずるい')),
    // 誰が来ても成り立つもの(寡黙なキャラには使わない)
    banter('b-partner-called', 'partner', P('ねえ'), T('なに?'), P('呼んでみただけ'), T('じゃあ、返事してみただけ')),
    banter('b-companion-plan', 'companion', T('あそびに来た!'), P('何してあそぶ?'), T('来たところまでしか考えてなかった')),
  ]);

  // 選択肢: label はボタンの短い文字。reply は選んだあとに続く beat(本人 / 来ている相手)
  const choice = (label, ...reply) => Object.freeze({label, reply:Object.freeze(reply)});
  const question = (id, ask, choices, extra = {}) => Object.freeze({id, ask, choices:Object.freeze(choices), with:null, lead:Object.freeze([]), ...extra});

  const QUESTIONS = Object.freeze([
    question('q-cloud-seat', 'くものうえって、座れると思う?', [
      choice('座れる', P('じゃあ、席とっとく')),
      choice('座れない', P('立ち見か……')),
      choice('先に座ってみて', P('下で待ってて。すぐ落ちるから')),
    ]),
    question('q-my-color', 'ぼくって、何色だと思う?', [
      choice('見たまま', P('見たまま色。いい名前')),
      choice('金色', P('……いま、ちょっと光った')),
      choice('とうめい', P('じゃあ、いまここにいるのは何?')),
    ]),
    question('q-tomorrow', 'あしたって、もう来てる?', [
      choice('まだだよ', P('じゃあ、迎えに行かないでおく')),
      choice('もう来てる', P('どこに隠れてるんだろ')),
      choice('寝たら来る', P('起きてたら来ない?ためしてみる')),
    ]),
    question('q-tummy-sound', 'いま、おなかの音きこえた?', [
      choice('きこえた', P('返事してあげて')),
      choice('きこえない', P('じゃあ、いまのは心の音')),
    ]),
    question('q-secret', 'ひみつ、ひとつ言っていい?', [
      choice('いいよ', P('……わすれた。言っていい?までは覚えてる')),
      choice('だめ', P('じゃあ、ひみつのまま持っとく。重い')),
      choice('あとでね', P('あとでの箱に入れとく')),
    ]),
    question('q-while-asleep', 'ぼくが寝てるとき、どこにいるの?', [
      choice('ここにいる', P('じゃあ、寝言きかれてる?')),
      choice('帰ってる', P('同じ時間に寝てた?')),
      choice('ないしょ', P('夢の中でさがしてみる')),
    ]),
    question('q-hundred', '100さいって、遠い?', [
      choice('遠いよ', P('じゃあ、ゆっくり歩こ')),
      choice('すぐだよ', P('いそいで顔あらってくる')),
      choice('わからない', P('ぼくも。いっしょにわからないね')),
    ]),
    question('q-sneeze', 'くしゃみ、出そうで出ない。手伝って', [
      choice('はくしょん', P('……出た。そっちから')),
      choice('くすぐる', P('……ありがとう。止まった')),
      choice('待つ', P('待ってたら帰っちゃった')),
    ]),
    question('q-meal-order', 'ごはんとおやつ、どっちが先?', [
      choice('ごはん', P('わかった。おやつを先に、ごはんにする')),
      choice('おやつ', P('話がはやい')),
      choice('同時に', P('口がもうひとつ要るね')),
    ]),
    question('q-call-name', 'ぼくの名前、呼んでみて', [
      choice('なおとっち', P('はい。……いまの返事、じょうずだった?')),
      choice('おーい', P('それも、ぼくの名前ってことにする')),
      choice('……', P('心の中で呼んだ?きこえた気がする')),
    ]),
    question('q-buy-cloud', 'くもって、どこで買える?', [
      choice('売ってない', P('じゃあ、ひろうしかない')),
      choice('空で', P('とどかないお店だ')),
      choice('わたあめ屋', P('……それは食べちゃうくも')),
    ]),
    question('q-two-of-me', 'ぼくがふたりいたら、どっちと遊ぶ?', [
      choice('両方', P('じゃあ、ぼくもふたり分たのしむ')),
      choice('本物', P('本物はどっち?ぼくもわからない')),
      choice('いまのほう', P('……いまのぼく、ちょっと勝った')),
    ]),
    // 来ている相手もいる問いかけ(相手→本人→プレイヤー→相手、の4人目までつながる)
    question('q-what-partner-does', 'ねえ、こいびとって何するひと?', [
      choice('となりにいる', T('いま、してる')),
      choice('おやつを分ける', T('……半分、ちょうだい')),
      choice('わからない', T('わたしも、毎日しらべてる')),
    ], {with:'partner'}),
    question('q-tell-them', '言っていい?', [
      choice('いいよ', P('……何の話だったっけ')),
      choice('ないしょ', T('ないしょって言われると、気になる')),
    ], {with:'companion', lead:Object.freeze([T('ふたりで何の話してたの?')])}),
  ]);

  // 返事がないまま時間が過ぎたとき、たまに言う(言わないことも多い)
  const NO_ANSWER_LINES = Object.freeze([
    '返事、あとで聞くね',
    '考え中の顔、もらった',
    'いまの間、けっこう好き',
  ]);

  function visitorKind(visitorKey) {
    const kind = String(visitorKey || '').split(':')[0];
    return kind === 'partner' || kind === 'companion' ? kind : null;
  }
  // その相手と成り立つ候補。specific(その相手専用)と generic(誰でも)に分ける。isQuiet(key) が真なら generic は使わない
  function candidatesFor(list, visitorKey, {isQuiet = () => false} = {}) {
    const kind = visitorKind(visitorKey);
    const specific = [], generic = [];
    for (const unit of list) {
      if (!unit.with) continue;
      if (unit.with === visitorKey) specific.push(unit);
      else if (kind && unit.with === kind && !isQuiet(visitorKey)) generic.push(unit);
    }
    return {specific, generic};
  }
  function banterCandidates(visitorKey, opts) { return candidatesFor(BANTERS, visitorKey, opts); }
  // 問いかけ: 来ている相手がいなければ本人だけの問いかけ。いれば、その相手と成り立つものも加える
  function questionCandidates(visitorKey, opts) {
    const solo = QUESTIONS.filter(q => !q.with);
    if (!visitorKey) return {solo, withVisitor:[]};
    const {specific, generic} = candidatesFor(QUESTIONS, visitorKey, opts);
    return {solo, withVisitor:[...specific, ...generic]};
  }

  // データの形を確かめる(テストと起動時の安全確認用)。問題があれば文字列の配列を返す
  function validate() {
    const problems = [], ids = new Set();
    const checkText = (where, text) => {
      if (typeof text !== 'string' || !text.trim()) problems.push(`${where}: empty text`);
      else if (/[ 　]/.test(text)) problems.push(`${where}: Japanese text must not contain spaces`);
    };
    const checkBeats = (where, beats, min) => {
      if (!Array.isArray(beats) || beats.length < min || beats.length > 4) problems.push(`${where}: ${beats?.length} beats`);
      (beats || []).forEach((b, i) => {
        if (!b || (b.role !== 'pet' && b.role !== 'them')) problems.push(`${where}[${i}]: role`);
        checkText(`${where}[${i}]`, b?.text);
      });
    };
    for (const u of BANTERS) {
      if (ids.has(u.id)) problems.push(`${u.id}: duplicate id`); ids.add(u.id);
      if (!/^(partner|companion)(:[a-z_]+)?$/.test(u.with || '')) problems.push(`${u.id}: with`);
      checkBeats(u.id, u.beats, 2);
      for (let i = 1; i < u.beats.length; i++) if (u.beats[i].role === u.beats[i - 1].role) problems.push(`${u.id}: same speaker twice in a row`);
    }
    for (const q of QUESTIONS) {
      if (ids.has(q.id)) problems.push(`${q.id}: duplicate id`); ids.add(q.id);
      checkText(`${q.id}.ask`, q.ask);
      if (q.with != null && !/^(partner|companion)(:[a-z_]+)?$/.test(q.with)) problems.push(`${q.id}: with`);
      if (q.lead.length) checkBeats(`${q.id}.lead`, q.lead, 1);
      if (!Array.isArray(q.choices) || q.choices.length < 2 || q.choices.length > 4) problems.push(`${q.id}: ${q.choices?.length} choices`);
      const labels = new Set();
      for (const [i, c] of (q.choices || []).entries()) {
        checkText(`${q.id}.choices[${i}].label`, c.label);
        if ([...String(c.label)].length > 8) problems.push(`${q.id}.choices[${i}]: label too long for a button`);
        if (labels.has(c.label)) problems.push(`${q.id}: duplicate label`); labels.add(c.label);
        checkBeats(`${q.id}.choices[${i}].reply`, c.reply, 1);
        if (!q.with && c.reply.some(b => b.role === 'them')) problems.push(`${q.id}: a solo question cannot reply as a visitor`);
      }
    }
    NO_ANSWER_LINES.forEach((t, i) => checkText(`NO_ANSWER_LINES[${i}]`, t));
    return problems;
  }

  const api = {BANTERS, QUESTIONS, NO_ANSWER_LINES, banterCandidates, questionCandidates, visitorKind, validate, VERSION:1};
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.NaotocchiConversationBanter = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
