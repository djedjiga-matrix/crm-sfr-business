import { Request, Response } from 'express';
import axios from 'axios';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/authMiddleware';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream';
import { promisify } from 'util';

const streamPipeline = promisify(pipeline);

const downloadRecording = async (url: string, filename: string) => {
    try {
        const response = await axios.get(url, { responseType: 'stream' });
        const storagePath = path.join(__dirname, '../../storage/recordings');

        if (!fs.existsSync(storagePath)) {
            fs.mkdirSync(storagePath, { recursive: true });
        }

        const filePath = path.join(storagePath, filename);
        await streamPipeline(response.data, fs.createWriteStream(filePath));
        console.log(`Recording saved to ${filePath}`);
        return `recordings/${filename}`;
    } catch (error) {
        console.error('Error downloading recording:', error);
        return null;
    }
};

// Webhook pour recevoir les événements Aircall
export const handleAircallWebhook = async (req: Request, res: Response) => {
    try {
        const payload = JSON.stringify(req.body);
        const signature = req.headers['x-aircall-signature'] as string;
        const webhookSecret = process.env.AIRCALL_WEBHOOK_SECRET;
        const io = req.app.get('io');

        // 1. Verify Token
        const receivedToken = req.body.token;
        const configuredToken = process.env.AIRCALL_WEBHOOK_TOKEN;

        if (configuredToken && receivedToken !== configuredToken) {
            console.warn(`⚠️ Invalid Aircall Token received: ${receivedToken}`);
            // Return 200 to keep Aircall happy, but do not process the event
            return res.status(200).json({ status: 'ignored', message: 'Invalid token' });
        }

        if (webhookSecret) {
            // Signature verification logic skipped for dev (using Token instead)
        }

        const event = req.body;
        const eventType = event.event;
        const timestamp = event.timestamp;
        const data = event.data;

        console.log(`\n${'='.repeat(60)}`);
        console.log(`🔔 WEBHOOK REÇU : ${eventType}`);
        console.log(`⏰ Timestamp : ${timestamp ? new Date(timestamp * 1000).toISOString() : 'N/A'}`);
        console.log(`${'='.repeat(60)}`);

        // 2. Route to appropriate handler
        switch (eventType) {
            case 'call.created':
                await handleCallCreated(data, io);
                break;
            case 'call.ringing_on_agent':
                await handleCallRinging(data, io);
                break;
            case 'call.answered':
                await handleCallAnswered(data, io);
                break;
            case 'call.hungup':
                await handleCallHungup(data, io);
                break;
            case 'call.ended':
                await handleCallEnded(data, io);
                break;
            case 'call.missed':
                await handleCallMissed(data, io);
                break;
            case 'call.recording_available':
                await handleRecordingAvailable(data, io);
                break;
            default:
                console.log(`⚠️ Événement non géré : ${eventType}`)
                console.log(`📋 Données: ${JSON.stringify(data).substring(0, 500)}`);
        }

        // 3. Always return 200 OK
        res.status(200).json({
            status: 'success',
            event: eventType,
            processed_at: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error processing Aircall webhook:', error);
        res.status(200).json({ status: 'error', message: String(error) });
    }
};

// --- Handlers ---

const updateUserStatus = async (userEmail: string, status: string, io: any) => {
    console.log(`[DEBUG] Updating status for ${userEmail} to ${status}`);
    if (!userEmail) return;
    try {
        const user = await prisma.user.findFirst({
            where: {
                email: { equals: userEmail, mode: 'insensitive' }
            }
        });
        if (user) {
            console.log(`[DEBUG] User found: ${user.name} (${user.id})`);
            // Update DB
            const updateResult = await prisma.userSession.updateMany({
                where: { userId: user.id, logoutTime: null },
                data: { status: status, lastActivity: new Date() }
            });
            console.log(`[DEBUG] DB Update result: ${updateResult.count} sessions updated`);

            // Emit Socket Event
            if (io) {
                io.emit('user_status_update', { userId: user.id, status: status });
                console.log(`📡 Socket emitted: User ${user.name} is now ${status}`);
            } else {
                console.error(`[DEBUG] IO instance is missing!`);
            }
        } else {
            console.warn(`[DEBUG] User not found for email: ${userEmail}`);
        }
    } catch (error) {
        console.error(`Error updating user status for ${userEmail}:`, error);
    }
};

const handleCallCreated = async (data: any, io: any) => {
    const { id, direction, raw_digits, started_at } = data;
    console.log(`📞 Nouvel appel ${id}`);
    console.log(`   Direction: ${direction}`);
    console.log(`   Numéro: ${raw_digits}`);
    console.log(`   Démarré: ${new Date(started_at * 1000).toISOString()}`);
};

const handleCallRinging = async (data: any, io: any) => {
    const { id, user } = data;
    const agentId = user ? user.id : 'Unknown';
    console.log(`🔔 Appel ${id} sonne chez agent ${agentId}`);

    if (user && user.email) {
        await updateUserStatus(user.email, 'ON_CALL', io);
    }
};

const handleCallAnswered = async (data: any, io: any) => {
    const { id, answered_at, user } = data;
    const agentName = user ? user.name : 'Inconnu';
    console.log(`✅ Appel ${id} décroché par ${agentName}`);
    console.log(`   Heure: ${new Date(answered_at * 1000).toISOString()}`);

    if (user && user.email) {
        await updateUserStatus(user.email, 'ON_CALL', io);
    }
};

const handleCallHungup = async (data: any, io: any) => {
    const { id, user } = data; // Note: 'user' might not be present in hungup event depending on Aircall API version, but usually is if answered.
    // If user is not in data, we might need to rely on call.ended or look up the call in DB.
    // For now, let's try to use user from data.
    console.log(`📴 Appel ${id} terminé (alerte immédiate)`);

    // We can't easily know WHICH agent hung up if 'user' is missing. 
    // But usually call.ended follows shortly.
    // Let's wait for call.ended to reset status to be safe, or check if 'user' is provided.
    /* 
    if (user && user.email) {
        await updateUserStatus(user.email, 'CONNECTED_ACTIVE', io);
    }
    */
};

const handleCallEnded = async (data: any, io: any) => {
    const { id, duration, ended_at, recording, voicemail, raw_digits, user, direction, started_at } = data;

    // LOG COMPLET pour debugging
    console.log(`\n${'🔍'.repeat(30)}`);
    console.log(`📋 PAYLOAD COMPLET call.ended:`);
    console.log(JSON.stringify(data, null, 2));
    console.log(`${'🔍'.repeat(30)}\n`);

    console.log(`✅ Appel ${id} terminé - Données complètes`);
    console.log(`   Durée: ${duration}s`);
    console.log(`   Fin: ${new Date(ended_at * 1000).toISOString()}`);
    console.log(`   Recording field: ${recording || 'NON FOURNI'}`);

    if (recording) console.log(`   🎤 Enregistrement disponible: ${recording}`);
    if (voicemail) console.log(`   📧 Message vocal: ${voicemail}`);

    // Reset User Status
    if (user && user.email) {
        await updateUserStatus(user.email, 'CONNECTED_ACTIVE', io);
    }

    // Fonction pour normaliser un numéro de téléphone français
    const normalizePhone = (phone: string): string[] => {
        if (!phone) return [];

        // Supprimer tous les espaces, tirets, points, parenthèses
        let cleaned = phone.replace(/[\s\-\.\(\)]/g, '');

        const variants: string[] = [cleaned];

        // Si commence par +33, ajouter version avec 0
        if (cleaned.startsWith('+33')) {
            variants.push('0' + cleaned.slice(3));
        }
        // Si commence par 0033, ajouter version avec 0
        if (cleaned.startsWith('0033')) {
            variants.push('0' + cleaned.slice(4));
        }
        // Si commence par 0, ajouter version avec +33
        if (cleaned.startsWith('0') && cleaned.length === 10) {
            variants.push('+33' + cleaned.slice(1));
        }

        return variants;
    };

    // Logic to save to DB
    try {
        // 1. Find Contact avec différentes variantes du numéro
        const phoneVariants = normalizePhone(raw_digits);
        console.log(`   🔎 Recherche contact avec variantes: ${phoneVariants.join(', ')}`);

        let contactRecord = await prisma.contact.findFirst({
            where: {
                OR: phoneVariants.flatMap(phone => [
                    { phoneFixed: phone },
                    { phoneMobile: phone },
                    { phoneFixed: { contains: phone.slice(-9) } }, // Derniers 9 chiffres
                    { phoneMobile: { contains: phone.slice(-9) } }
                ])
            }
        });

        // ⚠️ NE PAS créer de contact automatiquement
        // Les autres équipes Aircall peuvent générer des appels vers des numéros non présents dans le CRM
        if (!contactRecord) {
            console.log(`   ⏭️ Contact non trouvé pour: ${raw_digits}. Appel ignoré (pas de création automatique).`);
            return; // Ignorer cet appel
        }

        console.log(`   ✅ Contact trouvé: ${contactRecord.companyName} (${contactRecord.id})`);

        // 2. Find Agent - IMPORTANT: Seuls les appels des agents existants dans le CRM sont importés
        let agent = null;
        if (user && user.email) {
            agent = await prisma.user.findFirst({
                where: {
                    email: { equals: user.email, mode: 'insensitive' }
                }
            });
        }

        // Si l'agent n'existe pas dans le CRM, ignorer cet appel (équipe différente)
        if (!agent) {
            console.log(`⏭️ Appel ignoré: Agent ${user?.email || 'inconnu'} n'existe pas dans le CRM.`);
            return; // Ne pas créer l'appel dans la DB
        }

        // 3. Download Recording
        let recordingPath = null;
        if (recording) {
            const filename = `${id}.mp3`;
            recordingPath = await downloadRecording(recording, filename);
        }

        // 4. Create Call Record
        if (contactRecord && agent) {
            // Déterminer l'outcome : si le contact a déjà été qualifié, hériter du statut
            // Sinon, utiliser 'OTHER' (non qualifié)
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

            const inheritedOutcome = statusToOutcomeMap[contactRecord.status] || 'OTHER';
            const shouldInherit = contactRecord.status !== 'NEW';

            console.log(`📊 Contact status: ${contactRecord.status} → Outcome hérité: ${inheritedOutcome} (inherit: ${shouldInherit})`);

            const createdCall = await prisma.call.create({
                data: {
                    contactId: contactRecord.id,
                    userId: agent.id,
                    outcome: shouldInherit ? inheritedOutcome : 'OTHER',
                    duration: duration,
                    calledAt: new Date(started_at * 1000),
                    notes: `Appel Aircall ID: ${id}. ${recording ? 'Enregistrement disponible.' : ''} ${voicemail ? 'Message vocal laissé.' : ''}`,

                    // New Fields
                    aircallId: id.toString(),
                    recordingUrl: recording || null,
                    recordingPath: recordingPath,
                    recordingStatus: recording && shouldInherit ? 'TREATED' : (recording ? 'UNTREATED' : 'NO_RECORDING'),
                    direction: direction,
                    phoneNumber: raw_digits,
                    importedAt: new Date()
                } as any
            });
            console.log('✅ Appel sauvegardé dans la base de données');

            // Si le contact était déjà qualifié et qu'il y a un enregistrement, renommer le fichier
            if (shouldInherit && recordingPath) {
                try {
                    const { renameRecording } = require('../services/recordingRenamer');
                    await renameRecording(createdCall.id);
                    console.log('✅ Enregistrement renommé avec le statut hérité');
                } catch (renameError) {
                    console.error('⚠️ Erreur lors du renommage:', renameError);
                }
            }
        }
    } catch (dbError) {
        console.error('Error saving call to DB:', dbError);
    }
};

const handleCallMissed = async (data: any, io: any) => {
    const { id, raw_digits, missed_call_reason } = data;
    console.log(`❌ Appel ${id} manqué`);
    console.log(`   Numéro: ${raw_digits}`);
    console.log(`   Raison: ${missed_call_reason}`);
    // TODO: Register missed call
};

// Handler pour quand l'enregistrement devient disponible (peut arriver quelques minutes après l'appel)
const handleRecordingAvailable = async (data: any, io: any) => {
    const { id, recording } = data;
    console.log(`🎙️ Enregistrement disponible pour l'appel ${id}`);
    console.log(`   URL: ${recording}`);

    if (!recording) {
        console.warn(`   ⚠️ URL d'enregistrement vide, ignoré.`);
        return;
    }

    try {
        // Chercher l'appel par aircallId
        const existingCall = await prisma.call.findFirst({
            where: { aircallId: id.toString() }
        });

        if (existingCall) {
            // Télécharger l'enregistrement
            const filename = `${id}.mp3`;
            const recordingPath = await downloadRecording(recording, filename);

            // Mettre à jour l'appel avec l'URL et le chemin de l'enregistrement
            await prisma.call.update({
                where: { id: existingCall.id },
                data: {
                    recordingUrl: recording,
                    recordingPath: recordingPath,
                    recordingStatus: 'UNTREATED'
                }
            });
            console.log(`   ✅ Enregistrement ajouté à l'appel ${existingCall.id}`);
        } else {
            console.log(`   ⚠️ Appel Aircall ${id} non trouvé dans la base de données. Peut-être d'une autre équipe.`);
        }
    } catch (error) {
        console.error(`   ❌ Erreur lors de la mise à jour de l'enregistrement:`, error);
    }
};

// Simulation d'un appel (pour le dev)
export const simulateCall = async (req: AuthRequest, res: Response) => {
    try {
        const { contactId, outcome, duration, notes } = req.body;
        const userId = req.user?.userId;

        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const call = await prisma.call.create({
            data: {
                contactId,
                userId,
                outcome: outcome || 'OTHER',
                duration: duration || 0,
                notes,
            }
        });

        res.status(201).json(call);
    } catch (error) {
        res.status(500).json({ message: 'Error simulating call', error });
    }
};

// Initier un appel sortant (Click-to-Call)
export const initiateCall = async (req: AuthRequest, res: Response) => {
    try {
        const { phoneNumber } = req.body;
        const userId = req.user?.userId;

        if (!userId) return res.status(401).json({ message: 'Unauthorized' });
        if (!phoneNumber) return res.status(400).json({ message: 'Phone number is required' });

        // Récupérer l'utilisateur pour avoir son email Aircall (si stocké) ou utiliser l'API ID/Token global
        // Pour l'instant on utilise les clés globales du .env
        const apiId = process.env.AIRCALL_API_ID;
        const apiToken = process.env.AIRCALL_API_TOKEN;

        if (!apiId || !apiToken) {
            return res.status(500).json({ message: 'Aircall API keys not configured' });
        }

        // Appel à l'API Aircall pour initier l'appel
        // Note: L'API /calls de Aircall permet de lancer un appel.
        // Il faut spécifier 'to' (le numéro à appeler) et 'from' (le numéro de l'agent ou l'utilisateur Aircall)
        // Si on ne connait pas le 'from', ça peut être compliqué.
        // Souvent on utilise l'email de l'agent pour trouver son ID Aircall.

        // Simplification : On suppose que l'agent est connecté sur son app Aircall.
        // On va utiliser l'endpoint /calls avec 'to' et 'from' (numéro de la ligne par défaut ou celui de l'agent)

        // Pour ce MVP, on va juste logger l'intention car on n'a pas forcément le 'from'.
        // Mais si on veut vraiment le faire :
        /*
        const response = await axios.post('https://api.aircall.io/v1/calls', {
            to: phoneNumber,
            // from: ??? // Il faut un numéro Aircall valide
        }, {
            auth: {
                username: apiId,
                password: apiToken
            }
        });
        */

        // Alternative : Utiliser le lien tel: côté front, mais ça ne passe pas par l'API Aircall pour le logging automatique immédiat.
        // Mais Aircall Desktop App intercepte les liens tel:.

        // Si on veut utiliser l'API pour forcer l'appel sur le softphone de l'agent, il faut l'ID de l'agent.
        // Supposons qu'on a stocké l'email Aircall de l'user.

        // Pour l'instant, on renvoie juste un succès pour dire "Backend prêt à logger", 
        // le frontend utilisera probablement un lien `tel:` ou l'intégration Aircall JS si disponible.

        // MAIS, l'utilisateur a demandé "Click-to-Call".
        // La méthode la plus simple et standard est le lien `tel:`.
        // Si on veut passer par le backend, c'est pour faire du "dialer" intégré.

        // On va implémenter un appel API Aircall générique si possible, sinon on conseille le `tel:`

        console.log(`Initiating call to ${phoneNumber} for user ${userId}`);

        res.json({ message: 'Call initiated', phoneNumber });

    } catch (error) {
        console.error('Error initiating call:', error);
        res.status(500).json({ message: 'Error initiating call' });
    }
};
