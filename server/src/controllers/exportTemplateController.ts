import { Request, Response } from 'express';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/authMiddleware';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Available fields for export with their labels and categories
export const EXPORT_FIELDS = {
    // Contact Information
    contact: {
        label: 'Informations Contact',
        fields: {
            uniqueId: { label: 'ID Unique', type: 'string' },
            companyName: { label: 'Nom Entreprise', type: 'string' },
            sector: { label: 'Secteur d\'activité', type: 'string' },
            address: { label: 'Adresse', type: 'string' },
            zipCode: { label: 'Code Postal', type: 'string' },
            city: { label: 'Ville', type: 'string' },
            region: { label: 'Région', type: 'string' },
            phoneFixed: { label: 'Téléphone Fixe', type: 'string' },
            phoneMobile: { label: 'Téléphone Mobile', type: 'string' },
            fax: { label: 'Fax', type: 'string' },
            email: { label: 'Email', type: 'string' },
            website: { label: 'Site Web', type: 'string' },
            civility: { label: 'Civilité', type: 'string' },
            managerName: { label: 'Nom du Responsable', type: 'string' },
            managerRole: { label: 'Fonction du Responsable', type: 'string' },
        }
    },
    // Legal Information
    legal: {
        label: 'Informations Légales',
        fields: {
            siret: { label: 'SIRET', type: 'string' },
            siren: { label: 'SIREN', type: 'string' },
            naf: { label: 'Code NAF', type: 'string' },
            legalForm: { label: 'Forme Juridique', type: 'string' },
            capital: { label: 'Capital', type: 'string' },
            workforce: { label: 'Effectif', type: 'string' },
            creationDate: { label: 'Date de Création', type: 'date' },
        }
    },
    // Status & Qualification
    qualification: {
        label: 'Qualification & Statut',
        fields: {
            status: { label: 'Statut du Contact', type: 'status' },
            subStatus: { label: 'Sous-qualification', type: 'string' },
            notes: { label: 'Notes', type: 'text' },
            nextCallDate: { label: 'Date Prochain Rappel', type: 'datetime' },
        }
    },
    // Agent & Treatment
    treatment: {
        label: 'Traitement Agent',
        fields: {
            assignedAgent: { label: 'Agent Assigné', type: 'relation' },
            createdAt: { label: 'Date de Création', type: 'datetime' },
            updatedAt: { label: 'Dernière Modification', type: 'datetime' },
            lastCallDate: { label: 'Date Dernier Appel', type: 'datetime' },
            lastCallOutcome: { label: 'Résultat Dernier Appel', type: 'string' },
            lastCallAgent: { label: 'Agent Dernier Appel', type: 'relation' },
            callCount: { label: 'Nombre d\'Appels', type: 'number' },
        }
    },
    // Import Information
    import: {
        label: 'Informations Import',
        fields: {
            databaseName: { label: 'Nom de la Base', type: 'string' },
            campaignName: { label: 'Nom de la Campagne', type: 'string' },
            importDate: { label: 'Date d\'Import', type: 'datetime' },
        }
    },
    // Appointment Information
    appointment: {
        label: 'Rendez-vous',
        fields: {
            hasAppointment: { label: 'A un RDV', type: 'boolean' },
            appointmentDate: { label: 'Date du RDV', type: 'datetime' },
            appointmentStatus: { label: 'Statut du RDV', type: 'string' },
            commercialName: { label: 'Commercial Assigné', type: 'relation' },
            appointmentNotes: { label: 'Notes RDV', type: 'text' },
        }
    }
};

// Status labels mapping
const STATUS_LABELS: Record<string, string> = {
    'NEW': 'Nouveau',
    'NRP': 'NRP',
    'UNREACHABLE': 'Injoignable',
    'ANSWERING_MACHINE': 'Répondeur',
    'ABSENT': 'Absent',
    'CALLBACK_LATER': 'À rappeler',
    'FOLLOW_UP': 'Relance',
    'NOT_INTERESTED': 'Pas intéressé',
    'APPOINTMENT_TAKEN': 'RDV pris',
    'OUT_OF_TARGET': 'Hors cible',
    'ALREADY_CLIENT': 'Déjà client',
    'WRONG_NUMBER': 'Faux numéro',
    'BLACKLISTED': 'Blacklisté',
    'REFUS_ARGU': 'Refus argumenté',
};

// Get list of available export fields
export const getExportFields = async (_req: Request, res: Response) => {
    try {
        res.json(EXPORT_FIELDS);
    } catch (error) {
        console.error('Error getting export fields:', error);
        res.status(500).json({ message: 'Error getting export fields' });
    }
};

