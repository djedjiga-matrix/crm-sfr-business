
import prisma from '../prisma';
import fs from 'fs';
import path from 'path';
import { Call, Contact, User, Campaign } from '@prisma/client';

// Fonction de nettoyage pour le nom de fichier
const sanitize = (str: string): string => {
    if (!str) return '';
    return str
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Enlever les accents
        .replace(/\s+/g, '_') // Remplacer espaces par _
        .replace(/[^a-zA-Z0-9_]/g, '') // Garder uniquement alphanum et _
        .substring(0, 50); // Limiter la longueur
};

export const generateRecordingName = (
    contact: Contact | null,
    call: Call,
    agent: User | null,
    campaign: Campaign | null,
    status: string
): string => {
    const companyName = contact?.companyName ? sanitize(contact.companyName) : 'Entreprise_Inconnue';
    const phone = contact?.phoneFixed ? sanitize(contact.phoneFixed) : (call.phoneNumber ? sanitize(call.phoneNumber) : 'Tel_Inconnu');
    const statusStr = sanitize(status) || 'Non_Qualifie';
    const campaignName = campaign?.name ? sanitize(campaign.name).toUpperCase() : 'CAMPAGNE_INCONNUE';
    const agentName = agent?.name ? sanitize(agent.name).toUpperCase() : 'AGENT_INCONNU';

    return `${companyName}_${phone}_${statusStr}_${campaignName}_${agentName}.mp3`;
};

export const renameRecording = async (callId: string) => {
    try {
        console.log(`[RENAMING] Starting for call ${callId}`);

        // 1. Fetch Data
        const call = await prisma.call.findUnique({
            where: { id: callId },
            include: {
                contact: { include: { campaign: true } },
                user: true
            }
        });

        if (!call) throw new Error('Call not found');
        if (!call.recordingPath) {
            console.log('[RENAMING] No recording path found, skipping.');
            return null;
        }

        // 2. Generate Name
        const newFilename = generateRecordingName(
            call.contact,
            call,
            call.user,
            call.contact?.campaign || null,
            call.outcome
        );

        console.log(`[RENAMING] New filename: ${newFilename}`);

        // 3. Rename File
        const storageDir = path.join(__dirname, '../../storage/recordings');

        // Handle relative paths stored in DB (e.g. "recordings/file.mp3")
        const currentFilename = path.basename(call.recordingPath);
        const currentPath = path.join(storageDir, currentFilename);

        const newPath = path.join(storageDir, newFilename);

        if (fs.existsSync(currentPath)) {
            // Check for duplicates
            let finalPath = newPath;
            let finalFilename = newFilename;
            let counter = 1;

            while (fs.existsSync(finalPath)) {
                const nameWithoutExt = newFilename.replace('.mp3', '');
                finalFilename = `${nameWithoutExt}_${counter}.mp3`;
                finalPath = path.join(storageDir, finalFilename);
                counter++;
            }

            // Perform Rename
            fs.renameSync(currentPath, finalPath);
            console.log(`[RENAMING] File renamed from ${currentFilename} to ${finalFilename}`);

            // 4. Update DB
            await prisma.call.update({
                where: { id: callId },
                data: {
                    recordingPath: `recordings/${finalFilename}`,
                    originalRecordingName: currentFilename,
                    renamedAt: new Date(),
                    recordingStatus: 'TREATED'
                }
            });

            return finalFilename;
        } else {
            console.warn(`[RENAMING] Source file not found at ${currentPath}`);
            return null;
        }

    } catch (error) {
        console.error('[RENAMING] Error:', error);
        throw error;
    }
};
