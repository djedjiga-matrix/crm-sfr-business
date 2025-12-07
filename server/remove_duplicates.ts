
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Finding duplicates...');

    // Find all phone numbers that appear more than once
    const duplicates = await prisma.contact.groupBy({
        by: ['phoneFixed'],
        having: {
            phoneFixed: {
                _count: {
                    gt: 1
                }
            }
        },
        where: {
            phoneFixed: {
                not: null
            }
        }
    });

    console.log(`Found ${duplicates.length} phone numbers with duplicates.`);

    for (const dup of duplicates) {
        if (!dup.phoneFixed) continue;

        console.log(`Processing ${dup.phoneFixed}...`);

        // Get all contacts with this phone number
        const contacts = await prisma.contact.findMany({
            where: { phoneFixed: dup.phoneFixed },
            orderBy: { createdAt: 'desc' }, // Keep the most recent one? Or oldest? Usually most recent has latest info.
            select: { id: true }
        });

        // Keep the first one, delete the rest
        const [keep, ...remove] = contacts;

        if (remove.length > 0) {
            console.log(`Keeping ${keep.id}, removing ${remove.length} duplicates.`);
            await prisma.contact.deleteMany({
                where: {
                    id: {
                        in: remove.map(c => c.id)
                    }
                }
            });
        }
    }

    console.log('Done removing duplicates.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
