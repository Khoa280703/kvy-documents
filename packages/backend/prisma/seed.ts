import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('password123', 10);

  await prisma.user.upsert({
    where: { email: 'seller@kvy.com' },
    update: {},
    create: {
      email: 'seller@kvy.com',
      password_hash: hash,
      role: 'seller',
      name: 'Test Seller',
    },
  });

  await prisma.user.upsert({
    where: { email: 'admin@kvy.com' },
    update: {},
    create: {
      email: 'admin@kvy.com',
      password_hash: hash,
      role: 'admin',
      name: 'Test Admin',
    },
  });

  console.log('Seeded 2 users: seller@kvy.com, admin@kvy.com');
}

main().catch(console.error).finally(() => prisma.$disconnect());
