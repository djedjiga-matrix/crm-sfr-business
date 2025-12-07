import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

interface SortableHeaderProps {
    label: string;
    column: string;
    currentSort: string;
    currentOrder: 'asc' | 'desc';
    onSort: (column: string) => void;
    className?: string;
}

/**
 * Composant d'en-tête de colonne triable
 */
export const SortableHeader = ({
    label,
    column,
    currentSort,
    currentOrder,
    onSort,
    className = ''
}: SortableHeaderProps) => {
    const isActive = currentSort === column;

    return (
        <th
            className={`px-4 py-3 text-left cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-white/5 transition-colors ${className}`}
            onClick={() => onSort(column)}
        >
            <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                    {label}
                </span>
                <span className="flex-shrink-0">
                    {isActive ? (
                        currentOrder === 'asc' ? (
                            <ChevronUp size={14} className="text-red-500" />
                        ) : (
                            <ChevronDown size={14} className="text-red-500" />
                        )
                    ) : (
                        <ChevronsUpDown size={14} className="text-gray-300 dark:text-gray-600" />
                    )}
                </span>
            </div>
        </th>
    );
};

/**
 * Fonction helper pour trier un tableau d'objets
 */
export const sortData = <T extends Record<string, any>>(
    data: T[],
    column: string,
    order: 'asc' | 'desc'
): T[] => {
    if (!column) return data;

    return [...data].sort((a, b) => {
        let valueA = a[column];
        let valueB = b[column];

        // Gérer les valeurs null/undefined
        if (valueA == null && valueB == null) return 0;
        if (valueA == null) return order === 'asc' ? -1 : 1;
        if (valueB == null) return order === 'asc' ? 1 : -1;

        // Gérer les dates
        if (valueA instanceof Date || (typeof valueA === 'string' && !isNaN(Date.parse(valueA)))) {
            valueA = new Date(valueA).getTime();
            valueB = new Date(valueB).getTime();
        }
        // Gérer les nombres dans des chaînes
        else if (typeof valueA === 'string' && typeof valueB === 'string') {
            const numA = parseFloat(valueA);
            const numB = parseFloat(valueB);
            if (!isNaN(numA) && !isNaN(numB)) {
                valueA = numA;
                valueB = numB;
            } else {
                // Tri alphabétique insensible à la casse
                valueA = valueA.toLowerCase();
                valueB = valueB.toLowerCase();
            }
        }

        if (valueA < valueB) return order === 'asc' ? -1 : 1;
        if (valueA > valueB) return order === 'asc' ? 1 : -1;
        return 0;
    });
};

/**
 * Composant de légende de tri
 */
export const SortLegend = () => (
    <div className="flex items-center gap-4 text-[10px] text-gray-400">
        <span className="flex items-center gap-1">
            <ChevronsUpDown size={12} /> Non trié
        </span>
        <span className="flex items-center gap-1">
            <ChevronUp size={12} className="text-red-500" /> Croissant
        </span>
        <span className="flex items-center gap-1">
            <ChevronDown size={12} className="text-red-500" /> Décroissant
        </span>
    </div>
);

export default SortableHeader;
