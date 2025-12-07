import { Request, Response } from 'express';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/authMiddleware';
import path from 'path';
import fs from 'fs';

// Get list of recordings
export const getRecordings = async (req: AuthRequest, res: Response) => {
    try {
        const { page = 1, limit = 20, agentId, status, dateStart, dateEnd, search, outcome } = req.query;

        const pageNum = Number(page);
        const limitNum = Number(limit);
        const skip = (pageNum > 0 ? pageNum - 1 : 0) * limitNum;

        // Rechercher les appels avec recordingPath OU recordingUrl non vide
        const where: any = {
            OR: [
                { AND: [{ recordingPath: { not: null } }, { recordingPath: { not: '' } }] },
                { AND: [{ recordingUrl: { not: null } }, { recordingUrl: { not: '' } }] }
            ]
        };

        console.log('[GET_RECORDINGS] Fetching recordings with criteria:', JSON.stringify(where));

        if (agentId) {
            where.userId = String(agentId);
        }

        if (status) {
            where.recordingStatus = String(status);
        }

        if (dateStart || dateEnd) {
            where.calledAt = {};
            if (dateStart) where.calledAt.gte = new Date(String(dateStart));
            if (dateEnd) {
                const end = new Date(String(dateEnd));
                end.setHours(23, 59, 59, 999);
                where.calledAt.lte = end;
            }
        }

        if (search) {
            where.phoneNumber = { contains: String(search) };
        }

        if (outcome) {
            where.outcome = String(outcome);
        }

        const recordings = await prisma.call.findMany({
            where,
            skip,
            take: limitNum,
            orderBy: { calledAt: 'desc' },
            include: {
                user: { select: { id: true, name: true } },
                contact: { select: { id: true, companyName: true, phoneFixed: true, phoneMobile: true } }
            }
        });

        const total = await prisma.call.count({ where });

        console.log(`[GET_RECORDINGS] Found ${recordings.length} recordings (total: ${total})`);

        res.json({
            data: recordings,
            meta: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum)
            }
        });

    } catch (error) {
        console.error('Error fetching recordings:', error);
        res.status(500).json({ message: 'Error fetching recordings' });
    }
};

// Stream recording
export const streamRecording = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const call = await prisma.call.findUnique({
            where: { id },
            include: {
                user: { select: { name: true } },
                contact: { select: { companyName: true } }
            }
        });

        if (!call || !call.recordingPath) {
            return res.status(404).json({ message: 'Recording not found' });
        }

        // Générer le nom de fichier avec nomenclature
        const sanitize = (str: string | null | undefined): string => {
            if (!str) return 'Inconnu';
            return str
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Enlever accents
                .replace(/[^a-zA-Z0-9\s]/g, '') // Garder alphanum et espaces
                .replace(/\s+/g, ' ') // Normaliser espaces
                .trim()
                .substring(0, 30);
        };

        const statusLabels: { [key: string]: string } = {
            'APPOINTMENT_TAKEN': 'RDV Pris',
            'CALLBACK_LATER': 'A Rappeler',
            'FOLLOW_UP': 'Relance',
            'NOT_INTERESTED': 'Pas Interesse',
            'UNREACHABLE': 'Injoignable',
            'ANSWERING_MACHINE': 'Repondeur',
            'ABSENT': 'Absent',
            'NRP': 'NRP',
            'WRONG_NUMBER': 'Faux Numero',
            'OUT_OF_TARGET': 'Hors Cible',
            'ALREADY_CLIENT': 'Deja Client',
            'OTHER': 'Autre'
        };

        const agentName = sanitize(call.user?.name);
        const companyName = sanitize(call.contact?.companyName);
        const status = statusLabels[call.outcome] || 'Non Qualifie';
        const dateStr = call.calledAt
            ? new Date(call.calledAt).toISOString().split('T')[0].replace(/-/g, '')
            : new Date().toISOString().split('T')[0].replace(/-/g, '');

        const downloadFilename = `${agentName}_${companyName}_${status}_${dateStr}.mp3`;

        const absolutePath = path.join(__dirname, '../../storage', call.recordingPath);

        if (!fs.existsSync(absolutePath)) {
            return res.status(404).json({ message: 'File not found on server' });
        }

        const stat = fs.statSync(absolutePath);
        const fileSize = stat.size;
        const range = req.headers.range;

        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;
            const file = fs.createReadStream(absolutePath, { start, end });
            const head = {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': 'audio/mpeg',
                'Content-Disposition': `attachment; filename="${encodeURIComponent(downloadFilename)}"`,
            };
            res.writeHead(206, head);
            file.pipe(res);
        } else {
            const head = {
                'Content-Length': fileSize,
                'Content-Type': 'audio/mpeg',
                'Content-Disposition': `attachment; filename="${encodeURIComponent(downloadFilename)}"`,
            };
            res.writeHead(200, head);
            fs.createReadStream(absolutePath).pipe(res);
        }

    } catch (error) {
        console.error('Error streaming recording:', error);
        res.status(500).json({ message: 'Error streaming recording' });
    }
};

// Update status
export const updateRecordingStatus = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // TREATED, UNTREATED

        const call = await prisma.call.update({
            where: { id },
            data: { recordingStatus: status }
        });

        res.json(call);
    } catch (error) {
        res.status(500).json({ message: 'Error updating status' });
    }
};
