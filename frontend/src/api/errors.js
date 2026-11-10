// Turns an axios error into the server's `{ error }` text, with safe fallbacks.
export function errorMessage(err, fallback = 'Something went wrong. Please try again.') {
  const fromServer = err?.response?.data?.error;
  if (fromServer) return fromServer;
  if (err?.response === undefined && err?.request) return 'Cannot reach the server.';
  return fallback;
}
