import bcrypt from 'bcrypt';

const COST = 10;

export const bcryptHasher = {
  hash: (plain) => bcrypt.hash(plain, COST),
  verify: (plain, hash) => bcrypt.compare(plain, hash),
};
