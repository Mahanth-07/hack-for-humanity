import { Octokit } from '@octokit/rest';
import * as fs from 'fs';
import * as path from 'path';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? 'depl ' + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) throw new Error('X-Replit-Token not found');

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X-Replit-Token': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;
  if (!connectionSettings || !accessToken) throw new Error('GitHub not connected');
  return accessToken;
}

async function getOctokit() {
  const token = await getAccessToken();
  return new Octokit({ auth: token });
}

function getAllFiles(dir: string, base: string = ''): { path: string; fullPath: string }[] {
  const results: { path: string; fullPath: string }[] = [];
  const skipDirs = ['node_modules', '.git', '.local', 'dist', '.cache', '.config', '.upm', 'generated'];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skipDirs.includes(entry.name)) continue;
    if (entry.name.startsWith('.') && entry.name !== '.replit') continue;

    const rel = base ? `${base}/${entry.name}` : entry.name;
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      results.push(...getAllFiles(full, rel));
    } else {
      results.push({ path: rel, fullPath: full });
    }
  }
  return results;
}

async function main() {
  const octokit = await getOctokit();

  const { data: user } = await octokit.users.getAuthenticated();
  console.log('Authenticated as:', user.login);

  const { data: repos } = await octokit.repos.listForAuthenticatedUser({ per_page: 100, sort: 'updated' });
  let hackRepo = repos.find(r => r.name.toLowerCase().includes('hack-for-humanity') || r.name.toLowerCase().includes('hackforhumanity'));

  if (!hackRepo) {
    const allRepos = repos.filter(r => r.name.toLowerCase().includes('hack') || r.full_name.toLowerCase().includes('humanity'));
    console.log('Possible matches:', allRepos.map(r => r.full_name));

    const { data: orgs } = await octokit.orgs.listForAuthenticatedUser();
    for (const org of orgs) {
      const { data: orgRepos } = await octokit.repos.listForOrg({ org: org.login, per_page: 100 });
      const match = orgRepos.find(r => r.name.toLowerCase().includes('hack'));
      if (match) {
        hackRepo = match as any;
        console.log('Found in org:', match.full_name);
        break;
      }
    }
  }

  if (!hackRepo) {
    console.log('All repos:', repos.map(r => r.full_name).join('\n'));
    console.error('Could not find hack-for-humanity repository.');
    process.exit(1);
  }

  const owner = hackRepo.owner.login;
  const repo = hackRepo.name;
  const defaultBranch = hackRepo.default_branch || 'main';
  console.log(`Target: ${owner}/${repo} (branch: ${defaultBranch})`);

  let isEmpty = false;
  let latestCommitSha: string | undefined;
  try {
    const { data: ref } = await octokit.git.getRef({ owner, repo, ref: `heads/${defaultBranch}` });
    latestCommitSha = ref.object.sha;
    console.log(`Branch exists at ${latestCommitSha}`);
  } catch {
    isEmpty = true;
    console.log('Repository is empty, will initialize with Contents API first');
  }

  if (isEmpty) {
    console.log('Initializing repo with README...');
    await octokit.repos.createOrUpdateFileContents({
      owner, repo,
      path: 'README.md',
      message: 'Initial commit',
      content: Buffer.from('# AI Incident Response Command Center\n\nReal-time emergency management dashboard with camera feeds, incident mapping, contact management, and automated alerting.\n').toString('base64'),
    });

    const { data: ref } = await octokit.git.getRef({ owner, repo, ref: `heads/${defaultBranch}` });
    latestCommitSha = ref.object.sha;
    console.log(`Repo initialized at ${latestCommitSha}`);
  }

  const projectDir = process.cwd();
  const files = getAllFiles(projectDir);
  console.log(`Found ${files.length} files to push`);

  const BATCH_SIZE = 5;
  const blobs: { path: string; sha: string; mode: '100644'; type: 'blob' }[] = [];

  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (file) => {
        try {
          const content = fs.readFileSync(file.fullPath);
          const { data: blob } = await octokit.git.createBlob({
            owner, repo,
            content: content.toString('base64'),
            encoding: 'base64',
          });
          return { path: file.path, sha: blob.sha, mode: '100644' as const, type: 'blob' as const };
        } catch (err: any) {
          console.warn(`  Skip ${file.path}: ${err.message?.substring(0, 60)}`);
          return null;
        }
      })
    );
    for (const r of results) {
      if (r) blobs.push(r);
    }
    console.log(`  Blobs: ${blobs.length}/${files.length}`);
  }

  console.log(`Created ${blobs.length} blobs total`);

  let baseTreeSha: string | undefined;
  if (latestCommitSha) {
    const { data: latestCommit } = await octokit.git.getCommit({ owner, repo, commit_sha: latestCommitSha });
    baseTreeSha = latestCommit.tree.sha;
  }

  const { data: tree } = await octokit.git.createTree({
    owner, repo,
    tree: blobs,
    ...(baseTreeSha ? { base_tree: baseTreeSha } : {}),
  });
  console.log('Created tree:', tree.sha);

  const { data: commit } = await octokit.git.createCommit({
    owner, repo,
    message: 'AI Incident Response Command Center - Full Dashboard + WebSpatial Map\n\nFeatures:\n- 4 camera feed cards with MP4 drag-and-drop upload and video preview\n- Interactive SVG US map with gray camera pins and red severity-coded incident pins\n- WebSpatial 3D state pop-out on click (with 2D overlay fallback)\n- Live incident feed panel with real-time WebSocket updates\n- Contact database with full CRUD operations\n- Robocaller console terminal\n- Dark command-center theme\n- 20 camera feeds and 10 incidents seeded across US states',
    tree: tree.sha,
    parents: [latestCommitSha!],
  });
  console.log('Created commit:', commit.sha);

  await octokit.git.updateRef({ owner, repo, ref: `heads/${defaultBranch}`, sha: commit.sha });
  console.log(`\n✅ Successfully pushed to ${owner}/${repo}`);
  console.log(`View at: https://github.com/${owner}/${repo}`);
}

main().catch(err => { console.error('Error:', err.message); process.exit(1); });
