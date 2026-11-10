// A production server with the development secret would sign Sessions anyone can forge, and
// Session cookies without Secure would travel over plain HTTP. Refuse to start instead.
export function assertProductionConfig({ nodeEnv, jwtSecretFromEnv, cookieSecure }) {
  if (nodeEnv !== 'production') return;
  const problems = [];
  if (!jwtSecretFromEnv) problems.push('JWT_SECRET must be set');
  if (!cookieSecure) problems.push('COOKIE_SECURE must be "true"');
  if (problems.length > 0) {
    throw new Error(`Unsafe production configuration: ${problems.join('; ')}`);
  }
}
