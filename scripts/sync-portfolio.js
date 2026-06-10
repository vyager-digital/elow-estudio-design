#!/usr/bin/env node
/* Syncs new portfolio projects from Élow's Drive upload folder into
   website/assets/data/portfolio-data.js + website/assets/images/.

   Drive folder structure expected:
     Portfolio Uploads/
       <Setor>/
         <Title> - <Categoria>/
           cover.(png|jpg|jpeg|webp)
           01.(png|jpg|jpeg|webp)
           02...

   Categoria must be one of: Identidade Visual, Naming, Redesign de Marca

   Usage:
     node scripts/sync-portfolio.js [--dry-run]
*/

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const DRY_RUN = process.argv.includes('--dry-run');

const DRIVE_DIR = path.join(
  process.env.HOME,
  'Library/CloudStorage/GoogleDrive-hello@vyager.co/My Drive/Vyager Digital /Clients/Élow Estúdio/Website Assets/Portfolio Uploads'
);
const WEBSITE_DIR = path.resolve(__dirname, '..', 'website');
const IMAGES_DIR = path.join(WEBSITE_DIR, 'assets/images');
const DATA_FILE = path.join(WEBSITE_DIR, 'assets/data/portfolio-data.js');

const CAT_MAP = {
  'identidade visual': 'identidade-visual',
  'identidade-visual': 'identidade-visual',
  'naming': 'naming',
  'redesign de marca': 'redesign-de-marca',
  'redesign-de-marca': 'redesign-de-marca',
};

const IMAGE_EXT = /\.(png|jpe?g|webp)$/i;

function slugify(str) {
  return str
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeCat(label) {
  const key = label.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  return CAT_MAP[key] || '';
}

function convertToWebp(srcPath, destPath) {
  if (DRY_RUN) return;
  if (srcPath.toLowerCase().endsWith('.webp')) {
    fs.copyFileSync(srcPath, destPath);
  } else {
    execFileSync('cwebp', ['-q', '80', srcPath, '-o', destPath], { stdio: 'ignore' });
  }
}

function main() {
  if (!fs.existsSync(DRIVE_DIR)) {
    console.error('Drive upload folder not found:', DRIVE_DIR);
    process.exit(1);
  }

  const dataContent = fs.readFileSync(DATA_FILE, 'utf8');
  const existingSlugs = new Set([...dataContent.matchAll(/slug:\s*'([^']+)'/g)].map(m => m[1]));

  const newEntries = [];

  const setores = fs.readdirSync(DRIVE_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory() && !d.name.startsWith('.') && !d.name.startsWith('_'));

  for (const setorDir of setores) {
    const setor = setorDir.name.trim();
    const setorPath = path.join(DRIVE_DIR, setorDir.name);

    const projects = fs.readdirSync(setorPath, { withFileTypes: true })
      .filter(d => d.isDirectory() && !d.name.startsWith('.') && !d.name.startsWith('_'));

    for (const projDir of projects) {
      const folderName = projDir.name.trim();
      const sepIdx = folderName.lastIndexOf(' - ');
      if (sepIdx === -1) {
        console.warn(`Skipping "${folderName}" — expected "Title - Categoria" format`);
        continue;
      }
      const title = folderName.slice(0, sepIdx).trim();
      const cat = normalizeCat(folderName.slice(sepIdx + 3));
      if (!cat) {
        console.warn(`Skipping "${folderName}" — unrecognized category "${folderName.slice(sepIdx + 3)}"`);
        continue;
      }

      const slug = slugify(title);
      if (existingSlugs.has(slug)) {
        console.log(`Skipping "${title}" — already in portfolio-data.js (slug: ${slug})`);
        continue;
      }

      const projPath = path.join(setorPath, projDir.name);
      const files = fs.readdirSync(projPath).filter(f => IMAGE_EXT.test(f) && !f.startsWith('.'));

      if (!files.length) {
        console.warn(`Skipping "${title}" — no images found`);
        continue;
      }

      let coverFile = files.find(f => /^cover/i.test(f));
      let galleryFiles;
      if (coverFile) {
        galleryFiles = files.filter(f => f !== coverFile).sort();
      } else {
        const sorted = [...files].sort();
        coverFile = sorted[0];
        galleryFiles = sorted.slice(1);
      }

      const coverDest = `portfolio-${slug}.webp`;
      convertToWebp(path.join(projPath, coverFile), path.join(IMAGES_DIR, coverDest));

      const galleryDest = galleryFiles.map((f, i) => {
        const destName = `gallery-${slug}-${String(i + 1).padStart(2, '0')}.webp`;
        convertToWebp(path.join(projPath, f), path.join(IMAGES_DIR, destName));
        return `../assets/images/${destName}`;
      });

      newEntries.push({ slug, title, cat, setor, img: `../assets/images/${coverDest}`, gallery: galleryDest });
      existingSlugs.add(slug);
      console.log(`${DRY_RUN ? '[dry-run] Would add' : 'Added'} "${title}" (${cat}, ${setor}) — ${galleryDest.length + 1} images`);
    }
  }

  if (!newEntries.length) {
    console.log('Nothing new to sync.');
    return;
  }

  if (DRY_RUN) {
    console.log(`\n[dry-run] ${newEntries.length} new project(s) found. Run without --dry-run to apply.`);
    return;
  }

  const block = newEntries.map(e => `  {
    slug:    '${e.slug}',
    title:   '${e.title.replace(/'/g, "\\'")}',
    cat:     '${e.cat}',
    setor:   '${e.setor.replace(/'/g, "\\'")}',
    img:     '${e.img}',
    gallery: [${e.gallery.map(g => `"${g}"`).join(', ')}]
  },`).join('\n');

  const dateStr = new Date().toISOString().slice(0, 10);
  const insertion = `\n  /* ── ADICIONADO VIA SYNC — ${dateStr} ──────────────────── */\n${block}\n`;

  const updated = dataContent.replace(/\n\];\s*$/, `${insertion}\n];\n`);
  fs.writeFileSync(DATA_FILE, updated);

  console.log(`\n${newEntries.length} new project(s) added to portfolio-data.js.`);
  console.log('Review the changes, then commit and push to deploy.');
}

main();
