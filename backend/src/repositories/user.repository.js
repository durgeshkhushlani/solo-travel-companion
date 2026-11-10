import { Prisma } from '@prisma/client';
import { prisma } from '../config/db.js';
import { DomainError, ErrorCode } from '../domain/errors.js';

const UNIQUE_VIOLATION = 'P2002';

export const userRepository = {
  findByEmail: (email) => prisma.user.findUnique({ where: { email } }),

  findById: (id) => prisma.user.findUnique({ where: { id } }),

  // Two sign-ups racing for one email pass the service's check; the unique index decides.
  async create(data) {
    try {
      return await prisma.user.create({ data });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === UNIQUE_VIOLATION) {
        throw new DomainError(ErrorCode.EMAIL_TAKEN, 'That email is already registered', 409);
      }
      throw err;
    }
  },
};
