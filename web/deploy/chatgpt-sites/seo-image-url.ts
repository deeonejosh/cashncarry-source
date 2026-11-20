export function publicImageUrl(value: string, origin: string): string {
  if (!/^(https:\/\/|\/(?!\/))/i.test(value) || value.includes('\\')) return '';
  try {
    const url = new URL(value, origin);
    if (url.protocol === 'https:' && !url.username && !url.password) {
      if (url.origin === origin && /^\/(?:admin|account|api|seller|seller-centre|sign-in|login|profile)(?:\/|$)/i.test(url.pathname)) return '';
      return url.href;
    }
  } catch {
    return '';
  }
  return '';
}
