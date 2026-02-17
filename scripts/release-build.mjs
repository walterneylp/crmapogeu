import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const META_PATH = '.build-meta.json';
const BUILD_INFO_PATH = 'src/buildInfo.ts';
const MAX_TAGS = 20;

function run(cmd, opts = {}) {
  return execSync(cmd, { stdio: 'pipe', encoding: 'utf-8', ...opts }).trim();
}

function runInherit(cmd) {
  execSync(cmd, { stdio: 'inherit' });
}

function nowStamp() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${dd}.${mm}.${yyyy}-${hh}.${mi}.${ss}`;
}

function ensureGitRepo() {
  try {
    run('git rev-parse --is-inside-work-tree');
  } catch {
    runInherit('git init -b main');
  }
}

function ensureMeta() {
  if (!existsSync(META_PATH)) {
    const initial = { major: 1, minor: 0, build: 122 };
    writeFileSync(META_PATH, `${JSON.stringify(initial, null, 2)}\n`);
    return initial;
  }

  const parsed = JSON.parse(readFileSync(META_PATH, 'utf-8'));
  return {
    major: Number(parsed.major ?? 1),
    minor: Number(parsed.minor ?? 0),
    build: Number(parsed.build ?? 0),
  };
}

function writeBuildInfo(version, buildNumber, stamp) {
  const content = [
    `export const BUILD_VERSION = '${version}';`,
    `export const BUILD_NUMBER = ${buildNumber};`,
    `export const BUILD_TIMESTAMP = '${stamp}';`,
    '',
  ].join('\n');

  writeFileSync(BUILD_INFO_PATH, content);
}

function updatePackageVersion(semver) {
  const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));
  pkg.version = semver;
  writeFileSync('package.json', `${JSON.stringify(pkg, null, 2)}\n`);
}

function pruneBuildTags() {
  let tags = [];
  try {
    const raw = run("git tag --list 'build/v*' --sort=-creatordate");
    tags = raw ? raw.split('\n').filter(Boolean) : [];
  } catch {
    tags = [];
  }

  if (tags.length <= MAX_TAGS) return;

  const toDelete = tags.slice(MAX_TAGS);
  for (const tag of toDelete) {
    runInherit(`git tag -d ${tag}`);
  }
}

function hasChanges() {
  const status = run('git status --porcelain');
  return status.length > 0;
}

function main() {
  ensureGitRepo();

  const meta = ensureMeta();
  const nextBuild = meta.build + 1;
  const semver = `${meta.major}.${meta.minor}.${nextBuild}`;
  const stamp = nowStamp();
  const fullVersion = `${semver}-${stamp}`;

  const nextMeta = { ...meta, build: nextBuild };
  writeFileSync(META_PATH, `${JSON.stringify(nextMeta, null, 2)}\n`);
  writeBuildInfo(fullVersion, nextBuild, stamp);
  updatePackageVersion(semver);

  runInherit('npm run lint');
  runInherit('npm run build');

  runInherit('git add -A');

  if (!hasChanges()) {
    console.log(`Sem alteracoes para commit. Versao atual: ${fullVersion}`);
    return;
  }

  runInherit(`git commit -m "build: ${fullVersion}"`);
  runInherit(`git tag -a build/v${semver} -m "Build ${fullVersion}"`);
  pruneBuildTags();

  console.log(`Build concluida: ${fullVersion}`);
  console.log('Se o remoto estiver configurado, execute: git push origin main --tags');
}

main();
