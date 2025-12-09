import { Response } from 'express';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/authMiddleware';
import ExcelJS from 'exceljs';
import fs from 'fs';

// Mots-clés pour identifier les colonnes (basé sur le retour utilisateur)
const COLUMN_KEYWORDS = {
    email: ['mail', 'email', 'e-mail', 'courriel'],
    phoneFixed: ['téléphone', 'telephone', 'téléphone fixe', 'phone', 'fixe'],
    phoneMobile: ['mobile', 'portable', 'téléphone mobile'],
    address: ['addresse', 'adresse', 'rue'],
    company: ['nom de l\'entreprise', 'company name', 'nom', 'société', 'entreprise'],
    siret: ['siret'],
    city: ['ville'],
    zipCode: ['code postal', 'cp']
};

// Fonction pour convertir une ligne ExcelJS en tableau de valeurs
const rowToArray = (row: ExcelJS.Row): any[] => {
    const values: any[] = [];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        // ExcelJS utilise des index 1-based, on ajuste pour 0-based
        while (values.length < colNumber - 1) {
            values.push(undefined);
        }
        values.push(cell.value);
    });
    return values;
};

// Nettoyer un numéro de téléphone
const cleanPhoneNumber = (phone: any): string | undefined => {
    if (!phone) return undefined;
    const cleaned = String(phone).replace(/[\s.\-()]/g, '');
    // Vérifier que c'est un format valide (au moins 10 chiffres)
    if (!/^\+?\d{10,15}$/.test(cleaned)) {
        return undefined;
    }
    return cleaned;
};

// Générer un ID unique au format QC-YYYY-XXXXXX
const generateUniqueId = (): string => {
    const year = new Date().getFullYear();
    const uniqueSuffix = Date.now().toString().slice(-6) +
        Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `QC-${year}-${uniqueSuffix}`;
};

// Fonction utilitaire pour lire un fichier Excel/CSV
const readWorkbook = async (filePath: string, originalFilename: string): Promise<ExcelJS.Workbook> => {
    const workbook = new ExcelJS.Workbook();
    const fileExtension = originalFilename.toLowerCase().split('.').pop();

    if (fileExtension === 'csv') {
        await workbook.csv.readFile(filePath, {
            parserOptions: {
                delimiter: ';', // Délimiteur français courant
                quote: '"',
            }
        });
    } else {
        await workbook.xlsx.readFile(filePath);
    }

    return workbook;
};

// Fonction de nettoyage du fichier temporaire
const cleanupFile = (filePath: string) => {
    try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (e) {
        console.warn('[IMPORT] Warning: Could not delete temp file:', e);
    }
};

// ============================================
// PREVIEW IMPORT - Analyse le fichier et retourne les headers + preview
// ============================================
export const previewImport = async (req: AuthRequest, res: Response) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    const filePath = req.file.path;

    try {
        const workbook = await readWorkbook(filePath, req.file.originalname);
        const worksheet = workbook.worksheets[0];

        if (!worksheet) {
            throw new Error('Le fichier ne contient pas de feuille de calcul.');
        }

        // Convertir en tableau de tableaux
        const rawData: any[][] = [];
        worksheet.eachRow({ includeEmpty: false }, (row) => {
            rawData.push(rowToArray(row));
        });

        if (rawData.length === 0) {
            throw new Error('Le fichier est vide ou illisible.');
        }

        // Trouver la ligne d'en-tête (première ligne non vide avec des données textuelles)
        let headerRowIndex = 0;
        for (let i = 0; i < Math.min(rawData.length, 10); i++) {
            const row = rawData[i];
            if (row && row.length > 0 && row.some(cell => cell && typeof cell === 'string')) {
                headerRowIndex = i;
                break;
            }
        }

        const headers = rawData[headerRowIndex].map((cell: any, idx: number) =>
            cell ? String(cell).trim() : `Colonne ${idx + 1}`
        );

        // Prendre les 5 premières lignes de données après l'en-tête
        const previewRows = rawData.slice(headerRowIndex + 1, headerRowIndex + 6);

        // Nettoyer le fichier temporaire
        cleanupFile(filePath);

        res.json({
            headers,
            rows: previewRows,
            totalRows: rawData.length - headerRowIndex - 1,
            headerRowIndex
        });

    } catch (error: any) {
        console.error('[IMPORT PREVIEW] Error:', error);
        cleanupFile(filePath);
        res.status(500).json({
            message: 'Error previewing file',
            error: error.message
        });
    }
};

