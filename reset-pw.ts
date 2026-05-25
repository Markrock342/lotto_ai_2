import { prisma } from './src/lib/db';
import bcrypt from 'bcryptjs';

async function main() {
  const hash = await bcrypt.hash('admin1234', 10);
  await prisma.user.updateMany({
    where: { username: 'admin' },
    data: { passwordHash: hash }
  });
  console.log("Password reset successfully to: admin1234");
}
main();
