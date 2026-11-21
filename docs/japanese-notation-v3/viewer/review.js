'use strict';

(() => {
  const get = id => document.getElementById(id);
  const make = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  const link = (label, href) => {
    const a = make('a', label);
    a.href = href;
    return a;
  };
  const fragment = id => '#' + encodeURIComponent(id);
  function hashId() {
    try { return decodeURIComponent(location.hash.slice(1)); }
    catch { return ''; }
  }
  function option(parent, value, label = value) {
    const item = make('option', label);
    item.value = value;
    parent.append(item);
  }
  function pair(current, proposed) {
    const grid = make('div', undefined, 'pair');
    for (const [label, value] of [['現行の表記', current], ['比較案', proposed]]) {
      const section = make('section');
      section.append(make('h3', label), make('p', value || '記載なし'));
      grid.append(section);
    }
    return grid;
  }
  function notes(entries) {
    const dl = make('dl');
    for (const [name, value] of entries) {
      if (value) dl.append(make('dt', name), make('dd', value));
    }
    return dl;
  }
  function badge(value) {
    const label = make('span', finals.includes(value) ? groupName(value) : value, 'status');
    label.dataset.type = value;
    return label;
  }
  function sourceList(sources) {
    const list = make('ul', undefined, 'sources');
    for (const value of sources) list.append(make('li', value));
    return list;
  }
  function details(title, content) {
    const block = make('details', undefined, 'details-block');
    block.append(make('summary', title), content);
    return block;
  }
  const importance = { A: 'A　整合性', B: 'B　読みやすさ', C: 'C　好み・世界観' };
  const finals = ['採用推奨', '現行維持推奨', '個別判断'];
  const domainOrder = ['ホーム・育成・お世話','アイテム・地域','キャラクター・進化・図鑑','CARD GAME','なおぽよ。・なおころ。','通常ミニゲーム100種・クイック50種','実績・でざいん・シール','ものがたり','共通UI・設定・ヘルプ','通知・コメント・説明文・その他'];
  const groupName = value => 'グループ' + (finals.indexOf(value) + 1) + '　' + value;
  const prefix = 'naotocchi.notation-review.v3.choice.';
  const personal = ['', '変更案を選びたい', '現行を残したい', '引き続き検討'];
  const storageKey = row => prefix + row.id;
  function personalChoice(row) {
    const block = make('div', undefined, 'choice');
    const label = make('label', '自分の仮判断');
    label.htmlFor = 'personal';
    const select = make('select');
    select.id = 'personal';
    select.setAttribute('aria-describedby', 'choice-help');
    for (const item of personal) option(select, item, item || '未選択');
    const help = make('small', 'このブラウザーにだけ保存する未承認のメモです。');
    help.id = 'choice-help';
    const message = make('small');
    message.setAttribute('role', 'status');
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey(row)));
      if (stored && stored.current === row.current && stored.proposed === row.proposed && personal.includes(stored.choice)) select.value = stored.choice;
    } catch { /* Storage can be unavailable in private browsing. */ }
    select.addEventListener('change', () => {
      try {
        if (select.value) localStorage.setItem(storageKey(row), JSON.stringify({ current: row.current, proposed: row.proposed, choice: select.value }));
        else localStorage.removeItem(storageKey(row));
        message.textContent = select.value ? '仮判断をこのブラウザーに保存しました。' : '仮判断を消去しました。';
      } catch {
        message.textContent = '保存できませんでした。選択はこの画面を開いている間だけ表示されます。';
      }
    });
    block.append(label, select, help, message);
    return block;
  }

  async function load(file) {
    const response = await fetch(file);
    if (!response.ok) throw new Error('request failed');
    const rows = await response.json();
    if (!Array.isArray(rows)) throw new Error('unexpected document');
    return rows;
  }

  function renderRules(rows) {
    const container = get('rules'), used = new Set();
    for (const row of rows) {
      const section = make('article', undefined, 'rule');
      let id = String(row.id), suffix = 1;
      while (used.has(id)) id = row.id + '-' + ++suffix;
      used.add(id);
      section.id = id;
      const header = make('div', undefined, 'detail-head');
      header.append(make('h2', row.id), link('この箇所へのリンク', fragment(id)));
      const meta = make('p', undefined, 'row-meta');
      meta.append(badge(row.decision));
      section.append(header, meta, pair(row.current, row.proposed), notes([
        ['画面・掲載箇所', row.location], ['文脈ID', row.context_id], ['判断の理由', row.reason],
        ['表示元', row.source], ['実装・テストの根拠', row.evidence]
      ]));
      const pastIds = Array.isArray(row.v2_ids) ? row.v2_ids : String(row.v2_ids || '').split(/[\s、,・／/]+/).filter(Boolean);
      if (pastIds.length) {
        const previous = make('p', undefined, 'rule-refs');
        previous.append(make('strong', '関連するV2候補'));
        for (const key of pastIds) {
          previous.append(/^J\d+$/.test(key) ? link(key, '../v2/' + fragment(key)) : make('span', key));
        }
        section.append(previous);
      }
      container.append(section);
    }
    get('count').textContent = rows.length + '箇所';
    const target = get(hashId());
    if (target?.classList.contains('rule')) target.scrollIntoView();
  }

  function startReview(rows) {
    const pageSize = 12;
    const normalize = text => String(text || '').normalize('NFKC').toLocaleLowerCase('ja');
    const idMap = new Map(rows.map(row => [row.id, row]));
    const index = new Map(rows.map(row => [row.id, normalize(Object.values(row).flat().join(' '))]));
    for (const group of finals) option(get('final'), group, groupName(group));
    for (const [code, label] of Object.entries(importance)) option(get('priority'), code, label);
    for (const domain of new Set([...domainOrder, ...rows.map(row => row.domain)])) option(get('domain'), domain);
    let filtered, activeId, page = 0;
    const selected = () => idMap.get(activeId);
    const match = (row, words) =>
      (!get('final').value || row.final === get('final').value) &&
      (!get('priority').value || row.priority === get('priority').value) &&
      (!get('domain').value || row.domain === get('domain').value) &&
      words.every(term => index.get(row.id).includes(term));
    function clearFilters() {
      for (const key of ['final', 'priority', 'domain', 'search']) get(key).value = '';
    }
    function findRows() {
      const words = normalize(get('search').value).trim().split(/\s+/).filter(Boolean);
      return rows.filter(row => match(row, words));
    }
    function permalink(id) {
      const url = new URL(location.href);
      url.hash = id ? fragment(id) : '';
      history.replaceState(null, '', url.href);
    }
    function showList() {
      const first = page * pageSize, shown = filtered.slice(first, first + pageSize);
      const list = get('list');
      list.replaceChildren();
      for (const row of shown) {
        const li = make('li'), a = link('', fragment(row.id));
        a.append(make('span', row.id, 'code'), make('span', row.final, 'status-small'), make('span', row.current, 'list-text'));
        if (row.id === activeId) a.setAttribute('aria-current', 'true');
        a.addEventListener('click', e => {
          if (e.button || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
          e.preventDefault();
          choose(row.id);
        });
        li.append(a);
        list.append(li);
      }
      get('range').textContent = shown.length ? (first + 1) + '–' + (first + shown.length) + '件' : '';
      get('prev').disabled = !page;
      get('next').disabled = first + pageSize >= filtered.length;
    }
    function showDetail() {
      const row = selected(), article = get('detail');
      article.replaceChildren();
      article.hidden = !row;
      if (!row) return;
      const head = make('div', undefined, 'detail-head');
      head.append(make('h2', '候補 ' + row.id), link('この候補へのリンク', fragment(row.id)));
      const meta = make('p', undefined, 'row-meta');
      meta.append(badge(row.final), make('span', importance[row.priority] || row.priority), make('span', row.domain));
      if (row.kind) meta.append(make('span', row.kind));
      article.append(head, meta, pair(row.current, row.proposed), notes([
        ['判断の理由', row.reason], ['確認したい点', row.problem], ['変更不要となる条件', row.condition], ['対応ID・文脈キー', row.subjectIds],
        ['他の画面・共通の表記', row.shared], ['採用時の影響', row.impact], ['承認の範囲', row.approved || '記載なし']
      ]));
      if (row.final === '個別判断') article.append(personalChoice(row));
      const sources = Array.isArray(row.sources) ? row.sources : [];
      if (sources.length) article.append(details('使用箇所・出典（' + sources.length + '）', sourceList(sources)));
      if (Array.isArray(row.ruleIds) && row.ruleIds.length) {
        const ruleLinks = make('p', undefined, 'rule-refs');
        ruleLinks.append(make('strong', '対応するルール説明'));
        for (const id of row.ruleIds) ruleLinks.append(link(id, 'rules.html' + fragment(id)));
        article.append(ruleLinks);
      }
      const historyNotes = notes([['V1の判断', row.v1], ['V2の判断', row.v2], ['V2の比較案', row.v2Proposed], ['参照資料', row.references]]);
      if (/^J\d+$/.test(row.id)) {
        const dd = make('dd');
        dd.append(link('この候補をV2で見る', '../v2/' + fragment(row.id)));
        historyNotes.append(make('dt', '以前の比較'), dd);
      }
      if (historyNotes.childElementCount) article.append(details('過去の判断・参照資料', historyNotes));
      const n = filtered.findIndex(item => item.id === row.id);
      const next = make('nav', undefined, 'detail-nav');
      next.setAttribute('aria-label', '候補を移動');
      for (const [step, text] of [[-1, '前の候補'], [1, '次の候補']]) {
        const b = make('button', text);
        b.type = 'button';
        b.disabled = !filtered[n + step];
        b.onclick = () => choose(filtered[n + step].id);
        next.append(b);
      }
      const back = make('button', '一覧へ');
      back.type = 'button';
      back.onclick = () => {
        page = Math.floor(n / pageSize);
        showList();
        get('list').querySelector('[aria-current="true"]')?.focus();
      };
      next.append(back);
      article.append(next);
    }
    function render() {
      get('count').textContent = filtered.length ? filtered.length + '件 ／ 全' + rows.length + '件' : '該当する候補はありません。条件を変えてください。';
      get('browse').hidden = !filtered.length;
      get('story-note').hidden = filtered.length > 0 || get('domain').value !== 'ものがたり';
      showList();
      showDetail();
    }
    function selectInFilter(id) {
      const pos = filtered.findIndex(row => row.id === id);
      activeId = pos >= 0 ? id : filtered[0]?.id;
      page = Math.max(0, Math.floor(pos / pageSize));
    }
    function choose(id) {
      if (activeId !== id) history.pushState(null, '', fragment(id));
      selectInFilter(id);
      render();
      get('detail').focus();
    }
    function refresh() {
      filtered = findRows();
      selectInFilter(activeId);
      permalink(activeId);
      render();
    }
    function route() {
      const id = hashId();
      if (id === 'filters') return;
      filtered = findRows();
      if (idMap.has(id) && !filtered.some(row => row.id === id)) {
        clearFilters();
        filtered = findRows();
      }
      selectInFilter(id);
      render();
      if (id && idMap.has(id)) get('detail').focus();
    }
    for (const key of ['final', 'priority', 'domain']) get(key).addEventListener('change', refresh);
    get('search').addEventListener('input', refresh);
    get('reset').addEventListener('click', () => { clearFilters(); refresh(); get('search').focus(); });
    for (const [id, step] of [['prev', -1], ['next', 1]]) get(id).onclick = () => {
      page += step;
      showList();
      get('list').querySelector('a')?.focus();
    };
    window.addEventListener('hashchange', route);
    window.addEventListener('storage', e => {
      if (selected()?.final === '個別判断' && (e.key === null || e.key === storageKey(selected()))) showDetail();
    });
    route();
  }

  const rules = document.body.dataset.view === 'rules';
  load(rules ? 'rules.json' : 'review.json').then(rows => {
    if (rules) renderRules(rows);
    else startReview(rows);
    get('loading').hidden = true;
  }).catch(() => {
    get('loading').textContent = '資料を読み込めませんでした。ページを再読み込みしてください。';
    get('loading').hidden = false;
  });
})();
