
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const email = 'admin@crm.fr';
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.update({
        where: { email },
        data: { password: hashedPassword }
    });

    console.log('Admin password reset to:', password);
    console.log('User:', user.email);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
