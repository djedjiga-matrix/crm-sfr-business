
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Testing Prisma Client...');

    // Fetch a random contact
    const contact = await prisma.contact.findFirst();

    if (!contact) {
        console.log('No contact found to update.');
        return;
    }

    console.log(`Updating contact ${contact.id}...`);

    try {
        const updated = await prisma.contact.update({
            where: { id: contact.id },
            data: {
                managerName: 'Test Manager',
                managerRole: 'Test Role',
                civility: 'Mr',
                status: 'NEW' // Ensure this enum value exists
            }
        });
        console.log('Update successful:', updated);
    } catch (error) {
        console.error('Update failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
