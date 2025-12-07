import { useState, useEffect, useCallback } from 'react';

interface FilterState {
    [key: string]: any;
}

/**
 * Hook pour persister les filtres dans le localStorage
 * @param key - Clé unique pour identifier les filtres (ex: 'contacts_filters')
 * @param defaultFilters - Valeurs par défaut des filtres
 */
export const usePersistentFilters = <T extends FilterState>(
    key: string,
    defaultFilters: T
): [T, (filters: Partial<T>) => void, () => void] => {
    const storageKey = `crm_filters_${key}`;

    // Initialiser avec les valeurs sauvegardées ou les valeurs par défaut
    const [filters, setFiltersState] = useState<T>(() => {
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                const parsed = JSON.parse(saved);
                // Merger avec les defaults pour gérer les nouvelles propriétés
                return { ...defaultFilters, ...parsed };
            }
        } catch (error) {
            console.error('Error loading filters:', error);
        }
        return defaultFilters;
    });

    // Sauvegarder dans localStorage à chaque changement
    useEffect(() => {
        try {
            localStorage.setItem(storageKey, JSON.stringify(filters));
        } catch (error) {
            console.error('Error saving filters:', error);
        }
    }, [filters, storageKey]);

    // Mettre à jour les filtres (merge partiel)
    const setFilters = useCallback((newFilters: Partial<T>) => {
        setFiltersState(prev => ({ ...prev, ...newFilters }));
    }, []);

    // Réinitialiser les filtres
    const resetFilters = useCallback(() => {
        setFiltersState(defaultFilters);
        localStorage.removeItem(storageKey);
    }, [defaultFilters, storageKey]);

    return [filters, setFilters, resetFilters];
};

/**
 * Hook pour persister la pagination
 */
export const usePersistentPagination = (key: string, defaultPage = 1, defaultLimit = 25) => {
    const storageKey = `crm_pagination_${key}`;

    const [pagination, setPaginationState] = useState(() => {
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (error) {
            console.error('Error loading pagination:', error);
        }
        return { page: defaultPage, limit: defaultLimit };
    });

    useEffect(() => {
        try {
            localStorage.setItem(storageKey, JSON.stringify(pagination));
        } catch (error) {
            console.error('Error saving pagination:', error);
        }
    }, [pagination, storageKey]);

    const setPage = useCallback((page: number) => {
        setPaginationState((prev: any) => ({ ...prev, page }));
    }, []);

    const setLimit = useCallback((limit: number) => {
        setPaginationState({ page: 1, limit }); // Reset page when changing limit
    }, []);

    const resetPagination = useCallback(() => {
        setPaginationState({ page: defaultPage, limit: defaultLimit });
    }, [defaultPage, defaultLimit]);

    return {
        page: pagination.page,
        limit: pagination.limit,
        setPage,
        setLimit,
        resetPagination
    };
};

/**
 * Hook pour persister le tri des colonnes
 */
export const usePersistentSort = (key: string, defaultSort = '', defaultOrder: 'asc' | 'desc' = 'desc') => {
    const storageKey = `crm_sort_${key}`;

    const [sort, setSortState] = useState(() => {
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (error) {
            console.error('Error loading sort:', error);
        }
        return { column: defaultSort, order: defaultOrder };
    });

    useEffect(() => {
        try {
            localStorage.setItem(storageKey, JSON.stringify(sort));
        } catch (error) {
            console.error('Error saving sort:', error);
        }
    }, [sort, storageKey]);

    const toggleSort = useCallback((column: string) => {
        setSortState((prev: any) => ({
            column,
            order: prev.column === column && prev.order === 'asc' ? 'desc' : 'asc'
        }));
    }, []);

    const setSort = useCallback((column: string, order: 'asc' | 'desc') => {
        setSortState({ column, order });
    }, []);

    const resetSort = useCallback(() => {
        setSortState({ column: defaultSort, order: defaultOrder });
        localStorage.removeItem(storageKey);
    }, [defaultSort, defaultOrder, storageKey]);

    return {
        sortColumn: sort.column,
        sortOrder: sort.order,
        toggleSort,
        setSort,
        resetSort
    };
};

/**
 * Hook générique pour persister une valeur simple
 */
export const usePersistentValue = <T>(key: string, defaultValue: T): [T, (value: T) => void] => {
    const storageKey = `crm_value_${key}`;

    const [value, setValueState] = useState<T>(() => {
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (error) {
            console.error('Error loading value:', error);
        }
        return defaultValue;
    });

    useEffect(() => {
        try {
            localStorage.setItem(storageKey, JSON.stringify(value));
        } catch (error) {
            console.error('Error saving value:', error);
        }
    }, [value, storageKey]);

    const setValue = useCallback((newValue: T) => {
        setValueState(newValue);
    }, []);

    return [value, setValue];
};

export default usePersistentFilters;
