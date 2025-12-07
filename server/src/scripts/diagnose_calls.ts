/**
 * Script pour diagnostiquer les appels d'un contact
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // Contact concerné
    const contactId = '74f5053f-644b-4490-ab9e-5d2665143d6f';

    console.log('='.repeat(60));
    console.log('DIAGNOSTIC DES APPELS');
    console.log('='.repeat(60));

    // Récupérer tous les appels de ce contact
    const calls = await prisma.call.findMany({
        where: { contactId },
        orderBy: { calledAt: 'desc' },
        include: {
            user: { select: { name: true } }
        }
    });

    console.log(`\nNombre d'appels pour ce contact: ${calls.length}\n`);

    for (const call of calls) {
        console.log('-'.repeat(50));
        console.log(`ID: ${call.id}`);
        console.log(`AircallId: ${call.aircallId || 'AUCUN (appel manuel)'}`);
        console.log(`Date: ${call.calledAt}`);
        console.log(`Outcome: ${call.outcome}`);
        console.log(`RecordingPath: ${call.recordingPath || 'AUCUN'}`);
        console.log(`RecordingStatus: ${call.recordingStatus || 'N/A'}`);
        console.log(`Agent: ${call.user?.name || 'Inconnu'}`);
    }

    console.log('\n' + '='.repeat(60));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
