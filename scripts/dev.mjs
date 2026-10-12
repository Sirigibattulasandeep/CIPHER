import { randomBytes } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import os from 'node:os';
import { syncBuiltinESMExports } from 'node:module';
import { access, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import nextEnv from '@next/env';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
nextEnv.loadEnvConfig(root);

// embedded-postgres only checks uid to reject running as Unix root. Windows
// has no uid; some restricted Node environments cannot resolve userInfo().
try { os.userInfo(); }
catch { os.userInfo = () => ({ uid: -1, gid: -1, username: '', homedir: '', shell: '' }); syncBuiltinESMExports(); }
const { default: EmbeddedPostgres } = await import('embedded-postgres');

async function writeLocalSettings(values) {
  const envPath = path.join(root, '.env.local');
  let lines = [];
  try { lines = (await readFile(envPath, 'utf8')).split(/\r?\n/); } catch { /* Create it on the first local run. */ }
  for (const [key, value] of Object.entries(values)) {
    process.env[key] = value;
    const prefix = new RegExp(`^\\s*${key}\\s*=`);
    const index = lines.findIndex(line => prefix.test(line));
    const setting = `${key}=${JSON.stringify(value)}`;
    if (index >= 0) lines[index] = setting;
    else lines.push(setting);
  }
  await writeFile(envPath, `${lines.filter(Boolean).join('\n')}\n`, 'utf8');
}

function runPrisma(...args) {
  const cliPath = path.join(root, 'node_modules', 'prisma', 'build', 'index.js');
  const result = spawnSync(process.execPath, [cliPath, ...args], { cwd: root, env: process.env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Prisma ${args.join(' ')} failed with exit code ${result.status ?? 'unknown'}.`);
}

async function prepareLocalPostgres() {
  const generated = {};
  const shouldReportLogin = !process.env.SENTRIX_LOGIN_PASSWORD || process.env.SENTRIX_LOGIN_PASSWORD === 'change-this-password';
  const dbPort = Number(process.env.SENTRIX_DB_PORT || 5432);
  const dbName = 'sentrix';
  const dbUser = 'sentrix_local';
  const dbPassword = process.env.SENTRIX_LOCAL_DB_PASSWORD || randomBytes(24).toString('base64url');
  const loginEmail = process.env.SENTRIX_LOGIN_EMAIL || 'analyst@sentrix.local';
  const loginPassword = !process.env.SENTRIX_LOGIN_PASSWORD || process.env.SENTRIX_LOGIN_PASSWORD === 'change-this-password'
    ? randomBytes(18).toString('base64url')
    : process.env.SENTRIX_LOGIN_PASSWORD;
  const sessionSecret = !process.env.SESSION_SECRET || process.env.SESSION_SECRET.startsWith('replace-with-')
    ? randomBytes(32).toString('base64url')
    : process.env.SESSION_SECRET;
  const databaseUrl = `postgresql://${dbUser}:${dbPassword}@127.0.0.1:${dbPort}/${dbName}?schema=public`;
  if (!process.env.SENTRIX_LOCAL_DB_PASSWORD) generated.SENTRIX_LOCAL_DB_PASSWORD = dbPassword;
  generated.DATABASE_URL = databaseUrl;
  generated.SENTRIX_USE_EMBEDDED_DB = 'true';
  if (!process.env.SENTRIX_LOGIN_EMAIL) generated.SENTRIX_LOGIN_EMAIL = loginEmail;
  if (loginPassword !== process.env.SENTRIX_LOGIN_PASSWORD) generated.SENTRIX_LOGIN_PASSWORD = loginPassword;
  if (sessionSecret !== process.env.SESSION_SECRET) generated.SESSION_SECRET = sessionSecret;
  await writeLocalSettings(generated);

  const databaseDir = path.join(root, 'data', 'postgres');
  const database = new EmbeddedPostgres({
    databaseDir,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    authMethod: 'scram-sha-256',
    persistent: true,
  });
  try { await access(path.join(databaseDir, 'PG_VERSION')); }
  catch { console.log('Creating the local PostgreSQL data directory…'); await database.initialise(); }
  console.log(`Starting local PostgreSQL on 127.0.0.1:${dbPort}…`);
  await database.start();

  const client = database.getPgClient('postgres', '127.0.0.1');
  await client.connect();
  try {
    const found = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (!found.rowCount) {
      await client.end();
      await database.createDatabase(dbName);
    } else {
      await client.end();
    }
  } catch (error) {
    await client.end().catch(() => undefined);
    await database.stop();
    throw error;
  }
  process.env.DATABASE_URL = databaseUrl;
  console.log('Applying database migrations and preparing demo records…');
  try {
    runPrisma('generate');
    runPrisma('migrate', 'deploy');
    runPrisma('db', 'seed');
  } catch (error) {
    await database.stop();
    throw error;
  }
  return { database, generatedLogin: shouldReportLogin ? { email: loginEmail, password: loginPassword } : null };
}

async function main() {
  let localDatabase;
  const useEmbeddedDatabase = process.env.SENTRIX_USE_EMBEDDED_DB === 'true'
    || process.env.DATABASE_URL?.startsWith('postgresql://sentrix_local:')
    || !process.env.DATABASE_URL;
  if (useEmbeddedDatabase) localDatabase = await prepareLocalPostgres();
  else runPrisma('generate');

  if (localDatabase?.generatedLogin) {
    console.log('\nLocal sign-in (also saved in .env.local):');
    console.log(`Email: ${localDatabase.generatedLogin.email}`);
    console.log(`Password: ${localDatabase.generatedLogin.password}\n`);
  }

  const nextCli = path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next');
  const next = spawn(process.execPath, [nextCli, 'dev', ...process.argv.slice(2)], { cwd: root, env: process.env, stdio: 'inherit' });
  const shutdown = signal => { if (next.exitCode === null) next.kill(signal); };
  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));

  try {
    const exitCode = await new Promise((resolve, reject) => {
      next.once('error', reject);
      next.once('close', code => resolve(code ?? 0));
    });
    process.exitCode = Number(exitCode);
  } finally {
    if (localDatabase) await localDatabase.database.stop();
  }
}

main().catch(error => {
  console.error(`\nLocal development could not start: ${error.message}`);
  console.error('If you already have PostgreSQL, set DATABASE_URL in .env.local and run npm run dev again.');
  process.exitCode = 1;
});
