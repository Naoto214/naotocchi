const $ = (id) => document.getElementById(id);
const regions = {
  home: 'おうち',
  forest: '森',
  river_lake: '川と湖',
  city: '街',
  countryside: '田園',
  mountain: '山',
  snow: '雪',
  sea: '海',
  jungle: 'ジャングル',
  desert: '砂漠',
  deepsea: '深海',
  star_stop: '星の停留所',
  memory_lake: '思い出の湖',
};
const arms = {
  a: 'A 現行',
  b: 'B 小道の拡張',
  c: 'C 退避場所を追加',
  d: 'D 初期配置も比較',
};
const studyLabels = {
  record: '5分試験の画面高',
  fixed: '高さ792px・従来席',
  reference: '高さ792px・V9調整席',
  matched: '高さ792px',
  'living-fixed': 'V13の10分実測・従来席',
  'living-reference': 'V13の10分実測・V9調整席',
};
const canvas = $('chart'),
  ctx = canvas.getContext('2d'),
  images = new Map();
const q = new URLSearchParams(location.search);
let art,
  living,
  patches,
  data,
  pack,
  backdrop,
  view,
  revision = 0,
  original = false;
function options(node, entries, choice) {
  node.replaceChildren(...entries.map(([k, v]) => new Option(v, k)));
  if ([...node.options].some((o) => o.value === choice)) node.value = choice;
}
function image(path) {
  if (!images.has(path))
    images.set(
      path,
      new Promise((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = () => reject(Error('原画の読み込みに失敗しました'));
        i.src = new URL('../game/' + path, location.href);
      }),
    );
  return images.get(path);
}
async function mask(text) {
  const blob = new Blob([Uint8Array.from(atob(text), (c) => c.charCodeAt(0))]);
  return new Uint8Array(
    await new Response(
      blob.stream().pipeThrough(new DecompressionStream('deflate')),
    ).arrayBuffer(),
  );
}
const inMask = (bits, i) => !!(bits[i >> 3] & (1 << (i & 7)));
const name = (k) => data?.people.find((p) => p.key === k)?.label || k;
function setupStudy(preference) {
  const forest = $('region').value === 'forest',
    count = +$('count').value;
  const list = forest
    ? count === 28
      ? ['fixed', 'reference', 'record']
      : ['matched', 'record']
    : ['record'];
  const observed = living?.[$('width').value] || {};
  if (forest && count === 28)
    for (const seats of Object.keys(observed)) list.push('living-' + seats);
  options(
    $('study'),
    list.map((k) => [k, studyLabels[k]]),
    preference,
  );
  const armsAvailable =
    forest && ($('study').value === 'record' || count === 28)
      ? Object.entries(arms)
      : [['a', arms.a]];
  const recorded = $('study').value.startsWith('living-')
    ? observed[$('study').value.slice(7)]
    : null;
  options(
    $('arm'),
    recorded
      ? recorded.map((k) => [k, k === 'd-curve' ? 'D＋曲がる道譲り' : arms[k]])
      : armsAvailable,
    $('arm').value || q.get('arm'),
  );
}
function family() {
  const region = $('region').value,
    w = +$('width').value,
    n = +$('count').value,
    mode = $('study').value,
    arm = $('arm').value;
  const base = `${region}-${w}-${n}`;
  if (mode.startsWith('living-')) return `${base}-${mode}-${arm}`;
  const tag =
    mode === 'record' ? '' : mode === 'matched' ? '-matched' : '-long-' + mode;
  let effective = arm;
  if (region !== 'forest' || mode === 'matched') effective = 'a';
  if (effective === 'd' && (w !== 375 || n !== 28)) effective = 'c';
  return base + tag + (effective === 'a' ? '' : '-' + effective);
}
function remember() {
  const params = new URLSearchParams();
  for (const id of [
    'region',
    'width',
    'count',
    'study',
    'arm',
    'phase',
    'person',
    'distance',
    'view',
    'painting',
  ])
    params.set(id, $(id).value);
  history.replaceState(null, '', '?' + params);
}
async function load() {
  const task = ++revision;
  $('status').textContent = '地形と足元を読み込んでいます。';
  const chosen = $('person').value || q.get('person') || 'companion:tanuki',
    phase = $('phase').value || q.get('phase') || 'opening';
  try {
    const response = await fetch('./map-data/' + family() + '.json');
    if (!response.ok) throw Error('この条件の記録を読み込めませんでした');
    const result = await response.json();
    const [bg, ground, added, ...allowed] = await Promise.all([
      image(art[result.region].paintings[$('painting').value]),
      mask(result.ground),
      result.added ? mask(result.added) : null,
      ...result.allowed.map(mask),
    ]);
    if (task !== revision) return;
    data = result;
    pack = { ground, allowed, added };
    backdrop = bg;
    options(
      $('phase'),
      data.frames.map((f) => [
        f.phase,
        f.phase === 'opening' ? '開幕' : Math.round(f.time) + '秒',
      ]),
      phase,
    );
    options(
      $('person'),
      data.people.map((p) => [p.key, p.label]),
      chosen,
    );
    $('status').textContent = '';
    draw();
  } catch (e) {
    if (task === revision) {
      data = null;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      $('status').textContent = e.message;
      for (const id of [
        'person-note',
        'body',
        'house',
        'alignment',
        'topology',
        'scene-note',
      ])
        $(id).replaceChildren();
    }
  }
}
function rangeLayer(flag) {
  return (
    Boolean(document.querySelector(`#layers [value="${flag}"]`)?.checked) &&
    !original
  );
}
const nfmt = (n) =>
  Number(n).toLocaleString('ja-JP', { maximumFractionDigits: 2 });