// ============================================
// IMPORT WITH MAPPING - Importe le fichier avec le mapping personnalisé
// ============================================
export const importWithMapping = async (req: AuthRequest, res: Response) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const userId = req.user?.userId;
    const { campaignId, name, mapping: mappingJson } = req.body;

    let mapping: Record<string, string> = {};
    try {
        mapping = JSON.parse(mappingJson || '{}');
    } catch (e) {
        return res.status(400).json({ message: 'Invalid mapping format' });
    }

    try {
        // 1. Créer une entrée d'historique d'import
        const importHistory = await prisma.importHistory.create({
            data: {
                filename: req.file.originalname,
                name: name || req.file.originalname,
                status: 'IN_PROGRESS',
                userId: userId!,
            },
        });

        // 2. Lire le fichier
        const workbook = await readWorkbook(filePath, req.file.originalname);
        const worksheet = workbook.worksheets[0];

        if (!worksheet) {
            throw new Error('Le fichier ne contient pas de feuille de calcul.');
        }

        // Convertir en tableau
        const rawData: any[][] = [];
        worksheet.eachRow({ includeEmpty: false }, (row) => {
            rawData.push(rowToArray(row));
        });

        if (rawData.length === 0) {
            throw new Error('Le fichier est vide.');
        }

        // Trouver la ligne d'en-tête
        let headerRowIndex = 0;
        for (let i = 0; i < Math.min(rawData.length, 10); i++) {
            const row = rawData[i];
            if (row && row.length > 0 && row.some(cell => cell && typeof cell === 'string')) {
                headerRowIndex = i;
                break;
            }
        }

        const headers = rawData[headerRowIndex].map((cell: any, idx: number) =>
            cell ? String(cell).trim() : `Colonne ${idx + 1}`
        );

        // Créer une map de header name -> index
        const headerIndexMap: Record<string, number> = {};
        headers.forEach((h, i) => { headerIndexMap[h] = i; });

        // Traiter les données
        const dataRows = rawData.slice(headerRowIndex + 1);
        let successCount = 0;
        let errorCount = 0;
        const errors: string[] = [];

        console.log(`[IMPORT MAPPED] Processing ${dataRows.length} data rows with mapping:`, mapping);

        for (let i = 0; i < dataRows.length; i++) {
            const row = dataRows[i];

            try {
                // Ignorer les lignes vides
                if (!row || row.length === 0 || row.every((c: any) => !c)) continue;

                // Extraire les valeurs selon le mapping
                const getValue = (fieldKey: string): any => {
                    const sourceColumn = mapping[fieldKey];
                    if (!sourceColumn) return undefined;
                    const colIndex = headerIndexMap[sourceColumn];
                    if (colIndex === undefined) return undefined;
                    return row[colIndex];
                };

                // Mapping des champs vers les colonnes du schéma Prisma
                const nom = getValue('nom');
                const telephone = getValue('telephone');
                const mobile = getValue('mobile');

                // Le nom est requis
                if (!nom) {
                    continue;
                }

                // Un téléphone est préférable
                const phoneFixed = cleanPhoneNumber(telephone);
                const phoneMobile = cleanPhoneNumber(mobile);

                // Si pas de numéro de téléphone valide, on continue quand même mais on log
                if (!phoneFixed && !phoneMobile) {
                    console.log(`[IMPORT MAPPED] Row ${i + headerRowIndex + 2}: No valid phone number`);
                }

                // Nettoyer les valeurs
                const siretRaw = getValue('siret');
                const cleanedSiret = siretRaw ? String(siretRaw).replace(/\s/g, '') : null;
                const codePostalRaw = getValue('codePostal');
                const cleanedCodePostal = codePostalRaw ? String(codePostalRaw) : null;
                const effectifRaw = getValue('effectif');
                const dateCreationRaw = getValue('dateCreationEnt');

                // Parser la date de création si présente
                let creationDate: Date | null = null;
                if (dateCreationRaw) {
                    const parsed = new Date(dateCreationRaw);
                    if (!isNaN(parsed.getTime())) {
                        creationDate = parsed;
                    }
                }

                const prismaData = {
                    companyName: String(nom).substring(0, 255),
                    siret: cleanedSiret?.substring(0, 14) || null,
                    phoneFixed: phoneFixed || null,
                    phoneMobile: phoneMobile || null,
                    email: getValue('email') ? String(getValue('email')).toLowerCase().trim().substring(0, 255) : null,
                    address: getValue('adresse') ? String(getValue('adresse')).substring(0, 500) : null,
                    zipCode: cleanedCodePostal?.substring(0, 10) || null,
                    city: getValue('ville') ? String(getValue('ville')).substring(0, 100) : null,
                    sector: getValue('categorie') ? String(getValue('categorie')).substring(0, 255) : null,
                    workforce: effectifRaw ? String(effectifRaw).substring(0, 50) : null,
                    managerName: getValue('dirigeants') ? String(getValue('dirigeants')).substring(0, 255) : null,
                    creationDate: creationDate,
                    importId: importHistory.id,
                    campaignId: campaignId || null,
                    uniqueId: generateUniqueId()
                };

                // Si on a un téléphone fixe, on fait un upsert
                if (phoneFixed) {
                    const existingContact = await prisma.contact.findUnique({
                        where: { phoneFixed: phoneFixed }
                    });

                    if (existingContact) {
                        await prisma.contact.update({
                            where: { phoneFixed: phoneFixed },
                            data: {
                                ...prismaData,
                                uniqueId: existingContact.uniqueId || prismaData.uniqueId
                            }
                        });
                    } else {
                        await prisma.contact.create({
                            data: prismaData
                        });
                    }
                } else {
                    // Sans téléphone fixe, on crée simplement
                    await prisma.contact.create({
                        data: {
                            ...prismaData,
                            phoneFixed: undefined // Ensure we don't violate unique constraint
                        }
                    });
                }

                successCount++;

                // Log de progression tous les 100 contacts
                if (successCount % 100 === 0) {
                    console.log(`[IMPORT MAPPED] Processed ${successCount} contacts...`);
                }

            } catch (err: any) {
                errorCount++;
                console.error(`[IMPORT MAPPED] Row ${i + headerRowIndex + 2} error: ${err.message}`);
                errors.push(`Ligne ${i + headerRowIndex + 2}: ${err.message}`);

                if (errors.length >= 100) {
                    errors.push('... (erreurs supplémentaires tronquées)');
                    break;
                }
            }
        }

        // Mettre à jour l'historique d'import
        await prisma.importHistory.update({
            where: { id: importHistory.id },
            data: {
                status: errorCount === 0 ? 'SUCCESS' : (successCount > 0 ? 'PARTIAL' : 'FAILED'),
                rowCount: successCount,
                errorReport: errors.length > 0 ? errors.slice(0, 50).join('\n') : null,
            },
        });

        // Nettoyer le fichier temporaire
        cleanupFile(filePath);

        console.log(`[IMPORT MAPPED] Completed: ${successCount} success, ${errorCount} errors`);

        res.json({
            message: 'Import processed',
            importId: importHistory.id,
            success: successCount,
            errorCount: errorCount,
            errors: errors.slice(0, 20),
        });

    } catch (error: any) {
        console.error('[IMPORT MAPPED] Error:', error);
        cleanupFile(filePath);
        res.status(500).json({
            message: 'Error processing import',
            error: error.message
        });
    }
};

