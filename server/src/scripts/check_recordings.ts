
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const callsWithRecording = await prisma.call.findMany({
        where: { recordingPath: { not: null } },
        take: 5
    });
    const totalCalls = await prisma.call.count();
    const callsWithUrl = await prisma.call.count({ where: { recordingUrl: { not: null } } });

    console.log('Total calls:', totalCalls);
    console.log('Calls with recording URL (from Aircall):', callsWithUrl);
    console.log('Calls with downloaded recording path:', callsWithRecording.length);
    if (callsWithRecording.length > 0) {
        console.log('Sample recording:', callsWithRecording[0]);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
