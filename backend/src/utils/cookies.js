// Reads a Cookie header ("a=1; b=2") into an object. Sockets get the raw header, not the
// parsed cookies Express provides.
export function parseCookieHeader(header = '') {
  return Object.fromEntries(
    header
      .split(';')
      .map((pair) => pair.trim())
      .filter(Boolean)
      .map((pair) => {
        const at = pair.indexOf('=');
        return at === -1 ? [pair, ''] : [pair.slice(0, at), decodeURIComponent(pair.slice(at + 1))];
      }),
  );
}