export const importContacts = async (req: AuthRequest, res: Response) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const userId = req.user?.userId;
    const { campaignId, name } = req.body;

    try {
        // 1. Créer une entrée d'historique d'import
        const importHistory = await prisma.importHistory.create({
            data: {
                filename: req.file.originalname,
                name: name || req.file.originalname,
                status: 'IN_PROGRESS',
                userId: userId!,
            },
        });

        // 2. Lire le fichier avec ExcelJS
        const workbook = await readWorkbook(filePath, req.file.originalname);
        const worksheet = workbook.worksheets[0];
        if (!worksheet) {
            throw new Error('Le fichier ne contient pas de feuille de calcul.');
        }

        // 3. Convertir en tableau de tableaux pour compatibilité avec la logique existante
        const rawData: any[][] = [];
        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
            rawData.push(rowToArray(row));
        });

        console.log(`[IMPORT] Raw rows found: ${rawData.length}`);

        if (rawData.length === 0) {
            throw new Error('Le fichier est vide ou illisible.');
        }

        let successCount = 0;
        let errorCount = 0;
        const errors: string[] = [];

        // 4. Trouver la ligne d'en-tête
        let headerRowIndex = -1;
        let columnMap: { [key: string]: number } = {};

        // Chercher la ligne d'en-tête dans les 20 premières lignes
        for (let i = 0; i < Math.min(rawData.length, 20); i++) {
            const row = rawData[i];
            if (!row || row.length === 0) continue;

            const rowStr = row.map(c => String(c || '').toLowerCase());

            // Si on trouve au moins "mail" et "téléphone" ou "adresse", c'est probablement l'en-tête
            const hasMail = rowStr.some(c => COLUMN_KEYWORDS.email.some(k => c.includes(k)));
            const hasPhone = rowStr.some(c => COLUMN_KEYWORDS.phoneFixed.some(k => c.includes(k)));
            const hasAddress = rowStr.some(c => COLUMN_KEYWORDS.address.some(k => c.includes(k)));

            if (hasMail && (hasPhone || hasAddress)) {
                headerRowIndex = i;
                // Construire la map des colonnes
                row.forEach((cell: any, index: number) => {
                    const cellStr = String(cell || '').toLowerCase().trim();
                    if (cellStr) {
                        columnMap[cellStr] = index;
                    }
                });
                console.log(`[IMPORT] Header row found at index ${i}:`, row);
                break;
            }
        }

        // Si pas d'en-tête trouvé, utiliser la ligne 0
        if (headerRowIndex === -1) {
            console.warn('[IMPORT] No header row identified automatically. Using row 0 as header.');
            headerRowIndex = 0;
            rawData[0]?.forEach((cell: any, index: number) => {
                const cellStr = String(cell || '').toLowerCase().trim();
                if (cellStr) {
                    columnMap[cellStr] = index;
                }
            });
        }

        // Fonction utilitaire pour récupérer la valeur d'une colonne
        const getColVal = (row: any[], keys: string[]): any => {
            for (const key of keys) {
                const colName = Object.keys(columnMap).find(c => c.includes(key));
                if (colName && row[columnMap[colName]] !== undefined && row[columnMap[colName]] !== null) {
                    return row[columnMap[colName]];
                }
            }
            return undefined;
        };

        // Fallback avec index fixe si le mapping par nom échoue
        const getValWithFallback = (row: any[], keys: string[], fallbackIndex: number): any => {
            let val = getColVal(row, keys);
            if (!val && fallbackIndex >= 0 && row[fallbackIndex] !== undefined) {
                val = row[fallbackIndex];
            }
            return val;
        };

        // 5. Traiter les données
        const dataRows = rawData.slice(headerRowIndex + 1);
        console.log(`[IMPORT] Processing ${dataRows.length} data rows.`);

        // Traitement par lots pour éviter les timeouts sur gros fichiers
        const BATCH_SIZE = 100;

        for (let i = 0; i < dataRows.length; i++) {
            const row = dataRows[i];

            try {
                // Ignorer les lignes vides
                if (!row || row.length === 0 || row.every((c: any) => !c)) continue;

                const contactData = {
                    companyName: getValWithFallback(row, COLUMN_KEYWORDS.company, 0) || 'Société Inconnue',
                    siret: getValWithFallback(row, COLUMN_KEYWORDS.siret, -1),
                    phoneFixed: getValWithFallback(row, COLUMN_KEYWORDS.phoneFixed, 6),
                    phoneMobile: getValWithFallback(row, COLUMN_KEYWORDS.phoneMobile, 8),
                    email: getValWithFallback(row, COLUMN_KEYWORDS.email, 13),
                    address: getValWithFallback(row, COLUMN_KEYWORDS.address, 3),
                    zipCode: getValWithFallback(row, COLUMN_KEYWORDS.zipCode, -1),
                    city: getValWithFallback(row, COLUMN_KEYWORDS.city, -1),
                };

                // Nettoyage des données
                const cleanedSiret = contactData.siret ? String(contactData.siret).replace(/\s/g, '') : null;
                const cleanedZipCode = contactData.zipCode ? String(contactData.zipCode) : null;
                const phoneFixed = cleanPhoneNumber(contactData.phoneFixed);

                // Si pas de numéro de téléphone fixe valide, ignorer la ligne
                if (!phoneFixed) {
                    continue;
                }

                // Validation du nom d'entreprise
                if (!contactData.companyName) {
                    throw new Error('Company name missing');
                }

                const prismaData = {
                    companyName: String(contactData.companyName).substring(0, 255),
                    siret: cleanedSiret?.substring(0, 14) || null,
                    phoneFixed: phoneFixed,
                    phoneMobile: cleanPhoneNumber(contactData.phoneMobile) || null,
                    email: contactData.email ? String(contactData.email).toLowerCase().trim().substring(0, 255) : null,
                    address: contactData.address ? String(contactData.address).substring(0, 500) : null,
                    zipCode: cleanedZipCode?.substring(0, 10) || null,
                    city: contactData.city ? String(contactData.city).substring(0, 100) : null,
                    importId: importHistory.id,
                    campaignId: campaignId || null,
                    uniqueId: generateUniqueId()
                };

                // Upsert: mettre à jour si le contact existe déjà (basé sur le téléphone fixe)
                const existingContact = await prisma.contact.findUnique({
                    where: { phoneFixed: phoneFixed }
                });

                if (existingContact) {
                    await prisma.contact.update({
                        where: { phoneFixed: phoneFixed },
                        data: {
                            ...prismaData,
                            uniqueId: existingContact.uniqueId || prismaData.uniqueId
                        }
                    });
                } else {
                    await prisma.contact.create({
                        data: prismaData
                    });
                }

                successCount++;

                // Log de progression tous les 100 contacts
                if (successCount % BATCH_SIZE === 0) {
                    console.log(`[IMPORT] Processed ${successCount} contacts...`);
                }

            } catch (err: any) {
                errorCount++;
                console.error(`[IMPORT] Row ${i + headerRowIndex + 2} error: ${err.message}`);
                errors.push(`Ligne ${i + headerRowIndex + 2}: ${err.message}`);

                // Limiter le nombre d'erreurs enregistrées
                if (errors.length >= 100) {
                    errors.push('... (erreurs supplémentaires tronquées)');
                    break;
                }
            }
        }

        // 6. Mettre à jour l'historique d'import
        await prisma.importHistory.update({
            where: { id: importHistory.id },
            data: {
                status: errorCount === 0 ? 'SUCCESS' : (successCount > 0 ? 'PARTIAL' : 'FAILED'),
                rowCount: successCount,
                errorReport: errors.length > 0 ? errors.slice(0, 50).join('\n') : null,
            },
        });

        // Nettoyer le fichier temporaire
        cleanupFile(filePath);

        console.log(`[IMPORT] Completed: ${successCount} success, ${errorCount} errors`);

        res.json({
            message: 'Import processed',
            importId: importHistory.id,
            success: successCount,
            errorCount: errorCount,
            errors: errors.slice(0, 20), // Limiter les erreurs retournées
            debug: {
                totalRows: rawData.length,
                headerRowIndex: headerRowIndex,
                processedRows: dataRows.length,
                preview: rawData.slice(0, 5)
            }
        });

    } catch (error: any) {
        console.error('[IMPORT] Error:', error);
        cleanupFile(filePath);

        // Ne pas exposer les détails d'erreur internes
        const isProduction = process.env.NODE_ENV === 'production';
        res.status(500).json({
            message: 'Error processing import',
            error: isProduction ? 'Internal server error' : error.message
        });
    }
};

