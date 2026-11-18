import { readFileSync, writeFileSync } from 'node:fs';

// npm version has already updated package.json and the lockfile at this point.
const root = new URL('../', import.meta.url);
const manifestPath = new URL('app.json', root);
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const { version } = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'));
const stable = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
function versionParts(value) {
  if (typeof value !== 'string' || !stable.test(value)) throw new Error('Use a stable major.minor.patch release version.');
  const parts = value.split('.').map(Number);
  if (!parts.every(Number.isSafeInteger)) throw new Error('Version number exceeds the supported range.');
  return parts;
}
const previous = versionParts(manifest.expo.version);
const next = versionParts(version);
const changed = next.findIndex((value, index) => value !== previous[index]);
if (changed < 0 || next[changed] < previous[changed]) throw new Error('The new release version must be higher than the current app version.');
const code = manifest.expo.android.versionCode;
if (!Number.isInteger(code) || code < 1 || code >= 2100000000) throw new Error('Cannot increment the current Android versionCode.');
manifest.expo.version = version;
manifest.expo.android.versionCode = code + 1;
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
