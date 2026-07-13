#!/usr/bin/env node
/**
 * Build public CV JSON from private main.tex + references.bib.
 * Excludes: underreview entries, 外部資金獲得実績, and other non-public tex sections.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseBibTeX, parseTexSections, toPublicationView } from '../docs/cv-parser.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const PUBLIC_TEX_SECTIONS = {
  ja: [
    { key: 'patents', aliases: ['特許'] },
    { key: 'talks', aliases: ['講演・講義等'] },
    { key: 'media', aliases: ['メディア'] },
    { key: 'awards', aliases: ['受賞等'] }
  ],
  en: [
    { key: 'patents', aliases: ['Patents', 'Patent'] },
    { key: 'talks', aliases: ['Talks and Lectures', 'Talks & Lectures', 'Talks', 'Lectures'] },
    { key: 'media', aliases: ['Media'] },
    { key: 'awards', aliases: ['Honors and Awards', 'Honors & Awards', 'Awards', 'Honors'] }
  ]
};

function sortPublications(list) {
  return list
    .sort((a, b) => (b.sortYear - a.sortYear) || a.sortName.localeCompare(b.sortName) || a.title.localeCompare(b.title))
    .map((v, i) => Object.assign(v, { num: i + 1 }));
}

export function buildPublicCv(bibSrc, texSrc, options = {}) {
  const { locale = 'ja', sourceRepo = 'RyoMurakami-MedRobo/-', ...meta } = options;
  const entries = parseBibTeX(bibSrc).filter(e => !e.keywords.includes('underreview'));
  const tex = parseTexSections(texSrc);
  const grp = (...ks) => sortPublications(
    entries
      .filter(e => ks.every(k => e.keywords.includes(k)))
      .map(toPublicationView)
  );
  const groups = {
    journalReview: grp('journal', 'review'),
    preprint: grp('journal', 'preprint'),
    confPaper: grp('conf', 'paper'),
    confPres: grp('conf', 'presentation'),
    book: grp('book')
  };
  const texSections = {};
  for (const section of (PUBLIC_TEX_SECTIONS[locale] || PUBLIC_TEX_SECTIONS.ja)) {
    const name = section.aliases.find(alias => tex.sections[alias]);
    if (name) texSections[section.key] = tex.sections[name];
  }
  return {
    generatedAt: new Date().toISOString(),
    sourceRepo,
    locale,
    ...meta,
    date: tex.date || '',
    groups,
    texSections
  };
}

function main() {
  const bibPath = process.argv[2] || path.join(root, 'docs/uploads/references.bib');
  const texPath = process.argv[3] || path.join(root, 'docs/uploads/main.tex');
  const outPath = process.argv[4] || path.join(root, 'docs/uploads/cv-public.json');

  const bibSrc = fs.readFileSync(bibPath, 'utf8');
  const texSrc = fs.readFileSync(texPath, 'utf8');
  const payload = buildPublicCv(bibSrc, texSrc, {
    sourceCommit: process.env.SOURCE_COMMIT || '',
    sourceRepo: process.env.SOURCE_REPO || 'RyoMurakami-MedRobo/-',
    locale: process.env.CV_LOCALE || 'ja'
  });

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2) + '\n');
  console.log('Wrote', outPath);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main();
}
