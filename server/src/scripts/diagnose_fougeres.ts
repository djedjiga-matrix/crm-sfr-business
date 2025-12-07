import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('='.repeat(70));
    console.log('DIAGNOSTIC - Laboratoire Fougères');
    console.log('='.repeat(70));

    // Trouver tous les contacts "Laboratoire Fougères"
    const contacts = await prisma.contact.findMany({
        where: {
            companyName: { contains: 'Fougères' }
        },
        include: {
            calls: {
                orderBy: { calledAt: 'desc' },
                include: {
                    user: { select: { name: true } }
                }
            }
        }
    });

    console.log(`\nNombre de contacts trouvés: ${contacts.length}\n`);

    for (const contact of contacts) {
        console.log('='.repeat(70));
        console.log(`Contact: ${contact.companyName}`);
        console.log(`ID: ${contact.id}`);
        console.log(`Status: ${contact.status}`);
        console.log(`Nombre d'appels: ${contact.calls.length}`);
        console.log('-'.repeat(70));

        for (const call of contact.calls) {
            console.log(`\n  📞 Appel ID: ${call.id}`);
            console.log(`     AircallId: ${call.aircallId || 'AUCUN (appel manuel)'}`);
            console.log(`     Date: ${call.calledAt}`);
            console.log(`     Outcome: ${call.outcome}`);
            console.log(`     RecordingPath: ${call.recordingPath || 'AUCUN'}`);
            console.log(`     RecordingStatus: ${call.recordingStatus || 'N/A'}`);
            console.log(`     Agent: ${call.user?.name || 'Inconnu'}`);
        }
    }

    // Vérifier les enregistrements globalement
    console.log('\n' + '='.repeat(70));
    console.log('TOUS LES ENREGISTREMENTS RÉCENTS (dernières 24h)');
    console.log('='.repeat(70));

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const recordings = await prisma.call.findMany({
        where: {
            recordingPath: { not: null },
            calledAt: { gte: yesterday }
        },
        orderBy: { calledAt: 'desc' },
        include: {
            contact: { select: { companyName: true } },
            user: { select: { name: true } }
        }
    });

    console.log(`\nNombre d'enregistrements: ${recordings.length}\n`);

    for (const rec of recordings) {
        console.log(`📼 ${rec.calledAt} - ${rec.contact?.companyName || 'Contact inconnu'}`);
        console.log(`   Outcome: ${rec.outcome} | Status: ${rec.recordingStatus}`);
        console.log(`   Path: ${rec.recordingPath}`);
        console.log('');
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