function dl(id, items) {
  $(id).replaceChildren(
    ...items.flatMap(([k, v]) => {
      const dt = document.createElement('dt'),
        dd = document.createElement('dd');
      dt.textContent = k;
      dd.textContent = v;
      return [dt, dd];
    }),
  );
}
function mark(x, y, shape, color, size) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 0.85;
  ctx.beginPath();
  if (shape === 'cross') {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.8;
    ctx.moveTo(x - size, y - size);
    ctx.lineTo(x + size, y + size);
    ctx.moveTo(x + size, y - size);
    ctx.lineTo(x - size, y + size);
    ctx.stroke();
  } else if (shape === 'diamond') {
    ctx.moveTo(x, y - size);
    ctx.lineTo(x + size, y);
    ctx.lineTo(x, y + size);
    ctx.lineTo(x - size, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}
function line(x, y, a, b, col, weight = 1) {
  ctx.strokeStyle = col;
  ctx.lineWidth = weight;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(a, b);
  ctx.stroke();
}
function raster(f, sel) {
  const tile = document.createElement('canvas');
  tile.width = data.cols;
  tile.height = data.rows;
  const cc = tile.getContext('2d'),
    im = cc.createImageData(tile.width, tile.height),
    rgba = im.data;
  const free = rangeLayer('free'),
    ground = rangeLayer('ground'),
    excluded = rangeLayer('excluded'),
    mi = data.frames[0].rows.findIndex((r) => r[0] === sel[0]);
  for (let y = 0; y < data.rows; y++)
    for (let x = 0; x < data.cols; x++) {
      const i = y * data.cols + x,
        valid = inMask(pack.ground, i),
        px = (x + 0.5) * data.step,
        py = (y + 0.5) * data.step;
      let fill = valid
        ? ground
          ? [28, 193, 128, 83]
          : null
        : excluded
          ? [33, 36, 46, 133]
          : null;
      if (ground && pack.added && inMask(pack.added, i))
        fill = [56, 219, 229, 215];
      if (
        free &&
        valid &&
        inMask(pack.allowed[mi], i) &&
        f.rows.every(
          (b) =>
            b === sel ||
            ((px - b[1]) / (sel[3] + b[3])) ** 2 +
              ((py - b[2]) / (sel[4] + b[4])) ** 2 >=
              1,
        )
      )
        fill = [69, 151, 246, 178];
      if (fill) rgba.set(fill, i * 4);
    }
  cc.putImageData(im, 0, 0);
  return tile;
}
function directions(row, k) {
  const safe = Uint8Array.from(atob(row[9][k][0]), (c) => c.charCodeAt(0)),
    terrain = Uint8Array.from(atob(row[9][k][1]), (c) => c.charCodeAt(0));
  for (let i = 0; i < 96; i++) {
    const open = inMask(safe, i),
      possible = inMask(terrain, i);
    if (
      !possible ||
      (open && !rangeLayer('rays')) ||
      (!open && !rangeLayer('closed'))
    )
      continue;
    const angle = (i * Math.PI) / 48,
      length = [3, 8, 16][k];
    const cx = row[1] + Math.cos(angle) * length,
      cy = row[2] + Math.sin(angle) * length;
    line(
      row[1],
      row[2],
      cx,
      cy,
      open ? 'rgba(0,77,47,.8)' : 'rgba(192,17,42,.57)',
      0.62,
    );
  }
}
function actualArea(box) {
  return { x: box[0], y: box[1], w: box[2], h: box[3] };
}
function fit(selected) {
  const [ox, oy] = data.origin;
  if ($('view').value === 'art') return actualArea(data.paint);
  if ($('view').value === 'local') {
    const w = 156;
    return { x: selected[1] + ox - w / 2, y: selected[2] + oy - 91, w, h: 146 };
  }
  let low = data.rows,
    high = 0;
  for (let y = 0; y < data.rows; y++)
    for (let x = 0; x < data.cols; x++) {
      if (!inMask(pack.ground, y * data.cols + x)) continue;
      low = Math.min(low, y);
      high = Math.max(high, y);
    }
  const top = Math.max(0, oy + low * data.step - 44),
    bottom = Math.min(data.height, oy + (high + 1) * data.step + 22);
  return { x: 0, y: top, w: data.width, h: Math.max(100, bottom - top) };
}
function draw() {
  if (!data) return;
  const f =
      data.frames.find((p) => p.phase === $('phase').value) || data.frames[0],
    r = f.rows.find((a) => a[0] === $('person').value) || f.rows[0],
    body = data.people.find((p) => p.key === r[0]),
    i = [3, 8, 16].indexOf(+$('distance').value);
  view = fit(r);
  const pixel = Math.min(3, Math.max(1, devicePixelRatio)),
    maxHeight = Math.max(220, innerHeight * 0.66),
    displayWidth = Math.max(
      100,
      Math.min(
        canvas.parentElement.clientWidth - 24,
        (maxHeight * view.w) / view.h,
      ),
    );
  canvas.style.width = displayWidth + 'px';
  canvas.style.height = (displayWidth * view.h) / view.w + 'px';
  canvas.width = Math.ceil(displayWidth * pixel);
  canvas.height = Math.ceil((canvas.width * view.h) / view.w);
  const z = canvas.width / view.w;
  ctx.setTransform(z, 0, 0, z, -view.x * z, -view.y * z);
  ctx.fillStyle = '#d8d6c9';
  ctx.fillRect(view.x, view.y, view.w, view.h);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(backdrop, ...data.paint);
  const [ox, oy] = data.origin;
  if (rangeLayer('excluded')) {
    ctx.beginPath();
    ctx.rect(view.x, view.y, view.w, view.h);
    ctx.rect(ox, oy, data.cols * data.step, data.rows * data.step);
    ctx.fillStyle = 'rgba(33,36,46,.52)';
    ctx.fill('evenodd');
  }
  ctx.save();
  ctx.translate(ox, oy);
  if (!original) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      raster(f, r),
      0,
      0,
      data.cols * data.step,
      data.rows * data.step,
    );
    ctx.imageSmoothingEnabled = true;
  }
  if (rangeLayer('source')) {
    ctx.save();
    ctx.translate(-ox + data.paint[0], -oy + data.paint[1]);
    ctx.setLineDash([4, 3]);
    const s = art[data.region];
    for (const [j, poly] of [
      s.ground,
      ...s.exclude,
      ...s.foreground,
    ].entries()) {
      ctx.beginPath();
      poly.forEach(([x, y], i) =>
        ctx[i ? 'lineTo' : 'moveTo'](x * data.paint[2], y * data.paint[3]),
      );
      ctx.closePath();
      ctx.lineWidth = 1.45;
      ctx.strokeStyle =
        j === 0 ? '#ffe450' : j <= s.exclude.length ? '#f07164' : '#cb81ec';
      ctx.stroke();
    }
    for (const poly of patches[data.frames[0].survey.arm] || []) {
      ctx.beginPath();
      poly.forEach(([x, y], i) =>
        ctx[i ? 'lineTo' : 'moveTo'](x * data.paint[2], y * data.paint[3]),
      );
      ctx.closePath();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(77,212,221,.35)';
      ctx.fill();
      ctx.strokeStyle = '#009a9a';
      ctx.stroke();
    }
    if (s.minZ)
      line(
        0,
        s.minZ * data.paint[3],
        data.paint[2],
        s.minZ * data.paint[3],
        '#ffe450',
        1,
      );
    ctx.restore();
  }
  if (rangeLayer('passing') && f.passing) {
    for (const p of f.passing.positions) mark(...p, 'circle', '#8a4a94', 1.5);
    for (const ex of f.passing.examples) {
      line(...ex.slice(2, 6), '#884886', 1.2);
      line(...ex.slice(6, 10), '#884886', 1.2);
    }
  }
  if (rangeLayer('topo')) {
    for (const [x, y] of data.topology.thin || [])
      mark(x, y, 'circle', '#508ac3', 1.35);
    for (const [, x, y] of data.topology.deadEndExamples)
      mark(x, y, 'cross', '#813c1e', 4.3);
    for (const [n, x, y] of data.topology.neckExamples) {
      mark(x, y, 'diamond', '#247c96', 3);
      ctx.fillStyle = '#143b44';
      ctx.font = '8px sans-serif';
      ctx.fillText(n + 'px', x + 5, y);
    }
  }
  const drawBodies = rangeLayer('ink') && f.phase === 'opening';
  document.querySelector('[value="ink"]').disabled = f.phase !== 'opening';
  if (drawBodies) {
    for (const actor of [...data.people].sort(
      (a, b) => a.foot[1] - b.foot[1],
    )) {
      const im = images.get('body/' + actor.asset);
      if (im) {
        drawSprite(ctx, actor, im, actor.rect[0] - ox, actor.rect[1] - oy);
      } else if (!images.has('pending/' + actor.asset)) {
        images.set('pending/' + actor.asset, true);
        image(actor.asset)
          .then((i) => {
            images.set('body/' + actor.asset, i);
            draw();
          })
          .catch(() => {});
      }
    }
  }
  for (const a of f.rows) {
    if (rangeLayer('contact')) {
      ctx.beginPath();
      ctx.ellipse(a[1], a[2], a[3], a[4], 0, 0, Math.PI * 2);
      ctx.fillStyle = a === r ? 'rgba(255,184,68,.2)' : 'rgba(244,170,56,.09)';
      ctx.fill();
      ctx.strokeStyle = a === r ? '#843f0b' : 'rgba(124,61,8,.83)';
      ctx.lineWidth = a === r ? 1.6 : 0.7;
      ctx.stroke();
    }
    if (rangeLayer('feet'))
      mark(
        a[1],
        a[2],
        'circle',
        a === r ? '#133c3d' : '#31433c',
        a === r ? 2.9 : 1.7,
      );
  }
  if (rangeLayer('refuge'))
    for (const p of r[8]) mark(...p, 'diamond', '#1594bf', 3.3);
  directions(r, i);
  ctx.restore();
  if (!original) {
    ctx.strokeStyle = 'rgba(255,255,255,.8)';
    ctx.setLineDash([2, 3]);
    ctx.lineWidth = 0.75;
    ctx.strokeRect(0, 0, data.width, data.height);
    ctx.setLineDash([]);
  }
  const s = f.survey;
  $('case-file').href = './map-data/' + data.id + '.json';
  const seed = data.traceName?.split('-')[1];
  const seedNote = seed ? '乱数 ' + seed + '。' : '';
  const paintingNames = {
    morning: '朝',
    day: '昼',
    evening: '夕',
    night: '夜',
  };
  const paintingNote =
    $('painting').value === 'day'
      ? '昼の原画・昼の歩行記録。'
      : paintingNames[$('painting').value] +
        'の原画に昼の足位置を重ねています。';
  const reuse =
    $('arm').value === 'd' &&
    !data.id.includes('-living-') &&
    data.id.endsWith('-c')
      ? '　Dの座席調整対象外のためCと同じ地形・足元。'
      : '';
  if (data.frames[0].phase === 'opening')
    canvas.setAttribute(
      'aria-label',
      `${regions[data.region]} ${data.width}×${data.height}、${name(r[0])}の足元と${[3, 8, 16][i]}pxの進路`,
    );
  $('scene-note').textContent =
    `${regions[data.region]}　${data.width} × ${data.height} CSS px・${data.count}体・${nfmt(f.time)}秒。${paintingNote}${seedNote}${data.id.includes('-living-') ? (data.traceVersion === 'pre-guard' ? '強化前の案の連続再生で観察した足位置を、最終判定で再検査。' : 'この案の連続再生で記録した実際の足位置。') : f.phase === 'opening' ? '' : data.id.match(/-[bc]$/) ? 'V12の同時刻の足位置を新地形に置いた比較。' : 'V12の移動記録の足位置。'}${reuse}${data.region !== 'forest' ? '　この地域ではA～Dの地形・接触・座席条件は共通です。' : ''}`;
  $('person-note').textContent =
    `${name(r[0])}　${[3, 8, 16][i]}pxの96方向中、地形・表示条件を通るのは${r[6][i]}方向。周りの住民を置くと${r[5][i]}方向。` +
    (r[7].length
      ? '現在接触する相手は' + r[7].map(name).join('、') + '。'
      : '現在の接触はありません。') +
    (r[13] == null
      ? ''
      : ` 前の観察時点の本人だけを同じ足元に置き、他者を今回の位置にした場合は8pxが${r[13]}方向。`);
  dl('body', [
    ['接触楕円（横 × 縦）', `${nfmt(2 * r[3])} × ${nfmt(2 * r[4])} px`],
    [
      '開幕の不透明な体（横 × 縦）',
      `${nfmt(body.ink[0])} × ${nfmt(body.ink[1])} px`,
    ],
    ['原画の下部15%の幅', nfmt(body.band[0]) + ' px'],
    ['地形・表示条件内の面積', nfmt(r[11]) + ' px²'],
    ['他者と重ならない面積', nfmt(r[12]) + ' px²'],
    ['確認した退避先', r[8].length + '地点'],
  ]);
  dl('house', [
    ['歩行地形', nfmt(s.terrain_px2) + ' px²'],
    ...(pack.added
      ? [
          [
            'Aとの差（増 / 減）',
            `${nfmt(s.native_gain_px2)} / ${nfmt(s.native_loss_px2)} px²`,
          ],
        ]
      : []),
    ['画面内の歩行地形', nfmt(s.screen_terrain_px2) + ' px²'],
    ['接触楕円の占有', nfmt(s.foot_union_pct) + '%'],
    ['地形面積 ÷ 人数', nfmt(s.terrain_per_resident) + ' px²'],
    ['個別に置ける面積の中央値', nfmt(s.median_individual_free_px2) + ' px²'],
    ['3 / 8 / 16px 歩ける住民', `${s.solo3} / ${s.solo8} / ${s.solo16}体`],
    ['現在の接触', s.contact_pairs + '組'],
    [
      '地形のみ / 現在のすれ違い',
      f.passing ? `${s.passing_static} / ${s.passing_clear}地点` : '対象外',
    ],
  ]);
  $('alignment').textContent =
    `画面内の歩行地形のうち、原画座標の現行ポリゴン・除外域・高さ下限の外側に ${nfmt(s.legacy_only_visible_px2)} px² あります。地形は旧投影と表示原画上の投影を合併しています。${s.additional_painted_px2 ? ' 比較案の追加ポリゴンのうち従来の原画判定外の画面内面積は' + nfmt(s.additional_painted_px2) + ' px²。' : ''}`;
  $('topology').textContent =
    `地形の連結成分 ${data.topology.components}。主領域の中心線で枝端から8px以上離れた最小幅 ${s.centreline_width_min_px ?? '—'}px。検出した首の最小幅 ${s.neck_min_px == null ? '該当なし' : s.neck_min_px + 'px'}、中心線幅の下位10%値 ${data.topology.centrelineWidthP10}px。8px以上の行き止まり ${s.dead_ends}本。`;
  remember();
  paintPair();
}
function drawSprite(c, actor, img, left, top) {
  c.save();
  c.translate(left + (actor.mirrored ? actor.rect[2] : 0), top);
  if (actor.mirrored) c.scale(-1, 1);
  c.drawImage(img, 0, 0, actor.rect[2], actor.rect[3]);
  c.restore();
}
async function paintPair() {
  if (!data || !$('pair-probe').open) return;
  const selected = $('person').value,
    peers = data.people.filter((p) => p.key !== selected),
    previous = $('peer').value;
  options(
    $('peer'),
    peers.map((p) => [p.key, p.label]),
    peers.some((p) => p.key === previous)
      ? previous
      : (peers.find((p) => p.key === 'companion:box') || peers[0])?.key,
  );
  const c = $('pair').getContext('2d');
  if (!peers.length) {
    $('pair').hidden = true;
    $('pair-note').textContent = 'この世帯の住民は1体です。';
    return;
  }
  $('pair').hidden = false;
  const a = data.people.find((p) => p.key === selected),
    b = peers.find((p) => p.key === $('peer').value),
    ra = data.frames[0].rows.find((r) => r[0] === a.key),
    rb = data.frames[0].rows.find((r) => r[0] === b.key);
  const side = $('axis').value === 'side',
    gap = side ? ra[3] + rb[3] : ra[4] + rb[4];
  const id = data.id;
  const [ia, ib] = await Promise.all([image(a.asset), image(b.asset)]);
  if (
    !data ||
    data.id !== id ||
    $('person').value !== selected ||
    $('peer').value !== b.key ||
    ($('axis').value === 'side') !== side
  )
    return;
  const centers = [
      [0, 0],
      [side ? gap : 0, side ? 0 : gap],
    ],
    items = [
      [a, ra, ia],
      [b, rb, ib],
    ];
  const minX =
      Math.min(
        ...items.map(([p, r], i) => centers[i][0] - Math.max(r[3], p.rect[2])),
      ) - 3,
    maxX =
      Math.max(
        ...items.map(([p, r], i) => centers[i][0] + Math.max(r[3], p.rect[2])),
      ) + 3;
  const minY =
      Math.min(
        ...items.map(([p, r], i) => centers[i][1] - Math.max(r[4], p.rect[3])),
      ) - 3,
    maxY = Math.max(...items.map(([p, r], i) => centers[i][1] + r[4])) + 3;
  const cw = maxX - minX,
    ch = maxY - minY,
    ratio = 2.5;
  $('pair').width = Math.ceil(cw * ratio);
  $('pair').height = Math.ceil(ch * ratio);
  $('pair').style.width = 'min(100%,280px)';
  $('pair').style.height = 'auto';
  c.setTransform(ratio, 0, 0, ratio, -minX * ratio, -minY * ratio);
  c.fillStyle = '#f2f1e6';
  c.fillRect(minX, minY, cw, ch);
  items.forEach(([p, r, img], i) => {
    const [x, y] = centers[i];
    c.beginPath();
    c.ellipse(x, y, r[3], r[4], 0, 0, Math.PI * 2);
    c.strokeStyle = i ? '#b27122' : '#187250';
    c.lineWidth = 0.75;
    c.stroke();
    drawSprite(c, p, img, x + p.rect[0] - p.foot[0], y + p.rect[1] - p.foot[1]);
    c.beginPath();
    c.arc(x, y, 1, 0, Math.PI * 2);
    c.fillStyle = '#192d28';
    c.fill();
  });
  const inkDist =
    a.inkBounds && b.inkBounds
      ? side
        ? gap + b.inkBounds[0] - a.inkBounds[2]
        : gap + b.inkBounds[1] - a.inkBounds[3]
      : null;
  $('pair-note').textContent =
    `${a.label}と${b.label}の開幕の原画サイズを、そのまま接触境界に並べた比較です。足元の間隔は${nfmt(gap)} px。` +
    (inkDist == null
      ? ''
      : `不透明な体の境界枠は${inkDist < 0 ? nfmt(-inkDist) + ' px重なります' : nfmt(inkDist) + ' px離れます'}。`);
}
$('pair-probe').ontoggle = paintPair;
$('peer').onchange = paintPair;
$('axis').onchange = paintPair;
canvas.addEventListener('click', (e) => {
  if (!data || original) return;
  const rect = canvas.getBoundingClientRect(),
    x = view.x + ((e.clientX - rect.x) * view.w) / rect.width - data.origin[0],
    y = view.y + ((e.clientY - rect.y) * view.h) / rect.height - data.origin[1],
    f = data.frames.find((p) => p.phase === $('phase').value);
  const a = f.rows
    .map((r) => [Math.hypot(r[1] - x, r[2] - y), r])
    .sort((a, b) => a[0] - b[0])[0];
  if (a[0] < Math.max(14, (16 * view.w) / rect.width)) {
    $('person').value = a[1][0];
    draw();
  }
});
$('original').onclick = () => {
  original = !original;
  $('original').setAttribute('aria-pressed', String(original));
  $('original').textContent = original ? '診断を重ねる' : '原画だけを見る';
  draw();
};
for (const key of ['region', 'width', 'count', 'study', 'arm'])
  $(key).onchange = () => {
    setupStudy($('study').value);
    load();
  };
