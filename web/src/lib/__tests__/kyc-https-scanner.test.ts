import { afterEach, expect, it, vi } from 'vitest';
import { scanDocumentOverHttps } from '../kyc-https-scanner';

afterEach(() => vi.unstubAllGlobals());

const bytes = new Uint8Array([1, 2, 3]);
const endpoint = 'https://scanner.example.test/scan';

it.each(['clean', 'infected'] as const)('accepts only an explicit %s verdict', async (verdict) => {
  const request = vi.fn().mockResolvedValue(new Response(null, {
    status: 204, headers: { 'x-cnc-scan-verdict': verdict },
  }));
  vi.stubGlobal('fetch', request);
  await expect(scanDocumentOverHttps(bytes, endpoint, 'test-token')).resolves.toBe(verdict);
  expect(request).toHaveBeenCalledWith(new URL(endpoint), expect.objectContaining({
    method: 'POST', redirect: 'manual', body: bytes,
  }));
});

it.each([204, 302, 500])('blocks release without a valid verdict (%s)', async (status) => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status })));
  await expect(scanDocumentOverHttps(bytes, endpoint, 'test-token')).rejects.toThrow();
});

it('refuses an insecure URL without sending bytes', async () => {
  const request = vi.fn();
  vi.stubGlobal('fetch', request);
  await expect(scanDocumentOverHttps(bytes, 'http://scanner.example.test/scan', 'test-token')).rejects.toThrow();
  expect(request).not.toHaveBeenCalled();
});
