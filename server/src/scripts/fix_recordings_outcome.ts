import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Mapping statut contact → outcome appel
const statusToOutcomeMap: Record<string, string> = {
    'NEW': 'OTHER',
    'CALLBACK_LATER': 'CALLBACK_LATER',
    'FOLLOW_UP': 'FOLLOW_UP',
    'APPOINTMENT_TAKEN': 'APPOINTMENT_TAKEN',
    'NOT_INTERESTED': 'NOT_INTERESTED',
    'ALREADY_EQUIPPED': 'ALREADY_EQUIPPED',
    'WRONG_NUMBER': 'WRONG_NUMBER',
    'UNREACHABLE': 'UNREACHABLE',
    'NRP': 'NRP',
    'ANSWERING_MACHINE': 'ANSWERING_MACHINE',
    'ABSENT': 'ABSENT',
    'COMPETITOR': 'COMPETITOR',
    'CLOSED': 'CLOSED'
};

async function main() {
    console.log('='.repeat(70));
    console.log('FIX: Synchroniser les enregistrements avec le statut du contact');
    console.log('='.repeat(70));

    // Trouver tous les enregistrements "OTHER" dont le contact n'est plus "NEW"
    const callsToFix = await prisma.call.findMany({
        where: {
            recordingPath: { not: null },
            outcome: 'OTHER',
            contact: {
                status: { not: 'NEW' }
            }
        },
        include: {
            contact: true,
            user: { select: { name: true } }
        }
    });

    console.log(`\n📊 Nombre d'enregistrements à corriger: ${callsToFix.length}\n`);

    for (const call of callsToFix) {
        if (!call.contact) continue;

        const newOutcome = statusToOutcomeMap[call.contact.status] || 'OTHER';

        console.log(`\n🔧 Correction de l'appel ${call.id}`);
        console.log(`   Contact: ${call.contact.companyName}`);
        console.log(`   Date: ${call.calledAt}`);
        console.log(`   Ancien outcome: ${call.outcome} → Nouveau: ${newOutcome}`);
        console.log(`   RecordingPath: ${call.recordingPath}`);

        // Mettre à jour l'outcome
        await prisma.call.update({
            where: { id: call.id },
            data: {
                outcome: newOutcome as any,
                recordingStatus: 'TREATED'
            }
        });

        // Renommer le fichier
        try {
            const { renameRecording } = require('../services/recordingRenamer');
            await renameRecording(call.id);
            console.log(`   ✅ Fichier renommé avec succès`);
        } catch (error) {
            console.error(`   ⚠️ Erreur de renommage:`, error);
        }
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ Terminé !');
    console.log('='.repeat(70));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
