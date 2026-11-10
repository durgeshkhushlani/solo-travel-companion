// In-memory stand-ins for the ports. Fakes: working but simplified implementations.
export function createFakeUsers(seed = []) {
  const rows = [...seed];
  return {
    rows,
    async findByEmail(email) {
      return rows.find((u) => u.email === email) ?? null;
    },
    async create({ name, email, passwordHash }) {
      const user = {
        id: `user-${rows.length + 1}`,
        name,
        email,
        passwordHash,
        role: 'USER',
        active: true,
        interests: [],
      };
      rows.push(user);
      return user;
    },
  };
}

// Reversing the text is enough to tell a hash from the password in a test.
export const fakeHasher = {
  async hash(plain) {
    return `hashed:${[...plain].reverse().join('')}`;
  },
  async verify(plain, hash) {
    return hash === (await fakeHasher.hash(plain));
  },
};
