// cv-parser.js — main.tex (LaTeX CV) + references.bib (BibTeX) パーサ
// ホームページ側はこのモジュールを import して、CVファイルをそのまま描画する。

function braceMatch(src, openIdx) {
  let depth = 1, j = openIdx + 1;
  while (j < src.length && depth > 0) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') depth--;
    j++;
  }
  return { content: src.slice(openIdx + 1, j - 1), end: j };
}

function accent(a, c) {
  const map = {
    '"': { o: 'ö', u: 'ü', a: 'ä', e: 'ë', i: 'ï', O: 'Ö', U: 'Ü', A: 'Ä' },
    "'": { e: 'é', a: 'á', o: 'ó', u: 'ú', i: 'í', c: 'ć', y: 'ý' },
    '`': { e: 'è', a: 'à', o: 'ò', u: 'ù' },
    '^': { o: 'ô', e: 'ê', a: 'â', i: 'î' },
    '~': { n: 'ñ', a: 'ã', o: 'õ' }
  };
  return (map[a] && map[a][c]) || c;
}

export function cleanLatex(s) {
  if (!s) return '';
  let t = String(s);
  t = t.replace(/\{\\(["'`^~])([a-zA-Z])\}/g, (m, a, c) => accent(a, c));
  t = t.replace(/\\(["'`^~])\{?([a-zA-Z])\}?/g, (m, a, c) => accent(a, c));
  let prev;
  do {
    prev = t;
    t = t.replace(/\\(textbf|textit|emph|textsc|mbox|text)\{([^{}]*)\}/g, (m, cmd, inner) => inner);
  } while (t !== prev);
  t = t.replace(/\\([&#%$_])/g, (m, c) => c);
  t = t.replace(/\$([^$]*)\$/g, (m, inner) => inner);
  t = t.replace(/\\\\/g, ' ');
  t = t.replace(/\\[a-zA-Z]+\s*/g, '');
  t = t.replace(/[{}]/g, '');
  t = t.replace(/~/g, ' ');
  t = t.replace(/---/g, '—').replace(/--/g, '–');
  return t.replace(/\s+/g, ' ').trim();
}

// ---------- BibTeX ----------

export function parseBibTeX(src) {
  const entries = [];
  let i = 0;
  while (true) {
    const at = src.indexOf('@', i);
    if (at < 0) break;
    const open = src.indexOf('{', at);
    if (open < 0) break;
    const type = src.slice(at + 1, open).trim().toLowerCase();
    const r = braceMatch(src, open);
    i = r.end;
    if (type === 'comment' || type === 'string' || type === 'preamble') continue;
    const comma = r.content.indexOf(',');
    if (comma < 0) continue;
    const key = r.content.slice(0, comma).trim();
    const fields = parseBibFields(r.content.slice(comma + 1));
    const keywords = (fields.keywords || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
    entries.push({ type, key, fields, keywords });
  }
  return entries;
}

function parseBibFields(src) {
  const fields = {};
  let i = 0;
  const n = src.length;
  while (i < n) {
    while (i < n && /[\s,]/.test(src[i])) i++;
    if (i >= n) break;
    const eq = src.indexOf('=', i);
    if (eq < 0) break;
    const name = src.slice(i, eq).trim().toLowerCase();
    i = eq + 1;
    while (i < n && /\s/.test(src[i])) i++;
    let value = '';
    if (src[i] === '{') {
      const r = braceMatch(src, i);
      value = r.content;
      i = r.end;
    } else if (src[i] === '"') {
      const close = src.indexOf('"', i + 1);
      value = src.slice(i + 1, close < 0 ? n : close);
      i = close < 0 ? n : close + 1;
    } else {
      let j = i;
      while (j < n && src[j] !== ',' && src[j] !== '\n') j++;
      value = src.slice(i, j);
      i = j;
    }
    if (name) fields[name] = value.trim();
  }
  return fields;
}

export function parseAuthorList(s) {
  if (!s) return [];
  return s.split(/\s+and\s+/).map(raw => {
    const p = cleanLatex(raw);
    let first = '', last = '';
    if (p.includes(',')) {
      const seg = p.split(',');
      last = seg[0].trim();
      first = (seg[1] || '').trim();
    } else {
      const w = p.trim().split(/\s+/);
      last = w.pop() || '';
      first = w.join(' ');
    }
    return {
      display: (first ? first + ' ' : '') + last,
      me: /murakami/i.test(last) && /^r/i.test(first)
    };
  });
}

// bibエントリ → 表示用オブジェクト
export function toPublicationView(e) {
  const f = e.fields;
  const authors = parseAuthorList(f.author || '');
  const names = authors.map(a => a.display);
  const meIdx = authors.findIndex(a => a.me);
  let before = '', me = '', after = '';
  if (meIdx < 0) {
    before = names.join(', ');
  } else {
    before = names.slice(0, meIdx).join(', ') + (meIdx > 0 ? ', ' : '');
    me = names[meIdx];
    after = meIdx < names.length - 1 ? ', ' + names.slice(meIdx + 1).join(', ') : '';
  }
  const year = cleanLatex(f.year || '');
  const title = cleanLatex(f.title || '');
  const pages = cleanLatex(f.pages || '');
  let venueMain = '', venueRest = '';
  if (e.type === 'article') {
    venueMain = cleanLatex(f.journal || '');
    const vol = cleanLatex(f.volume || '');
    const num = cleanLatex(f.number || '');
    venueRest = (vol ? ', ' + vol : '') + (num ? '(' + num + ')' : '') + (pages ? ', ' + pages : '');
  } else if (e.type === 'incollection') {
    venueMain = cleanLatex(f.booktitle || '');
    venueRest = (f.publisher ? ', ' + cleanLatex(f.publisher) : '') + (pages ? ', pp. ' + pages : '');
  } else {
    venueMain = cleanLatex(f.booktitle || f.journal || '');
    venueRest = pages ? ', pp. ' + pages : '';
  }
  const href = f.url ? f.url.trim() : (f.eprint ? 'https://arxiv.org/abs/' + cleanLatex(f.eprint) : '');
  return {
    key: e.key,
    authorsBefore: before,
    authorsMe: me,
    authorsAfter: after,
    year, title, venueMain, venueRest,
    first: e.keywords.includes('first'),
    href,
    hasLink: !!href,
    sortYear: parseInt(year, 10) || 0,
    sortName: names[0] || ''
  };
}

// ---------- LaTeX (main.tex) ----------

function parseTexItem(raw) {
  const s = raw.trim();
  if (s.startsWith('\\textbf{')) {
    const r = braceMatch(s, s.indexOf('{'));
    return { bold: cleanLatex(r.content), rest: cleanLatex(s.slice(r.end)) };
  }
  return { bold: '', rest: cleanLatex(s) };
}

export function normalizeTexSectionName(name) {
  return cleanLatex(name).replace(/\s+/g, ' ').trim();
}

function parseTexDate(doc) {
  const ja = doc.match(/\$\|\$\s*([^\n]*(?:時点|\d{4}年)[^\n]*)/);
  if (ja) return cleanLatex(ja[1]);
  const footer = doc.match(/Last updated:\s*([^\n}\\]+)/i);
  if (footer) return cleanLatex(footer[1]);
  return '';
}

export function parseTexSections(src) {
  const noComments = src.split('\n').map(line => {
    let out = '';
    for (let k = 0; k < line.length; k++) {
      if (line[k] === '%' && line[k - 1] !== '\\') break;
      out += line[k];
    }
    return out;
  }).join('\n');
  const docIdx = noComments.indexOf('\\begin{document}');
  const doc = docIdx >= 0 ? noComments.slice(docIdx) : noComments;
  const date = parseTexDate(doc);
  const marks = [];
  const re = /\\(?:sub)*section\*\{([^}]*)\}/g;
  let m;
  while ((m = re.exec(doc))) marks.push({ name: m[1], start: m.index, end: re.lastIndex });
  const sections = {};
  marks.forEach((mk, idx) => {
    const chunk = doc.slice(mk.end, idx + 1 < marks.length ? marks[idx + 1].start : doc.length);
    const im = chunk.match(/\\begin\{itemize\}([\s\S]*?)\\end\{itemize\}/);
    const items = im
      ? im[1].split(/\\item\b/).map(x => x.trim()).filter(Boolean).map(parseTexItem)
      : [];
    const key = normalizeTexSectionName(mk.name);
    if (key) sections[key] = items;
  });
  return { date, sections };
}
