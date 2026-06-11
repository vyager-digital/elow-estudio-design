#!/usr/bin/env node
/* One-time: mirrors all existing portfolio projects into the Drive
   "Portfolio Uploads" folder, using the Setor/Title - Categoria/cover+gallery
   convention. Gives Élow a working example to follow and backs up all
   current portfolio images to Drive.

   Usage: node scripts/seed-portfolio-uploads.js
*/

const fs = require('fs');
const path = require('path');
const os = require('os');

const WEBSITE_DIR = path.resolve(__dirname, '..', 'website');
const DATA_FILE = path.join(WEBSITE_DIR, 'assets/data/portfolio-data.js');
const DRIVE_DIR = path.join(
  process.env.HOME,
  'Library/CloudStorage/GoogleDrive-hello@vyager.co/My Drive/Vyager Digital /Clients/Élow Estúdio/Website Assets/Portfolio Uploads'
);

const CAT_LABEL = {
  'identidade-visual': 'Identidade Visual',
  'naming': 'Naming',
  'redesign-de-marca': 'Redesign de Marca',
};

// load PORTFOLIO_DATA
const tmpFile = path.join(os.tmpdir(), 'portfolio-data-seed.js');
const code = fs.readFileSync(DATA_FILE, 'utf8').replace('const PORTFOLIO_DATA = ', 'module.exports = ');
fs.writeFileSync(tmpFile, code);
const PORTFOLIO_DATA = require(tmpFile);
fs.unlinkSync(tmpFile);

function resolveAsset(relPath) {
  return path.join(WEBSITE_DIR, relPath.replace(/^\.\.\//, ''));
}

let projectCount = 0;
let fileCount = 0;

for (const entry of PORTFOLIO_DATA) {
  const setor = entry.setor || 'Outros';
  const catLabel = CAT_LABEL[entry.cat] || 'Identidade Visual';
  const folderName = `${entry.title} - ${catLabel}`;
  const destDir = path.join(DRIVE_DIR, setor, folderName);

  fs.mkdirSync(destDir, { recursive: true });

  // cover
  const coverSrc = resolveAsset(entry.img);
  const coverExt = path.extname(coverSrc);
  fs.copyFileSync(coverSrc, path.join(destDir, `cover${coverExt}`));
  fileCount++;

  // gallery
  (entry.gallery || []).forEach((g, i) => {
    const src = resolveAsset(g);
    const ext = path.extname(src);
    const num = String(i + 1).padStart(2, '0');
    fs.copyFileSync(src, path.join(destDir, `${num}${ext}`));
    fileCount++;
  });

  projectCount++;
  console.log(`Seeded "${entry.title}" → ${setor}/${folderName}`);
}

console.log(`\n${projectCount} projects, ${fileCount} files copied to Drive.`);