// Get all export templates
export const getExportTemplates = async (_req: Request, res: Response) => {
    try {
        const templates = await prisma.exportTemplate.findMany({
            where: { isActive: true },
            orderBy: [
                { isDefault: 'desc' },
                { name: 'asc' }
            ]
        });

        // Parse fields JSON for each template
        const parsedTemplates = templates.map(t => ({
            ...t,
            fields: JSON.parse(t.fields)
        }));

        res.json(parsedTemplates);
    } catch (error) {
        console.error('Error getting export templates:', error);
        res.status(500).json({ message: 'Error getting export templates' });
    }
};

// Create a new export template
export const createExportTemplate = async (req: AuthRequest, res: Response) => {
    try {
        const { name, description, fields, includeHeader, separator, dateFormat } = req.body;

        if (!name || !fields || !Array.isArray(fields) || fields.length === 0) {
            return res.status(400).json({ message: 'Name and at least one field are required' });
        }

        const template = await prisma.exportTemplate.create({
            data: {
                name,
                description,
                fields: JSON.stringify(fields),
                includeHeader: includeHeader ?? true,
                separator: separator || ';',
                dateFormat: dateFormat || 'dd/MM/yyyy HH:mm'
            }
        });

        res.status(201).json({
            ...template,
            fields: JSON.parse(template.fields)
        });
    } catch (error) {
        console.error('Error creating export template:', error);
        res.status(500).json({ message: 'Error creating export template' });
    }
};

// Update an export template
export const updateExportTemplate = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { name, description, fields, includeHeader, separator, dateFormat, isActive } = req.body;

        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (fields !== undefined) updateData.fields = JSON.stringify(fields);
        if (includeHeader !== undefined) updateData.includeHeader = includeHeader;
        if (separator !== undefined) updateData.separator = separator;
        if (dateFormat !== undefined) updateData.dateFormat = dateFormat;
        if (isActive !== undefined) updateData.isActive = isActive;

        const template = await prisma.exportTemplate.update({
            where: { id },
            data: updateData
        });

        res.json({
            ...template,
            fields: JSON.parse(template.fields)
        });
    } catch (error) {
        console.error('Error updating export template:', error);
        res.status(500).json({ message: 'Error updating export template' });
    }
};

// Delete an export template
export const deleteExportTemplate = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        // Soft delete by setting isActive to false
        await prisma.exportTemplate.update({
            where: { id },
            data: { isActive: false }
        });

        res.json({ message: 'Template deleted successfully' });
    } catch (error) {
        console.error('Error deleting export template:', error);
        res.status(500).json({ message: 'Error deleting export template' });
    }
};

