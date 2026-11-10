// Promotes an existing User to Admin: `npm run make-admin -- someone@example.com`.
// Accounts are always created as USER; this is the only way to get an Admin. The person
// logs in again afterwards so their Session carries the new role.
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error('Usage: npm run make-admin -- <email>');
  process.exit(1);
}

const prisma = new PrismaClient();
const { count } = await prisma.user.updateMany({ where: { email }, data: { role: 'ADMIN' } });
await prisma.$disconnect();

if (count === 0) {
  console.error(`No user with email ${email}`);
  process.exit(1);
}
console.log(`${email} is now an Admin. Log in again to pick up the role.`);
