
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixAssignments() {
    try {
        console.log('--- Fixing Commercial Assignments ---');

        // 1. Find Campaign "Nord"
        const campaign = await prisma.campaign.findFirst({
            where: { name: 'Nord' }
        });

        if (!campaign) {
            console.log('Campaign "Nord" not found.');
            return;
        }

        // 2. Find Commercial "karim benouniche"
        const commercial = await prisma.user.findFirst({
            where: {
                role: 'COMMERCIAL',
                name: { contains: 'karim', mode: 'insensitive' }
            }
        });

        if (!commercial) {
            console.log('Commercial not found.');
            return;
        }

        console.log(`Assigning ${commercial.name} to ${campaign.name}...`);

        // 3. Create Assignment
        // Check if already assigned
        const existingAssignment = await prisma.userAssignment.findFirst({
            where: {
                userId: commercial.id,
                campaignId: campaign.id
            }
        });

        if (existingAssignment) {
            console.log('Already assigned (updating to active if needed).');
            await prisma.userAssignment.update({
                where: { id: existingAssignment.id },
                data: { active: true }
            });
        } else {
            await prisma.userAssignment.create({
                data: {
                    userId: commercial.id,
                    campaignId: campaign.id,
                    active: true
                }
            });
            console.log('Assignment created.');
        }

        // Also add to direct relation for legacy support/completeness
        await prisma.campaign.update({
            where: { id: campaign.id },
            data: {
                users: {
                    connect: { id: commercial.id }
                }
            }
        });
        console.log('Direct relation updated.');

        console.log('Done.');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

fixAssignments();
