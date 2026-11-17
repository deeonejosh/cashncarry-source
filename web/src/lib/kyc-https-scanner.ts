export async function scanDocumentOverHttps(
  file: Uint8Array,
  endpoint: string,
  token: string,
): Promise<'clean' | 'infected'> {
  const url = new URL(endpoint);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || !token.trim()) {
    throw new Error('KYC scanner configuration is invalid');
  }

  const response = await fetch(url, {
    method: 'POST',
    body: new Uint8Array(file),
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/pdf',
      'cache-control': 'no-store',
    },
    redirect: 'manual',
    signal: AbortSignal.timeout(10000),
  });
  const verdict = response.headers.get('x-cnc-scan-verdict');
  await response.body?.cancel();
  if (response.status === 204 && (verdict === 'clean' || verdict === 'infected')) return verdict;
  throw new Error('KYC scanner did not return a verified verdict');
}
