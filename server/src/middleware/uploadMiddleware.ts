import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';

const uploadDir = path.join(__dirname, '../../uploads');

// Créer le dossier s'il n'existe pas
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Types de fichiers autorisés pour les imports
const ALLOWED_MIMETYPES = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
    'application/vnd.ms-excel', // xls
    'text/csv',
    'text/plain',
    'application/csv'
];

const ALLOWED_EXTENSIONS = ['.xlsx', '.xls', '.csv', '.txt'];

// Taille maximale des fichiers (10 Mo)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Filtre de validation des fichiers
const fileFilter = (
    req: Request,
    file: Express.Multer.File,
    cb: FileFilterCallback
) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const isAllowedExt = ALLOWED_EXTENSIONS.includes(ext);
    const isAllowedMime = ALLOWED_MIMETYPES.includes(file.mimetype);

    if (isAllowedExt && isAllowedMime) {
        cb(null, true);
    } else {
        cb(new Error(`Type de fichier non autorisé. Extensions acceptées: ${ALLOWED_EXTENSIONS.join(', ')}`));
    }
};

// Configuration du stockage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Nettoyer le nom de fichier pour éviter les attaques par path traversal
        const sanitizedOriginalName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${uniqueSuffix}-${sanitizedOriginalName}`);
    },
});

// Configuration Multer avec toutes les protections
export const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: 1, // Un seul fichier à la fois
        fields: 10, // Limite le nombre de champs non-fichier
        parts: 15, // Limite le nombre total de parties
    }
});

// Middleware de nettoyage des fichiers temporaires en cas d'erreur
export const cleanupOnError = (err: any, req: any, res: any, next: any) => {
    if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
    }
    next(err);
};

// Export des constantes pour les tests
export { ALLOWED_MIMETYPES, ALLOWED_EXTENSIONS, MAX_FILE_SIZE };
