
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkVisibility() {
    try {
        console.log('--- Checking Commercial Assignments ---');

        const commercials = await prisma.user.findMany({
            where: { role: 'COMMERCIAL' },
            include: {
                campaigns: true,
                assignments: { include: { campaign: true } }
            }
        });

        console.log(`Total Commercials: ${commercials.length}`);

        commercials.forEach(c => {
            console.log(`Commercial: ${c.name} (${c.id})`);
            console.log(`- Direct Campaigns: ${c.campaigns.map(cmp => cmp.name).join(', ') || 'None'}`);
            console.log(`- Assigned Campaigns: ${c.assignments.map(a => `${a.campaign.name} (Active: ${a.active})`).join(', ') || 'None'}`);
        });

        console.log('--- Checking Campaign "Nord" ---');
        const nordCampaign = await prisma.campaign.findFirst({
            where: { name: 'Nord' },
            include: {
                users: true,
                assignments: { include: { user: true } }
            }
        });

        if (nordCampaign) {
            console.log(`Campaign ID: ${nordCampaign.id}`);
            console.log(`Direct Users: ${nordCampaign.users.map(u => `${u.name} (${u.role})`).join(', ')}`);
            console.log(`Assigned Users: ${nordCampaign.assignments.map(a => `${a.user.name} (${a.user.role})`).join(', ')}`);
        } else {
            console.log('Campaign "Nord" not found.');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkVisibility();
