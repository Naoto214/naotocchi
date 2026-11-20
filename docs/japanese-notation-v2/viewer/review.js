'use strict';

const sourceBase = 'https://github.com/Naoto214/naotocchi/blob/622dcf34cd08f2341897360d17fd2f8d0473085b/';
const byId = id => document.getElementById(id);
const fieldIds = ['domain', 'status', 'priority', 'kind', 'track', 'old', 'search'];
const pageSize = 12;
let store, filtered = [], selected = 0;

function element(tag, label, className) {
  const result = document.createElement(tag);
  if (label !== undefined) result.textContent = label;
  if (className) result.className = className;
  return result;
}

function option(parent, label, value) {
  const item = element('option', label);
  item.value = value;
  parent.append(item);
}

function sourceLink(source) {
  const match = source.match(/^([\w./-]+):([0-9]+)/);
  if (!match) return element('code', source);
  const link = element('a', source);
  link.href = sourceBase + match[1] + '#L' + match[2];
  link.target = '_blank';
  link.rel = 'noopener';
  return link;
}

function note(parent, title, text) {
  parent.append(element('dt', title), element('dd', text));
}

function pair(label, text) {
  const cell = element('section');
  cell.append(element('span', label, 'meta'), element('strong', text));
  return cell;
}

function button(label, disabled, action) {
  const result = element('button', label);
  result.type = 'button';
  result.disabled = disabled;
  result.onclick = action;
  return result;
}

function selectCandidate(index, focus) {
  if (index < 0 || index >= filtered.length) return;
  selected = index;
  const fragment = '#' + filtered[index].key;
  if (location.hash !== fragment) history.replaceState(null, '', fragment);
  render();
  if (focus) byId('detail').focus();
}

function detail(row) {
  const out = byId('detail');
  const container = element('div', undefined, 'pair');
  container.append(pair('現行表記', row.text), pair(row.status === '保留' ? '比較案（保留）' : row.status === '維持' ? '維持する表記' : '変更候補', row.proposal));
  const previous = [...new Set(row.uses.map(use => use.proposal))].join(' ／ ');
  const notes = element('dl');
  note(notes, '判断の理由', row.reason);
  note(notes, '採用時の影響', row.impact);
  for (const [label, text] of row.technical) note(notes, label, text);
  if (row.approvalNotes.length) note(notes, '同じIDで承認済みの範囲', row.approvalNotes.join(' ／ '));
  if (row.shared.length) note(notes, '同じ対象・他画面の表記', row.shared.join(' ／ '));
  const approved = [...new Set(row.uses.map(u => u.approval).filter(Boolean))];
  if (approved.length) note(notes, '既存の承認範囲', approved.join('、'));
  const historyNotes = element('details');
  historyNotes.append(element('summary', 'VERSION 1の判断と比較案'), element('p', row.v1 + '　' + previous));
  const sources = element('details');
  sources.open = true;
  sources.append(element('summary', '使用場所・出典（' + row.uses.length + '件）'));
  const entries = element('ul');
  for (const use of row.uses) {
    const line = element('li');
    line.append(element('strong', use.area + ' ／ ' + use.role), '　', sourceLink(use.source));
    if (use.id) line.append(element('div', use.id, 'meta'));
    if (use.other) line.append(element('div', use.other));
    entries.append(line);
  }
  sources.append(entries);
  const page = element('div', undefined, 'pager');
  page.append(button('前の候補', selected === 0, () => selectCandidate(selected - 1, true)),
              button('次の候補', selected + 1 === filtered.length, () => selectCandidate(selected + 1, true)));
  const direct = element('a', 'この候補へのリンク');
  direct.href = './#' + row.key;
  out.replaceChildren(element('p', row.key + '　優先度' + row.priority + '　' + row.track + '　' + row.kind, 'meta'),
    element('h2', store.domains[row.domain - 1] + '　／　' + row.status), container,
    notes, historyNotes, sources, page, direct);
}

function render() {
  const start = Math.floor(selected / pageSize) * pageSize;
  byId('count').textContent = filtered.length ? filtered.length + '件中 ' + (selected + 1) + '件目を表示' : '条件に合う候補はありません';
  byId('prevpage').disabled = start === 0;
  byId('nextpage').disabled = start + pageSize >= filtered.length;
  byId('list').replaceChildren(...filtered.slice(start, start + pageSize).map((item, pos) => {
    const li = element('li');
    const entry = button('', false, () => selectCandidate(start + pos, true));
    entry.setAttribute('aria-current', String(start + pos === selected));
    entry.append(element('span', item.key + '　' + item.priority + '　' + item.status, 'meta'),
                 element('span', item.text));
    li.append(entry);
    return li;
  }));
  if (filtered.length) detail(filtered[selected]);
  else byId('detail').replaceChildren();
}

function applyFilters(initialKey) {
  const values = Object.fromEntries(fieldIds.map(id => [id, byId(id).value]));
  const query = values.search.trim().normalize('NFKC').toLowerCase();
  filtered = store.items.filter(row =>
    (!values.domain || row.domain === Number(values.domain)) &&
    (!values.status || row.status === values.status) &&
    (!values.priority || row.priority === values.priority) &&
    (!values.kind || row.kind === values.kind) &&
    (!values.track || row.track === values.track) &&
    (!values.old || row.v1 === values.old) &&
    (!query || row.searchable.includes(query)));
  const target = filtered.findIndex(row => row.key === initialKey);
  selected = Math.max(0, target);
  if (!initialKey && location.hash) history.replaceState(null, '', location.pathname + location.search);
  render();
}

async function load() {
  const response = await fetch('review.json');
  if (!response.ok) throw Error(response.statusText);
  store = await response.json();
  for (const row of store.items) {
    row.searchable = [row.key,row.text,row.proposal,...row.shared,...row.uses.flatMap(u => [u.id,u.area,u.proposal])].join(' ').normalize('NFKC').toLowerCase();
  }
  store.items.sort((a,b) => a.priority.localeCompare(b.priority) || a.key.localeCompare(b.key));
  store.domains.forEach((name, index) => option(byId('domain'), name, String(index + 1)));
  for (const kind of new Set(store.items.map(row => row.kind).sort())) option(byId('kind'), kind, kind);
  for (const id of fieldIds) byId(id).addEventListener(id === 'search' ? 'input' : 'change', () => applyFilters());
  byId('prevpage').onclick = () => selectCandidate((Math.floor(selected / pageSize) - 1) * pageSize, false);
  byId('nextpage').onclick = () => selectCandidate((Math.floor(selected / pageSize) + 1) * pageSize, false);
  window.addEventListener('hashchange', () => {
    const key = location.hash.slice(1);
    if (store.items.some(row => row.key === key)) {
      for (const id of fieldIds) byId(id).value = '';
      applyFilters(key);
    }
  });
  applyFilters(location.hash.slice(1));
}
load().catch(() => { byId('count').textContent = '資料を読み込めませんでした。ログイン状態を確認してページを再読み込みしてください。'; });
