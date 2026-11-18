import {
  apkUrl,
  fetchPublishedVersion,
  isNewerVersion,
  isReleaseVersion,
  publishedVersion,
} from '../../src/updates/androidRelease';

const asset = {
  name: 'Manage-Employees.apk',
  state: 'uploaded',
  size: 23836,
  browser_download_url: apkUrl('1.10.2'),
};
const stable = {
  draft: false,
  prerelease: false,
  tag_name: 'v1.10.2',
  assets: [asset],
};

test('orders numeric release components and rejects invalid versions', () => {
  expect(isNewerVersion('1.10.2', '1.9.99')).toBe(true);
  expect(isNewerVersion('1.10.2', '1.10.2')).toBe(false);
  expect(isNewerVersion('1.10.2', '2.0.0')).toBe(false);
  for (const v of [
    'v1.2.3',
    '1.0.1-rc',
    '01.2.3',
    '1.0',
    '0.0.9007199254740992',
    '1.0.0/',
  ])
    expect(isReleaseVersion(v)).toBe(false);
});
test('only accepts one uploaded APK belonging to the exact tagged repository release', () => {
  expect(
    publishedVersion({ ...stable, assets: [asset, { name: 'SHA256SUMS' }] })
  ).toBe('1.10.2');
  expect(publishedVersion({ ...stable, draft: true })).toBeNull();
  expect(publishedVersion({ ...stable, prerelease: true })).toBeNull();
  for (const assets of [
    [],
    [asset, asset],
    [{ ...asset, state: 'open' }],
    [{ ...asset, size: 0 }],
    [{ ...asset, name: 'Manage-Employees-arm64.apk' }],
    [{ ...asset, browser_download_url: apkUrl('1.10.1') }],
    [
      {
        ...asset,
        browser_download_url: asset.browser_download_url + '?next=indirect',
      },
    ],
    [
      {
        ...asset,
        browser_download_url: asset.browser_download_url.replace(
          'github.com/',
          'github.com.example/'
        ),
      },
    ],
  ])
    expect(() => publishedVersion({ ...stable, assets })).toThrow();
  expect(() =>
    publishedVersion({ ...stable, tag_name: 'v1.10.2-alpha' })
  ).toThrow();
});
test('queries the stable GitHub endpoint, distinguishes no release from a service error, and times out', async () => {
  const original = global.fetch;
  const fetchMock = jest.fn();
  global.fetch = fetchMock;
  try {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => stable });
    expect(await fetchPublishedVersion()).toBe('1.10.2');
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://api.github.com/repos/hizawye/manage-employees/releases/latest'
    );
    fetchMock.mockResolvedValueOnce({ ok: false, status: 404 });
    expect(await fetchPublishedVersion()).toBeNull();
    fetchMock.mockResolvedValueOnce({ ok: false, status: 403 });
    await expect(fetchPublishedVersion()).rejects.toThrow();
    jest.useFakeTimers();
    fetchMock.mockImplementationOnce(
      (_url, options) =>
        new Promise((_resolve, reject) =>
          options.signal.addEventListener('abort', () =>
            reject(new Error('aborted'))
          )
        )
    );
    const pending = expect(fetchPublishedVersion()).rejects.toThrow('aborted');
    jest.advanceTimersByTime(10000);
    await pending;
  } finally {
    global.fetch = original;
    jest.useRealTimers();
  }
});
