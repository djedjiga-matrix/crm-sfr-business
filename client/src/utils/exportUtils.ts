/**
 * Utilitaires d'export de données
 * Supporte CSV, XLSX (via SheetJS) et JSON
 */

// Types
interface ExportOptions {
    filename: string;
    columns: string[];
    columnLabels?: Record<string, string>;
}

/**
 * Télécharge un fichier blob
 */
const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

/**
 * Formate une valeur pour CSV (échappe les guillemets et virgules)
 */
const formatCsvValue = (value: any): string => {
    if (value === null || value === undefined) return '';

    const stringValue = String(value);

    // Si contient des virgules, guillemets ou retours à la ligne, entourer de guillemets
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
    }

    return stringValue;
};

/**
 * Formate une date pour l'export
 */
const formatDateValue = (value: any): string => {
    if (!value) return '';

    try {
        const date = new Date(value);
        if (isNaN(date.getTime())) return String(value);

        return date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return String(value);
    }
};

/**
 * Formate une valeur selon son type pour l'export
 */
const formatValue = (value: any, key: string): any => {
    if (value === null || value === undefined) return '';

    // Détection des dates
    if (key.toLowerCase().includes('date') || key.toLowerCase().includes('at') || key.toLowerCase().includes('time')) {
        if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
            return formatDateValue(value);
        }
    }

    // Booléens
    if (typeof value === 'boolean') {
        return value ? 'Oui' : 'Non';
    }

    // Objets imbriqués
    if (typeof value === 'object') {
        return JSON.stringify(value);
    }

    return value;
};

/**
 * Export en CSV
 */
export const exportToCsv = <T extends Record<string, any>>(
    data: T[],
    options: ExportOptions
): void => {
    const { filename, columns, columnLabels = {} } = options;

    // En-têtes
    const headers = columns.map(col => columnLabels[col] || col);

    // Lignes de données
    const rows = data.map(item =>
        columns.map(col => formatCsvValue(formatValue(item[col], col)))
    );

    // Assemblage CSV avec BOM pour Excel
    const bom = '\uFEFF';
    const csv = bom + [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    downloadBlob(blob, `${filename}.csv`);
};

/**
 * Export en JSON
 */
export const exportToJson = <T extends Record<string, any>>(
    data: T[],
    options: ExportOptions
): void => {
    const { filename, columns, columnLabels = {} } = options;

    // Filtrer et renommer les colonnes
    const exportData = data.map(item => {
        const filtered: Record<string, any> = {};
        columns.forEach(col => {
            const label = columnLabels[col] || col;
            filtered[label] = formatValue(item[col], col);
        });
        return filtered;
    });

    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    downloadBlob(blob, `${filename}.json`);
};

/**
 * Export en XLSX (Excel)
 * Utilise une approche simple sans dépendance externe
 * Pour un vrai XLSX, il faudrait utiliser une lib comme xlsx ou exceljs
 */
export const exportToXlsx = <T extends Record<string, any>>(
    data: T[],
    options: ExportOptions
): void => {
    const { filename, columns, columnLabels = {} } = options;

    // En-têtes
    const headers = columns.map(col => columnLabels[col] || col);

    // Lignes de données
    const rows = data.map(item =>
        columns.map(col => formatValue(item[col], col))
    );

    // Générer un HTML table que Excel peut ouvrir
    const tableHtml = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" 
              xmlns:x="urn:schemas-microsoft-com:office:excel">
        <head>
            <meta charset="UTF-8">
            <!--[if gte mso 9]>
            <xml>
                <x:ExcelWorkbook>
                    <x:ExcelWorksheets>
                        <x:ExcelWorksheet>
                            <x:Name>Export</x:Name>
                            <x:WorksheetOptions>
                                <x:DisplayGridlines/>
                            </x:WorksheetOptions>
                        </x:ExcelWorksheet>
                    </x:ExcelWorksheets>
                </x:ExcelWorkbook>
            </xml>
            <![endif]-->
            <style>
                table { border-collapse: collapse; }
                th { 
                    background-color: #dc2626; 
                    color: white; 
                    font-weight: bold; 
                    padding: 8px;
                    border: 1px solid #ccc;
                }
                td { 
                    padding: 6px; 
                    border: 1px solid #ccc;
                }
                tr:nth-child(even) { background-color: #f9f9f9; }
            </style>
        </head>
        <body>
            <table>
                <thead>
                    <tr>${headers.map(h => `<th>${escapeHtml(String(h))}</th>`).join('')}</tr>
                </thead>
                <tbody>
                    ${rows.map(row => `
                        <tr>${row.map(cell => `<td>${escapeHtml(String(cell))}</td>`).join('')}</tr>
                    `).join('')}
                </tbody>
            </table>
        </body>
        </html>
    `;

    const blob = new Blob([tableHtml], {
        type: 'application/vnd.ms-excel;charset=utf-8'
    });
    downloadBlob(blob, `${filename}.xls`);
};

/**
 * Échappe les caractères HTML
 */
const escapeHtml = (text: string): string => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
};

/**
 * Export générique - choisit la bonne méthode selon le format
 */
export const exportData = <T extends Record<string, any>>(
    data: T[],
    format: 'csv' | 'xlsx' | 'json',
    options: ExportOptions
): void => {
    switch (format) {
        case 'csv':
            exportToCsv(data, options);
            break;
        case 'xlsx':
            exportToXlsx(data, options);
            break;
        case 'json':
            exportToJson(data, options);
            break;
    }
};

/**
 * Colonnes prédéfinies pour les contacts
 */
export const contactColumns = [
    { key: 'lastName', label: 'Nom' },
    { key: 'firstName', label: 'Prénom' },
    { key: 'company', label: 'Entreprise' },
    { key: 'phone', label: 'Téléphone' },
    { key: 'email', label: 'Email' },
    { key: 'status', label: 'Statut' },
    { key: 'city', label: 'Ville' },
    { key: 'postalCode', label: 'Code postal' },
    { key: 'address', label: 'Adresse' },
    { key: 'siret', label: 'SIRET' },
    { key: 'industry', label: 'Secteur' },
    { key: 'lastCallDate', label: 'Dernier appel' },
    { key: 'callCount', label: 'Nb appels' },
    { key: 'notes', label: 'Notes' },
    { key: 'createdAt', label: 'Date création' },
];

/**
 * Colonnes prédéfinies pour les rendez-vous
 */
export const appointmentColumns = [
    { key: 'date', label: 'Date' },
    { key: 'time', label: 'Heure' },
    { key: 'contactName', label: 'Contact' },
    { key: 'company', label: 'Entreprise' },
    { key: 'address', label: 'Adresse' },
    { key: 'status', label: 'Statut' },
    { key: 'agent', label: 'Agent' },
    { key: 'commercial', label: 'Commercial' },
    { key: 'notes', label: 'Notes' },
    { key: 'createdAt', label: 'Date création' },
];

/**
 * Colonnes prédéfinies pour les campagnes
 */
export const campaignColumns = [
    { key: 'name', label: 'Nom' },
    { key: 'description', label: 'Description' },
    { key: 'status', label: 'Statut' },
    { key: 'startDate', label: 'Date début' },
    { key: 'endDate', label: 'Date fin' },
    { key: 'contactCount', label: 'Nb contacts' },
    { key: 'appointmentCount', label: 'Nb RDV' },
    { key: 'conversionRate', label: 'Taux conversion' },
];

export default exportData;
