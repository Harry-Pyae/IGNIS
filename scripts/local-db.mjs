#!/usr/bin/env node
/**
 * Disposable, Supabase-compatible local database for IGNIS (Postgres 16 + PostgREST in Docker,
 * plus a tiny /rest/v1 proxy so @supabase/supabase-js works unchanged). No npm dependencies.
 *
 *   npm run db:local   start fresh (migrations + seed), write .env.disposable, keep running (Ctrl+C = stop + delete)
 *   npm run test:db    start fresh, run tests/db/* against it, tear down, exit with the test status
 *   npm run dev:local  (second terminal) the app against this database
 *
 * Emulates Supabase's roles (anon / authenticated / service_role with BYPASSRLS) and default
 * table grants, so the RLS policies in supabase/migrations are exercised exactly as on Supabase.
 * Every start is a brand-new database: nothing here can touch a real project.
 * Ports are chosen by the OS (pin the proxy with IGNIS_DB_PORT), so nothing collides.
 */
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { createHmac, randomBytes } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const NET = 'ignis-local';
const DB = 'ignis-local-db';
const REST = 'ignis-local-rest';
const PINNED_PORT = Number(process.env.IGNIS_DB_PORT) || 0;
const mode = process.argv[2] ?? 'up';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const docker = (...args) => execFileSync('docker', args, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'inherit'] });
const quiet = (...args) => spawnSync('docker', args, { stdio: 'ignore' });
const psql = (sql) =>
  execFileSync('docker', ['exec', '-i', DB, 'psql', '-q', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'postgres'], {
    input: sql,
    stdio: ['pipe', 'inherit', 'inherit'],
  });

const b64url = (v) => Buffer.from(typeof v === 'string' ? v : JSON.stringify(v)).toString('base64url');
function jwt(role, secret) {
  const head = b64url({ alg: 'HS256', typ: 'JWT' });
  const body = b64url({ role, iss: 'ignis-local', iat: Math.floor(Date.now() / 1000), exp: 4102444800 });
  return `${head}.${body}.${createHmac('sha256', secret).update(`${head}.${body}`).digest('base64url')}`;
}

const BOOTSTRAP = `
create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;
create role authenticator login password 'authenticator' noinherit;
grant anon, authenticated, service_role to authenticator;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
`;

function down() {
  quiet('rm', '-f', REST, DB);
  quiet('network', 'rm', NET);
}

async function up() {
  down();
  const secret = randomBytes(32).toString('hex');
  docker('network', 'create', NET);
  docker('run', '-d', '--name', DB, '--network', NET, '-e', 'POSTGRES_PASSWORD=postgres', 'postgres:16-alpine');

  // The image runs a temporary server during init; wait for the real one.
  for (let i = 0; ; i++) {
    const logs = spawnSync('docker', ['logs', DB], { encoding: 'utf8' });
    const ready = `${logs.stdout}${logs.stderr}`.includes('PostgreSQL init process complete');
    if (ready && spawnSync('docker', ['exec', DB, 'pg_isready', '-U', 'postgres', '-h', '127.0.0.1']).status === 0) break;
    if (i > 120) throw new Error('Postgres did not start');
    await sleep(500);
  }

  psql(BOOTSTRAP);
  const migrations = readdirSync(join(ROOT, 'supabase/migrations')).filter((f) => f.endsWith('.sql')).sort();
  for (const f of migrations) psql(readFileSync(join(ROOT, 'supabase/migrations', f), 'utf8'));
  psql(readFileSync(join(ROOT, 'supabase/seed.sql'), 'utf8'));

  docker(
    'run', '-d', '--name', REST, '--network', NET, '-p', '127.0.0.1::3000',
    '-e', `PGRST_DB_URI=postgres://authenticator:authenticator@${DB}:5432/postgres`,
    '-e', 'PGRST_DB_SCHEMAS=public',
    '-e', 'PGRST_DB_ANON_ROLE=anon',
    '-e', `PGRST_JWT_SECRET=${secret}`,
    'postgrest/postgrest:v12.2.3',
  );
  const restPort = Number(docker('port', REST, '3000/tcp').trim().split(/\r?\n/)[0].split(':').pop());

  // supabase-js calls <url>/rest/v1/...; PostgREST serves at /. Strip the prefix.
  const proxy = http.createServer((req, res) => {
    if (!req.url?.startsWith('/rest/v1')) return res.writeHead(404).end();
    const upstream = http.request(
      { host: '127.0.0.1', port: restPort, path: req.url.slice('/rest/v1'.length) || '/', method: req.method, headers: req.headers },
      (r) => {
        res.writeHead(r.statusCode ?? 502, r.headers);
        r.pipe(res);
      },
    );
    upstream.on('error', () => res.writeHead(502).end());
    req.pipe(upstream);
  });
  await new Promise((resolve, reject) => {
    proxy.once('error', (e) => reject(new Error(`Proxy could not listen: ${e.message}`)));
    proxy.listen(PINNED_PORT, '127.0.0.1', resolve);
  });
  const port = proxy.address().port;

  for (let i = 0; ; i++) {
    const ok = await fetch(`http://127.0.0.1:${port}/rest/v1/`).then((r) => r.ok, () => false);
    if (ok) break;
    if (i > 60) throw new Error('PostgREST did not start');
    await sleep(500);
  }

  const env = {
    SUPABASE_URL: `http://127.0.0.1:${port}`,
    SUPABASE_ANON_KEY: jwt('anon', secret),
    SUPABASE_SERVICE_ROLE_KEY: jwt('service_role', secret),
    CURATOR_SECRET: 'local-curator-secret',
    // Consent flag for tests/db/* (they write + delete rows). Only ever set for disposable databases.
    IGNIS_DB_TESTS: '1',
  };
  writeFileSync(
    join(ROOT, '.env.disposable'),
    `# Written by scripts/local-db.mjs — a throwaway local database. Gitignored.\n${Object.entries(env)
      .map(([k, v]) => `${k}=${v}`)
      .join('\n')}\n`,
  );
  return { proxy, port };
}

process.on('SIGINT', () => {
  down();
  process.exit(130);
});

try {
  const { proxy, port } = await up();
  console.log(`\n✓ Disposable IGNIS database ready at http://127.0.0.1:${port} (migrations + seed applied)`);
  if (mode === 'test') {
    const code = await new Promise((resolve) =>
      spawn('npx', ['vitest', 'run', '--mode', 'disposable', '--no-file-parallelism', 'tests/db'], { stdio: 'inherit', shell: true }).on('exit', resolve),
    );
    proxy.close();
    down();
    process.exit(code ?? 1);
  }
  console.log('  .env.disposable written · run `npm run dev:local` in another terminal · Ctrl+C here to stop and delete it\n');
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  down();
  process.exit(1);
}
