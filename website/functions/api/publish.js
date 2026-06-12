/* ÉLOW portfolio publish endpoint — Cloudflare Pages Function.

   POST /api/publish
   Body (JSON): {
     password: string,
     title:    string,
     setor:    string,
     cat:      'identidade-visual' | 'naming' | 'redesign-de-marca',
     cover:    base64 webp,
     gallery:  [base64 webp, ...]   (1–14 images)
   }

   Commits the images + portfolio-data.js update to GitHub in a single
   commit on main (Git Data API), which triggers the Cloudflare Pages deploy.
   Images arrive already converted to WebP by the /admin page in the browser.

   Required variables (Cloudflare Pages → Settings → Variables and Secrets):
     ADMIN_PASSWORD — shared password for the /admin page
     GITHUB_TOKEN   — fine-grained PAT, Contents read+write on the repo below
   Optional:
     PORTAL_BRANCH  — target branch for commits (defaults to main; used for testing)
*/

const REPO = 'vyager-digital/elow-estudio-design';
const DATA_PATH = 'website/assets/data/portfolio-data.js';
const IMAGES_DIR = 'website/assets/images';
const API = 'https://api.github.com';

const CATS = ['identidade-visual', 'naming', 'redesign-de-marca'];
const MAX_GALLERY = 14;
const MAX_IMG_B64 = 8_500_000; // ≈6 MB binary per image
const B64_RE = /^[A-Za-z0-9+/]+={0,2}$/;

function slugify(str) {
  return str
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function json(status, obj) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function gh(env, path, init = {}) {
  return fetch(API + path, {
    ...init,
    headers: {
      'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'elow-admin-portal',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
}

async function ghJson(env, path, init) {
  const res = await gh(env, path, init);
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    throw new Error(`GitHub ${(init && init.method) || 'GET'} ${path} → ${res.status}: ${detail}`);
  }
  return res.json();
}

function b64ToUtf8(b64) {
  const bin = atob(b64.replace(/\s/g, ''));
  return new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)));
}