for (const id of ['phase', 'person', 'distance', 'view', 'layers'])
  $(id).onchange = draw;
window.addEventListener('resize', () => requestAnimationFrame(draw));
try {
  [art, patches, living] = await Promise.all(
    ['art', 'patches', 'living'].map((k) =>
      fetch('./map-data/' + k + '.json').then((r) => r.json()),
    ),
  );
  options($('region'), Object.entries(regions), q.get('region') || 'forest');
  options(
    $('width'),
    [320, 375, 390, 430].map((n) => [n, n + 'px']),
    q.get('width') || '320',
  );
  options(
    $('count'),
    [1, 4, 10, 20, 28].map((n) => [n, n + '体']),
    q.get('count') || '28',
  );
  $('view').value = q.get('view') || 'stage';
  $('painting').value = ['morning', 'day', 'evening', 'night'].includes(
    q.get('painting'),
  )
    ? q.get('painting')
    : 'day';
  $('painting').onchange = load;
  $('distance').value = q.get('distance') || '8';
  setupStudy(q.get('study') || 'fixed');
  if (
    q.has('arm') &&
    [...$('arm').options].some((o) => o.value === q.get('arm'))
  )
    $('arm').value = q.get('arm');
  await load();
} catch (e) {
  $('status').textContent = '原画と測定記録の読み込みに失敗しました。';
}
