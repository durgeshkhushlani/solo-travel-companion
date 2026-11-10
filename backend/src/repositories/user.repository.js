import { Prisma } from '@prisma/client';
import { DomainError, ErrorCode } from '../domain/errors.js';

const UNIQUE_VIOLATION = 'P2002';

export function makeUserRepository(db) {
  return {
    findByEmail: (email) => db.user.findUnique({ where: { email } }),

    findById: (id) => db.user.findUnique({ where: { id } }),

    update: (id, data) => db.user.update({ where: { id }, data }),

    list: () => db.user.findMany({ orderBy: { createdAt: 'asc' } }),

    // Two sign-ups racing for one email pass the service's check; the unique index decides.
    async create(data) {
      try {
        return await db.user.create({ data });
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === UNIQUE_VIOLATION) {
          throw new DomainError(ErrorCode.EMAIL_TAKEN, 'That email is already registered', 409);
        }
        throw err;
      }
    },
  };
}
