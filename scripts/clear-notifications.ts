import { prisma } from '../lib/prisma';

async function main() {
  const result = await prisma.notification.deleteMany({});
  console.log('Deleted notifications:', result.count);

  const count = await prisma.notification.count();
  console.log('Remaining notifications:', count);
}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
