/**
 * Safely formats a date value to a locale string
 * Returns a fallback string if the date is invalid
 */
export const safeFormatDate = (
    dateValue: string | Date | null | undefined,
    options?: Intl.DateTimeFormatOptions,
    fallback: string = ''
): string => {
    if (!dateValue) return fallback;

    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
        return fallback;
    }

    return date.toLocaleString(undefined, options);
};

/**
 * Safely formats a date value to a locale date string (date only)
 */
export const safeFormatDateOnly = (
    dateValue: string | Date | null | undefined,
    fallback: string = ''
): string => {
    if (!dateValue) return fallback;

    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
        return fallback;
    }

    return date.toLocaleDateString();
};

/**
 * Safely formats a date value to a locale time string (time only)
 */
export const safeFormatTimeOnly = (
    dateValue: string | Date | null | undefined,
    options?: Intl.DateTimeFormatOptions,
    fallback: string = ''
): string => {
    if (!dateValue) return fallback;

    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
        return fallback;
    }

    return date.toLocaleTimeString(undefined, options);
};

/**
 * Checks if a date value is valid
 */
export const isValidDate = (dateValue: string | Date | null | undefined): boolean => {
    if (!dateValue) return false;
    const date = new Date(dateValue);
    return !isNaN(date.getTime());
};
