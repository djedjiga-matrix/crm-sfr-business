
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const idToCheck = '4ae92334-6b52-4723-828c-0d25d72f91de'; // ID from the log
    console.log(`Checking for contact with ID: ${idToCheck}`);

    const contact = await prisma.contact.findUnique({
        where: { id: idToCheck }
    });

    if (contact) {
        console.log('Contact FOUND:', contact);
    } else {
        console.log('Contact NOT FOUND');

        // List all contacts to see what's there
        const allContacts = await prisma.contact.findMany({ select: { id: true, companyName: true } });
        console.log('Available contacts:', allContacts);
    }

    await prisma.$disconnect();
}

main();
