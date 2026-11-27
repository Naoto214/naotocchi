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
  function pair(current, proposed, left = '現行の表記', right = 'V4の表記') {
    const grid = make('div', undefined, 'pair');
    for (const [label, value] of [[left, current], [right, proposed]]) {
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
    const label = make('span', value, 'status');
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
  const groups = { adopt: '一括採用319件', keep: '一括維持152件', individual: '個別48件' };
  const authorities = { confirmed: '本人確定', pending: '最終推奨・承認待ち', check: '条件確認待ち' };
  const dropdowns = ['group', 'action', 'authority', 'priority', 'domain'];
  const domainOrder = ['ホーム・育成・お世話','アイテム・地域','キャラクター・進化・図鑑','CARD GAME','なおぽよ。・なおころ。','通常ミニゲーム100種・クイック50種','実績・でざいん・シール','ものがたり','共通UI・設定・ヘルプ','通知・コメント・説明文・その他'];
  async function load(file) {
    const response = await fetch(file);
    if (!response.ok) throw new Error('request failed');
    const rows = await response.json();
    if (!Array.isArray(rows)) throw new Error('unexpected document');
    return rows;
  }

  function renderRules(rows, review) {
    const related = new Map();
    for (const entry of review) {
      for (const ruleId of entry.ruleIds || []) {
        if (!related.has(ruleId)) related.set(ruleId, []);
        related.get(ruleId).push(entry.id);
      }
    }
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
      meta.append(badge(row.authority), make('strong', row.decision));
      section.append(header, meta, pair(row.current, row.proposed, '現行のルール全文', '本人確定のルール全文'), notes([
        ['画面・掲載箇所', row.location], ['文脈ID', row.context_id], ['判断の理由', row.reason],
        ['表示元', row.source], ['実装・テストの根拠', row.evidence]
      ]));
      const ids = related.get(id) || [];
      if (ids.length) {
        const candidates = make('p', undefined, 'rule-refs');
        candidates.append(make('strong', '関連するV4候補'));
        for (const candidate of ids) candidates.append(link(candidate, './' + fragment(candidate)));
        section.append(candidates);
      }
      section.append(link('V3の同じルール説明', '../v3/rules.html' + fragment(id)));
      container.append(section);
    }
    const changed = rows.filter(row => row.decision === '訂正').length;
    const kept = rows.filter(row => row.decision === '現行維持').length;
    get('count').textContent = '全' + rows.length + '箇所（訂正' + changed + '・現行維持' + kept + '）';
    const target = get(hashId());
    if (target?.classList.contains('rule')) target.scrollIntoView();
  }

  function startReview(rows) {
    const pageSize = 12;
    const normalize = text => String(text || '').normalize('NFKC').toLocaleLowerCase('ja');
    const idMap = new Map(rows.map(row => [row.id, row]));
    const index = new Map(rows.map(row => [row.id, normalize(Object.values(row).flat().join(' '))]));
    for (const group of Object.values(groups)) option(get('group'), group);
    for (const action of ['変更', '維持']) option(get('action'), action);
    for (const authority of Object.values(authorities)) option(get('authority'), authority);
    for (const [code, label] of Object.entries(importance)) option(get('priority'), code, label);
    for (const domain of new Set([...domainOrder, ...rows.map(row => row.domain)])) option(get('domain'), domain);
    let filtered, activeId, page = 0;
    const selected = () => idMap.get(activeId);
    const match = (row, words) =>
      dropdowns.every(key => !get(key).value || get(key).value === row[key]) &&
      words.every(term => index.get(row.id).includes(term));
    function clearFilters() {
      for (const key of [...dropdowns, 'search']) get(key).value = '';
    }
    function currentPreset() {
      return Object.keys(groups).find(token => groups[token] === get('group').value);
    }
    function findRows() {
      const words = normalize(get('search').value).trim().split(/\s+/).filter(Boolean);
      return rows.filter(row => match(row, words));
    }
    function permalink(id) {
      const url = new URL(location.href);
      const preset = currentPreset();
      if (preset) url.searchParams.set('group', preset);
      else url.searchParams.delete('group');
      const approval = Object.keys(authorities).find(token => authorities[token] === get('authority').value);
      if (approval) url.searchParams.set('authority', approval);
      else url.searchParams.delete('authority');
      url.hash = id ? fragment(id) : '';
      history.replaceState(null, '', url.href);
    }
    function showList() {
      const first = page * pageSize, shown = filtered.slice(first, first + pageSize);
      const list = get('list');
      list.replaceChildren();
      for (const row of shown) {
        const li = make('li'), a = link('', fragment(row.id));
        a.append(make('span', row.id, 'code'), make('span', row.action + ' · ' + row.authority, 'status-small'), make('span', row.current, 'list-text'));
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
      meta.append(badge(row.authority), make('strong', row.action), make('span', row.group), make('span', importance[row.priority] || row.priority), make('span', row.domain));
      if (row.kind) meta.append(make('span', row.kind));
      article.append(head, meta);
      if (row.unitCurrent && row.ruleIds?.length) {
        article.append(make('p', 'ルール全文は本人確定です。候補 ' + row.id + ' の判断状況：' + row.authority + '。', 'unit-note'));
        article.append(pair(row.unitCurrent, row.proposed, '現行のルール全文', '本人確定のルール全文'));
        const excerpt = make('section', undefined, 'unit-source');
        excerpt.append(make('h3', row.id + ' の元の現行表記'), make('p', row.current));
        if (row.approvedExcerpt) excerpt.append(make('h3', '確定したルール全文の対応箇所'), make('p', row.approvedExcerpt));
        article.append(excerpt);
      } else {
        const right = row.authority === '本人確定' ? '本人確定の表記' : '最終推奨の表記';
        article.append(pair(row.current, row.proposed, '現行の表記', right));
      }
      article.append(notes([
        ['今回の判断', row.decisionNote], ['判断の理由', row.reason], ['適用単位', row.unit],
        ['懸念点', row.risk], ['実装前の確認', row.verify], ['保留・確認条件', row.hold],
        ['対応ID・文脈キー', row.subjectIds], ['現行ソースとの照合', row.literalSummary], ['他の画面・共通の表記', row.shared],
        ['V3までの承認記録', row.approved]
      ]));
      const sources = Array.isArray(row.sources) ? row.sources : [];
      if (sources.length) article.append(details('使用箇所・出典（' + sources.length + '）', sourceList(sources)));
      if (Array.isArray(row.ruleIds) && row.ruleIds.length) {
        const ruleLinks = make('p', undefined, 'rule-refs');
        ruleLinks.append(make('strong', '対応するルール説明'));
        for (const id of row.ruleIds) ruleLinks.append(link(id, 'rules.html' + fragment(id)));
        article.append(ruleLinks);
      }
      const historyNotes = notes([['V1の判断', row.v1], ['V2の判断', row.v2], ['V2の比較案', row.v2Proposed], ['V3の区分', row.v3Final], ['V3の比較案', row.v3Proposed], ['V3当時の理由', row.v3Reason], ['V3案で想定した影響', row.impact], ['V3での論点', row.problem], ['V3で確認した条件', row.condition], ['参照資料', row.references]]);
      if (/^J\d+$/.test(row.id)) {
        const dd = make('dd');
        dd.append(link('この候補をV3で見る', '../v3/' + fragment(row.id)));
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
      for (const shortcut of document.querySelectorAll('[data-preset]')) {
        shortcut.setAttribute('aria-current', shortcut.dataset.preset === currentPreset() ? 'true' : 'false');
      }
      get('verify-preset').setAttribute('aria-current', get('authority').value === authorities.check ? 'true' : 'false');
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
      if (id === 'filters' && filtered) return;
      const params = new URL(location.href).searchParams;
      get('group').value = groups[params.get('group')] || '';
      get('authority').value = authorities[params.get('authority')] || '';
      filtered = findRows();
      if (idMap.has(id) && !filtered.some(row => row.id === id)) {
        clearFilters();
        filtered = findRows();
      }
      selectInFilter(id);
      render();
      if (id && idMap.has(id)) get('detail').focus();
    }
    for (const key of dropdowns) get(key).addEventListener('change', refresh);
    get('search').addEventListener('input', refresh);
    get('reset').addEventListener('click', () => { clearFilters(); refresh(); get('search').focus(); });
    for (const [id, step] of [['prev', -1], ['next', 1]]) get(id).onclick = () => {
      page += step;
      showList();
      get('list').querySelector('a')?.focus();
    };
    window.addEventListener('hashchange', route);
    route();
  }

  const rules = document.body.dataset.view === 'rules';
  const ready = rules
    ? Promise.all([load('rules.json'), load('review.json')]).then(([items, review]) => renderRules(items, review))
    : load('review.json').then(startReview);
  ready.then(() => {
    get('loading').hidden = true;
  }).catch(() => {
    get('loading').textContent = '資料を読み込めませんでした。ページを再読み込みしてください。';
    get('loading').hidden = false;
  });
})();
