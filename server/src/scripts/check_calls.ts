
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const calls = await prisma.call.findMany({
        take: 5,
        orderBy: { calledAt: 'desc' }
    });
    console.log('Recent calls:', calls);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
