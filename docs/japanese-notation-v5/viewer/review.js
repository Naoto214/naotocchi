'use strict';

(() => {
  const get = id => document.getElementById(id);
  const el = (tag, text, cls) => {
    const item = document.createElement(tag);
    if (text !== undefined) item.textContent = text;
    if (cls) item.className = cls;
    return item;
  };
  const anchor = (label, href) => {
    const a = el('a', label);
    a.href = href;
    return a;
  };
  const hash = id => '#' + encodeURIComponent(id);
  const norm = value => String(value || '').normalize('NFKC').toLocaleLowerCase('ja');
  async function read(name) {
    const response = await fetch(name);
    if (!response.ok) throw new Error('読み込みエラー');
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('形式エラー');
    return data;
  }
  function detailHead(id, prefix) {
    const head = el('div', undefined, 'entry-head');
    head.append(el('h2', prefix + id), anchor('この項目へのリンク', hash(id)));
    return head;
  }
  function pair(current, adopted, whole = false) {
    const grid = el('div', undefined, 'pair');
    for (const [name, text] of [[whole ? '現行のルール全文' : '現行の表記', current], [whole ? '採用するルール全文' : '採用表記', adopted]]) {
      const panel = el('section');
      panel.append(el('h3', name), el('p', text));
      grid.append(panel);
    }
    return grid;
  }
  function facts(pairs) {
    const list = el('dl', undefined, 'facts');
    for (const [label, value] of pairs) {
      if (value) list.append(el('dt', label), el('dd', value));
    }
    return list;
  }
  function related(label, ids, page) {
    const nav = el('nav', undefined, 'cross');
    nav.setAttribute('aria-label', label);
    nav.append(el('strong', label));
    for (const id of ids) nav.append(anchor(id, page + hash(id)));
    return nav;
  }
  function rulePage(rows) {
    for (const row of rows) {
      const section = el('article', undefined, 'rule');
      section.id = row.id;
      const meta = el('p', undefined, 'meta');
      meta.append(el('strong', row.decision), el('span', row.authority), el('span', '未実装'));
      section.append(detailHead(row.id, ''), meta, pair(row.current, row.adopted ?? row.proposed, true), facts([
        ['実装単位', row.target], ['画面・掲載箇所', row.location], ['文脈ID', row.context_id], ['理由', row.reason],
        ['出典', row.source], ['実装・テストの根拠', row.evidence]
      ]));
      if (row.j_ids?.length) section.append(related('関連する候補', row.j_ids, './'));
      get('rules').append(section);
    }
    const changed = rows.filter(row => row.decision === '訂正').length;
    get('status').textContent = '全' + rows.length + '箇所 ／ 訂正' + changed + '・現行維持' + (rows.length - changed);
    get(location.hash.slice(1))?.scrollIntoView();
  }

  function ledger(rows) {
    const byId = new Map(rows.map(row => [row.id, row]));
    const corpus = new Map(rows.map(row => [row.id, norm(Object.values(row).flat().join(' '))]));
    const fields = ['route', 'action', 'search'];
    const size = 12;
    let found = rows, selected = '', page = 0;
    for (const key of ['route', 'action']) {
      const counts = new Map();
      for (const row of rows) counts.set(row[key], (counts.get(row[key]) || 0) + 1);
      for (const [value, count] of counts) {
        const option = el('option', value + '（' + count + '）');
        option.value = value;
        get(key).append(option);
      }
    }
    function filter() {
      const words = norm(get('search').value).trim().split(/\s+/).filter(Boolean);
      return rows.filter(row =>
        (!get('route').value || row.route === get('route').value) &&
        (!get('action').value || row.action === get('action').value) &&
        words.every(term => corpus.get(row.id).includes(term))
      );
    }
    function updateUrl(method) {
      const url = new URL(location.href);
      for (const key of fields) {
        const value = get(key).value;
        if (value) url.searchParams.set(key, value);
        else url.searchParams.delete(key);
      }
      url.hash = selected ? hash(selected) : '';
      history[method](null, '', url.href);
    }
    function select(id) {
      const n = found.findIndex(row => row.id === id);
      selected = (found[n] || found[0])?.id || '';
      page = Math.max(0, Math.floor(n / size));
    }
    function choose(id) {
      if (!byId.has(id)) return;
      const prior = selected;
      select(id);
      if (prior !== selected) updateUrl('pushState');
      render();
      get('detail').focus();
    }
    function showList() {
      const start = page * size, chunk = found.slice(start, start + size);
      const list = get('list');
      list.replaceChildren();
      for (const row of chunk) {
        const a = anchor('', hash(row.id));
        if (row.id === selected) a.setAttribute('aria-current', 'true');
        a.append(el('b', row.id), el('small', row.action), el('span', row.current, 'current-short'));
        a.onclick = event => {
          if (event.button || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
          event.preventDefault();
          choose(row.id);
        };
        const li = el('li');
        li.append(a);
        list.append(li);
      }
      get('range').textContent = chunk.length ? (start + 1) + '–' + (start + chunk.length) + '件' : '';
      get('prev').disabled = page === 0;
      get('next').disabled = start + size >= found.length;
    }
    function record(row) {
      const article = get('detail');
      article.replaceChildren();
      article.hidden = !row;
      if (!row) return;
      const meta = el('p', undefined, 'meta');
      meta.append(el('strong', row.action), el('span', row.authority), el('span', row.implementation), el('span', row.domain));
      const whole = Boolean(row.unitCurrent && row.ruleIds?.length);
      article.append(detailHead(row.id, '候補 '), meta, pair(whole ? row.unitCurrent : row.current, row.adopted, whole));
      if (whole) {
        const excerpt = el('section', undefined, 'excerpt');
        excerpt.append(el('h3', row.id + ' で抽出した現行文'), el('p', row.current));
        if (row.approvedExcerpt) excerpt.append(el('h3', '確定全文の対応箇所'), el('p', row.approvedExcerpt));
        article.append(excerpt);
      }
      article.append(facts([
        ['承認経路', row.route], ['実装単位', row.unit], ['対象ID・文脈キー', row.subjectIds]
      ]));
      if (row.ruleIds?.length) article.append(related('対応するルール説明', row.ruleIds, 'rules.html'));
      const checks = el('section', undefined, 'checks');
      checks.append(el('h3', '実装時の確認'), facts([
        ['現行実装との照合', row.technical], ['関連テスト・検証', row.tests],
        ['旧ログ・保存データとの互換', row.legacy]
      ]));
      article.append(checks);
      const sources = el('details');
      const refs = Array.isArray(row.sources) ? row.sources : [];
      const list = el('ul', undefined, 'sources');
      for (const ref of refs) list.append(el('li', ref));
      sources.append(el('summary', '使用箇所・出典（' + refs.length + '）'), list);
      const previous = el('details');
      previous.append(el('summary', '承認までの履歴'), facts([
        ['V1の判断', row.v1], ['V2の判断', row.v2], ['V3の区分', row.v3Final],
        ['V4の承認状況', row.v4Authority], ['V4の比較案', row.v4Proposed],
        ['V3までの承認記録', row.approved]
      ]), anchor('この候補をV4で見る', '../v4/' + hash(row.id)));
      article.append(sources, previous);
      const nav = el('nav', undefined, 'entry-nav');
      nav.setAttribute('aria-label', '候補を移動');
      const pos = found.indexOf(row);
      for (const [label, target] of [['前の候補', found[pos - 1]], ['次の候補', found[pos + 1]]]) {
        const button = el('button', label);
        button.type = 'button';
        button.disabled = !target;
        button.onclick = () => choose(target.id);
        nav.append(button);
      }
      const back = el('button', '一覧へ');
      back.type = 'button';
      back.onclick = () => {
        page = Math.floor(pos / size);
        showList();
        get('list').querySelector('[aria-current="true"]')?.focus();
      };
      nav.append(back);
      article.append(nav);
    }
    function render() {
      get('status').textContent = found.length ? found.length + '件 ／ 全' + rows.length + '件' : '該当する候補はありません。絞り込み条件を変えてください。';
      get('browse').hidden = !found.length;
      showList();
      record(byId.get(selected));
    }
    function refresh() {
      found = filter();
      select(selected);
      updateUrl('replaceState');
      render();
    }
    function readUrl() {
      const url = new URL(location.href);
      if (url.hash === '#filter-form' && selected) return;
      for (const key of fields) get(key).value = url.searchParams.get(key) || '';
      let id = '';
      try { id = decodeURIComponent(url.hash.slice(1)); } catch { /* Fall back to the list. */ }
      found = filter();
      if (byId.has(id) && !found.some(row => row.id === id)) {
        for (const key of fields) get(key).value = '';
        found = rows;
      }
      select(id);
      render();
      if (id && byId.has(id)) get('detail').focus();
    }
    get('filter-form').onsubmit = e => e.preventDefault();
    get('search').oninput = refresh;
    for (const field of ['route', 'action']) get(field).onchange = refresh;
    get('clear').onclick = () => {
      for (const key of fields) get(key).value = '';
      refresh();
      get('search').focus();
    };
    for (const [id, step] of [['prev', -1], ['next', 1]]) get(id).onclick = () => {
      page += step;
      showList();
      get('list').querySelector('a')?.focus();
    };
    window.addEventListener('hashchange', readUrl);
    window.addEventListener('popstate', readUrl);
    readUrl();
  }
  const rules = document.body.dataset.view === 'rules';
  read(rules ? 'rules.json' : 'review.json').then(rules ? rulePage : ledger).catch(() => {
    get('status').textContent = '資料を読み込めませんでした。ページを再読み込みしてください。';
  });
})();
