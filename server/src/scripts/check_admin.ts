
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const admin = await prisma.user.findUnique({
        where: { email: 'admin@crm.fr' }
    });
    console.log('Admin user:', admin);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