function escapeSingle(str) {
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

export async function onRequestGet() {
  // Temporary version marker for deploy verification
  return json(200, { version: 'probe-1' });
}

export async function onRequestPost(ctx) {
  try {
    return await handlePublish(ctx);
  } catch (err) {
    // Temporary debug wrapper — surfaces uncaught production errors
    return json(500, { error: 'DEBUG: ' + String((err && err.stack) || err).slice(0, 800) });
  }
}

async function handlePublish({ request, env }) {
  if (!env.ADMIN_PASSWORD || !env.GITHUB_TOKEN) {
    return json(500, { error: 'Servidor não configurado (variáveis de ambiente ausentes).' });
  }
  const BRANCH = env.PORTAL_BRANCH || 'main';

  let body;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'Requisição inválida.' });
  }

  if (typeof body.password !== 'string' || body.password !== env.ADMIN_PASSWORD) {
    await new Promise(r => setTimeout(r, 1500)); // slow down brute-force attempts
    return json(401, { error: 'Senha incorreta.' });
  }

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const setor = typeof body.setor === 'string' ? body.setor.trim() : '';
  const cat = body.cat;
  const cover = body.cover;
  const gallery = Array.isArray(body.gallery) ? body.gallery : [];

  if (title.length < 2 || title.length > 80) return json(400, { error: 'Nome do projeto deve ter entre 2 e 80 caracteres.' });
  if (setor.length < 2 || setor.length > 40) return json(400, { error: 'Setor deve ter entre 2 e 40 caracteres.' });
  if (!CATS.includes(cat)) return json(400, { error: 'Categoria inválida.' });
  if (typeof cover !== 'string' || !cover) return json(400, { error: 'Imagem de capa ausente.' });
  if (gallery.length < 1 || gallery.length > MAX_GALLERY) return json(400, { error: `A galeria deve ter entre 1 e ${MAX_GALLERY} imagens.` });

  for (const img of [cover, ...gallery]) {
    if (typeof img !== 'string' || !B64_RE.test(img)) return json(400, { error: 'Imagem em formato inválido.' });
    if (img.length > MAX_IMG_B64) return json(400, { error: 'Uma das imagens é grande demais (máx. 6 MB após conversão).' });
  }

  const slug = slugify(title);
  if (!slug) return json(400, { error: 'Nome do projeto inválido.' });

  const probe = body.probe | 0; // temporary debug checkpoints
  if (probe === 1) return json(200, { probe: 1, stage: 'validated' });

  try {
    if (probe === 2) {
      const r = await gh(env, `/repos/${REPO}`);
      return json(200, { probe: 2, stage: 'github reachable', status: r.status });
    }
    // Current data file — duplicate check + append target
    const dataFile = await ghJson(env, `/repos/${REPO}/contents/${DATA_PATH}?ref=${BRANCH}`);
    const dataContent = b64ToUtf8(dataFile.content);
    if (probe === 3) return json(200, { probe: 3, stage: 'data file fetched', bytes: dataContent.length });

    const existingSlugs = new Set([...dataContent.matchAll(/slug:\s*'([^']+)'/g)].map(m => m[1]));
    if (existingSlugs.has(slug)) {
      return json(409, { error: `Já existe um projeto chamado "${title}" no portfólio.` });
    }

    const coverPath = `${IMAGES_DIR}/portfolio-${slug}.webp`;
    const galleryPaths = gallery.map((_, i) => `${IMAGES_DIR}/gallery-${slug}-${String(i + 1).padStart(2, '0')}.webp`);

    const entry = `  {
    slug:    '${slug}',
    title:   '${escapeSingle(title)}',
    cat:     '${cat}',
    setor:   '${escapeSingle(setor)}',
    img:     '../assets/images/portfolio-${slug}.webp',
    gallery: [${galleryPaths.map(p => `"../assets/images/${p.split('/').pop()}"`).join(', ')}]
  },`;

    const dateStr = new Date().toISOString().slice(0, 10);
    const insertion = `\n  /* ── ADICIONADO VIA PORTAL — ${dateStr} ─────────────────── */\n${entry}\n`;
    if (!/\n\];\s*$/.test(dataContent)) {
      return json(500, { error: 'Formato inesperado em portfolio-data.js — avise o Sean.' });
    }
    const newDataContent = dataContent.replace(/\n\];\s*$/, `${insertion}\n];\n`);

    // Single commit via Git Data API: blobs → tree → commit → ref
    const ref = await ghJson(env, `/repos/${REPO}/git/ref/heads/${BRANCH}`);
    const headSha = ref.object.sha;
    const headCommit = await ghJson(env, `/repos/${REPO}/git/commits/${headSha}`);

    const treeEntries = [];

    const dataBlob = await ghJson(env, `/repos/${REPO}/git/blobs`, {
      method: 'POST',
      body: JSON.stringify({ content: newDataContent, encoding: 'utf-8' }),
    });
    treeEntries.push({ path: DATA_PATH, mode: '100644', type: 'blob', sha: dataBlob.sha });

    const imagePairs = [[coverPath, cover], ...galleryPaths.map((p, i) => [p, gallery[i]])];
    for (const [path, content] of imagePairs) {
      const blob = await ghJson(env, `/repos/${REPO}/git/blobs`, {
        method: 'POST',
        body: JSON.stringify({ content, encoding: 'base64' }),
      });
      treeEntries.push({ path, mode: '100644', type: 'blob', sha: blob.sha });
    }

    const tree = await ghJson(env, `/repos/${REPO}/git/trees`, {
      method: 'POST',
      body: JSON.stringify({ base_tree: headCommit.tree.sha, tree: treeEntries }),
    });

    const commit = await ghJson(env, `/repos/${REPO}/git/commits`, {
      method: 'POST',
      body: JSON.stringify({
        message: `Portal: adiciona "${title}" (${setor})`,
        tree: tree.sha,
        parents: [headSha],
      }),
    });

    await ghJson(env, `/repos/${REPO}/git/refs/heads/${BRANCH}`, {
      method: 'PATCH',
      body: JSON.stringify({ sha: commit.sha }),
    });

    return json(200, { ok: true, slug, images: imagePairs.length });
  } catch (err) {
    console.error('publish failed:', err.message);
    return json(502, { error: 'Falha ao publicar no GitHub. Tente novamente em alguns minutos ou avise o Sean.' });
  }
}
