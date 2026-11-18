const repository = 'hizawye/manage-employees';
const assetName = 'Manage-Employees.apk';
const endpoint = `https://api.github.com/repos/${repository}/releases/latest`;
const versionPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

export function isReleaseVersion(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    versionPattern.test(value) &&
    value.split('.').every((part) => Number.isSafeInteger(Number(part)))
  );
}

export function isNewerVersion(candidate: string, installed: string): boolean {
  if (!isReleaseVersion(candidate) || !isReleaseVersion(installed))
    return false;
  const current = installed.split('.').map(Number);
  for (const [i, part] of candidate.split('.').entries()) {
    const n = Number(part);
    if (n !== current[i]) return n > current[i];
  }
  return false;
}

export function apkUrl(version: string): string {
  if (!isReleaseVersion(version)) throw new Error('Invalid release version');
  return `https://github.com/${repository}/releases/download/v${version}/${assetName}`;
}

export function publishedVersion(data: unknown): string | null {
  if (!data || typeof data !== 'object') throw new Error('Invalid release');
  const release = data as Record<string, unknown>;
  if (release.draft === true || release.prerelease === true) return null;
  const tag = release.tag_name;
  if (
    release.draft !== false ||
    release.prerelease !== false ||
    typeof tag !== 'string' ||
    !tag.startsWith('v') ||
    !isReleaseVersion(tag.slice(1))
  ) {
    throw new Error('Invalid stable release');
  }
  const version = tag.slice(1);
  const matches = Array.isArray(release.assets)
    ? release.assets.filter((a) => a && a.name === assetName)
    : [];
  if (
    matches.length !== 1 ||
    matches[0].state !== 'uploaded' ||
    !(matches[0].size > 0) ||
    matches[0].browser_download_url !== apkUrl(version)
  ) {
    throw new Error('Release APK unavailable');
  }
  return version;
}

export async function fetchPublishedVersion(): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(endpoint, {
      signal: controller.signal,
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error('Release check failed');
    return publishedVersion(await response.json());
  } finally {
    clearTimeout(timer);
  }
}
