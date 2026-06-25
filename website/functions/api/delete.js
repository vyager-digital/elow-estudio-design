/* ÉLOW portfolio delete endpoint — Cloudflare Pages Function.

   POST /api/delete
   Body (JSON): { password: string, slug: string }

   Removes the matching entry from portfolio-data.js and commits the change
   to GitHub (Git Data API), which triggers the Cloudflare Pages deploy.
   The project's image files are intentionally left in the repo as orphans —
   harmless, and git history keeps everything so a mistaken delete is
   recoverable. Same auth/variables as publish.js (ADMIN_PASSWORD, GITHUB_TOKEN).
*/

const REPO = 'vyager-digital/elow-estudio-design';
const DATA_PATH = 'website/assets/data/portfolio-data.js';
const HTML_PATHS = ['website/portfolio.html', 'website/projeto.html'];
const API = 'https://api.github.com';

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Force returning visitors to refetch the data file after content changes.
function bumpVersion(html, version) {
  return html.replace(/(assets\/data\/portfolio-data\.js)(?:\?v=[0-9]+)?/g, `$1?v=${version}`);
}

export async function onRequestPost({ request, env }) {
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

  const slug = typeof body.slug === 'string' ? body.slug.trim() : '';
  if (!SLUG_RE.test(slug)) return json(400, { error: 'Projeto inválido.' });

  try {
    const dataFile = await ghJson(env, `/repos/${REPO}/contents/${DATA_PATH}?ref=${BRANCH}`);
    const dataContent = b64ToUtf8(dataFile.content);

    // Match the entry object containing this slug, plus an optional
    // "ADICIONADO VIA PORTAL" comment line directly above it. Entries contain
    // no nested braces, so [^{}]* is safely bounded to a single object.
    const entryRe = new RegExp(
      '\\n?[ \\t]*(?:/\\*[^\\n]*ADICIONADO VIA PORTAL[^\\n]*\\*/[ \\t]*\\n[ \\t]*)?' +
      '\\{[^{}]*slug:\\s*\'' + escapeRegex(slug) + '\'[^{}]*\\},?'
    );

    const matched = dataContent.match(entryRe);
    if (!matched) {
      return json(404, { error: 'Projeto não encontrado no portfólio.' });
    }
    const title = ((matched[0].match(/title:\s*'([^']*)'/) || [])[1] || slug)
      .replace(/\\'/g, "'").replace(/\\\\/g, '\\');
    const setor = (matched[0].match(/setor:\s*'([^']*)'/) || [])[1] || '';

    let newDataContent = dataContent.replace(entryRe, '');
    newDataContent = newDataContent.replace(/\n{3,}/g, '\n\n'); // tidy any blank-line gap

    if (newDataContent === dataContent) {
      return json(422, { error: 'Nada foi alterado — avise o Sean.' });
    }

    // Single commit via Git Data API: data file + cache-busted HTML files.
    const ref = await ghJson(env, `/repos/${REPO}/git/ref/heads/${BRANCH}`);
    const headSha = ref.object.sha;
    const headCommit = await ghJson(env, `/repos/${REPO}/git/commits/${headSha}`);

    const treeEntries = [];

    const dataBlob = await ghJson(env, `/repos/${REPO}/git/blobs`, {
      method: 'POST',
      body: JSON.stringify({ content: newDataContent, encoding: 'utf-8' }),
    });
    treeEntries.push({ path: DATA_PATH, mode: '100644', type: 'blob', sha: dataBlob.sha });

    const version = Date.now();
    for (const htmlPath of HTML_PATHS) {
      const file = await ghJson(env, `/repos/${REPO}/contents/${htmlPath}?ref=${BRANCH}`);
      const html = b64ToUtf8(file.content);
      const bumped = bumpVersion(html, version);
      if (bumped !== html) {
        const blob = await ghJson(env, `/repos/${REPO}/git/blobs`, {
          method: 'POST',
          body: JSON.stringify({ content: bumped, encoding: 'utf-8' }),
        });
        treeEntries.push({ path: htmlPath, mode: '100644', type: 'blob', sha: blob.sha });
      }
    }

    const tree = await ghJson(env, `/repos/${REPO}/git/trees`, {
      method: 'POST',
      body: JSON.stringify({ base_tree: headCommit.tree.sha, tree: treeEntries }),
    });

    const commit = await ghJson(env, `/repos/${REPO}/git/commits`, {
      method: 'POST',
      body: JSON.stringify({
        message: `Portal: remove "${title}"${setor ? ` (${setor})` : ''}`,
        tree: tree.sha,
        parents: [headSha],
      }),
    });

    await ghJson(env, `/repos/${REPO}/git/refs/heads/${BRANCH}`, {
      method: 'PATCH',
      body: JSON.stringify({ sha: commit.sha }),
    });

    return json(200, { ok: true, slug, title });
  } catch (err) {
    console.error('delete failed:', err.message);
    // 422 (not 5xx): Cloudflare replaces 502/5xx bodies with its own error page
    return json(422, { error: 'Falha ao remover no GitHub: ' + String(err.message).slice(0, 200) });
  }
}