// Export contacts using a template
export const exportWithTemplate = async (req: AuthRequest, res: Response) => {
    try {
        const { templateId, databaseIds, campaignId, filters } = req.body;

        // Get template
        const template = await prisma.exportTemplate.findUnique({
            where: { id: templateId }
        });

        if (!template) {
            return res.status(404).json({ message: 'Template not found' });
        }

        const selectedFields: string[] = JSON.parse(template.fields);

        // Build where clause
        const where: any = {};

        if (databaseIds && databaseIds.length > 0) {
            where.importId = { in: databaseIds };
        }

        if (campaignId) {
            where.campaignId = campaignId;
        }

        if (filters?.status) {
            where.status = filters.status;
        }

        // Date period filter - filter by updatedAt (last modification date)
        if (filters?.dateStart || filters?.dateEnd) {
            where.updatedAt = {};
            if (filters.dateStart) {
                where.updatedAt.gte = new Date(filters.dateStart);
            }
            if (filters.dateEnd) {
                // Add 1 day to include the end date fully
                const endDate = new Date(filters.dateEnd);
                endDate.setDate(endDate.getDate() + 1);
                where.updatedAt.lte = endDate;
            }
        }

        // Agent filter - filter by assigned agent
        if (filters?.agentId) {
            where.assignedToId = filters.agentId;
        }

        // Fetch contacts with all related data
        const contacts = await prisma.contact.findMany({
            where,
            include: {
                assignedTo: { select: { id: true, name: true } },
                campaign: { select: { id: true, name: true } },
                importHistory: { select: { id: true, name: true, createdAt: true } },
                calls: {
                    orderBy: { calledAt: 'desc' },
                    take: 1,
                    include: {
                        user: { select: { name: true } }
                    }
                },
                appointments: {
                    orderBy: { date: 'desc' },
                    take: 1,
                    include: {
                        commercial: { select: { name: true } }
                    }
                }
            },
            orderBy: { updatedAt: 'desc' }
        });

        // Get all calls count per contact
        const callCounts = await prisma.call.groupBy({
            by: ['contactId'],
            _count: { id: true },
            where: { contactId: { in: contacts.map(c => c.id) } }
        });

        const callCountMap = new Map(callCounts.map(c => [c.contactId, c._count.id]));

        // Build field label mapping
        const fieldLabels: Record<string, string> = {};
        Object.values(EXPORT_FIELDS).forEach(category => {
            Object.entries(category.fields).forEach(([key, config]) => {
                fieldLabels[key] = config.label;
            });
        });

        // Format date helper
        const formatDate = (date: Date | null | undefined, dateFormat: string): string => {
            if (!date) return '';
            try {
                return format(date, dateFormat, { locale: fr });
            } catch {
                return date.toISOString();
            }
        };

        // Build rows
        const rows = contacts.map(contact => {
            const row: Record<string, string> = {};
            const lastCall = contact.calls[0];
            const lastAppointment = contact.appointments[0];

            selectedFields.forEach(field => {
                switch (field) {
                    // Contact fields
                    case 'uniqueId':
                    case 'companyName':
                    case 'sector':
                    case 'address':
                    case 'zipCode':
                    case 'city':
                    case 'region':
                    case 'phoneFixed':
                    case 'phoneMobile':
                    case 'fax':
                    case 'email':
                    case 'website':
                    case 'civility':
                    case 'managerName':
                    case 'managerRole':
                    case 'siret':
                    case 'siren':
                    case 'naf':
                    case 'legalForm':
                    case 'capital':
                    case 'workforce':
                    case 'notes':
                        row[field] = (contact as any)[field] || '';
                        break;

                    case 'creationDate':
                        row[field] = formatDate(contact.creationDate, template.dateFormat);
                        break;

                    case 'status':
                        row[field] = STATUS_LABELS[contact.status] || contact.status;
                        break;

                    case 'subStatus':
                        row[field] = contact.subStatus || '';
                        break;

                    case 'nextCallDate':
                        row[field] = formatDate(contact.nextCallDate, template.dateFormat);
                        break;

                    case 'assignedAgent':
                        row[field] = contact.assignedTo?.name || '';
                        break;

                    case 'createdAt':
                        row[field] = formatDate(contact.createdAt, template.dateFormat);
                        break;

                    case 'updatedAt':
                        row[field] = formatDate(contact.updatedAt, template.dateFormat);
                        break;

                    case 'lastCallDate':
                        row[field] = lastCall ? formatDate(lastCall.calledAt, template.dateFormat) : '';
                        break;

                    case 'lastCallOutcome':
                        row[field] = lastCall ? (STATUS_LABELS[lastCall.outcome] || lastCall.outcome) : '';
                        break;

                    case 'lastCallAgent':
                        row[field] = lastCall?.user?.name || '';
                        break;

                    case 'callCount':
                        row[field] = String(callCountMap.get(contact.id) || 0);
                        break;

                    case 'databaseName':
                        row[field] = contact.importHistory?.name || '';
                        break;

                    case 'campaignName':
                        row[field] = contact.campaign?.name || '';
                        break;

                    case 'importDate':
                        row[field] = contact.importHistory ? formatDate(contact.importHistory.createdAt, template.dateFormat) : '';
                        break;

                    case 'hasAppointment':
                        row[field] = lastAppointment ? 'Oui' : 'Non';
                        break;

                    case 'appointmentDate':
                        row[field] = lastAppointment ? formatDate(lastAppointment.date, template.dateFormat) : '';
                        break;

                    case 'appointmentStatus':
                        row[field] = lastAppointment?.status || '';
                        break;

                    case 'commercialName':
                        row[field] = lastAppointment?.commercial?.name || '';
                        break;

                    case 'appointmentNotes':
                        row[field] = lastAppointment?.notes || '';
                        break;

                    default:
                        row[field] = '';
                }
            });

            return row;
        });

        // Escape CSV value
        const escapeCSV = (value: string, separator: string): string => {
            if (value.includes('"') || value.includes(separator) || value.includes('\n')) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        };

        // Build CSV
        const separator = template.separator;
        const lines: string[] = [];

        // Header
        if (template.includeHeader) {
            const headers = selectedFields.map(f => fieldLabels[f] || f);
            lines.push(headers.join(separator));
        }

        // Data rows
        rows.forEach(row => {
            const values = selectedFields.map(f => escapeCSV(row[f] || '', separator));
            lines.push(values.join(separator));
        });

        const csvContent = '\uFEFF' + lines.join('\r\n'); // BOM for UTF-8

        // Send response
        const filename = `Export_${template.name.replace(/\s+/g, '_')}_${format(new Date(), 'dd-MM-yyyy_HH-mm')}.csv`;

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csvContent);

    } catch (error) {
        console.error('Error exporting with template:', error);
        res.status(500).json({ message: 'Error exporting data' });
    }
};
