/**
 * Date utility functions for converting between Date objects and strings
 * for API compatibility while maintaining type safety in the application
 */

/**
 * Convert a Date object to ISO string for API transmission
 */
export const dateToISOString = (date: Date): string => {
  return date.toISOString();
};

/**
 * Convert an ISO string to Date object from API response
 */
export const isoStringToDate = (isoString: string): Date => {
  return new Date(isoString);
};

/**
 * Convert a date string from form input to Date object
 */
export const formDateToDate = (dateString: string): Date => {
  return new Date(dateString);
};

/**
 * Convert a Date object to form-compatible string (YYYY-MM-DD)
 */
export const dateToFormString = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

/**
 * Convert a Date object to form-compatible datetime string (YYYY-MM-DDTHH:mm)
 */
export const dateToFormDateTimeString = (date: Date): string => {
  return date.toISOString().slice(0, 16);
};

/**
 * Convert a datetime string from form input to Date object
 */
export const formDateTimeToDate = (dateTimeString: string): Date => {
  return new Date(dateTimeString);
};

/**
 * Format a Date object for display
 */
export const formatDateForDisplay = (date: Date, options?: Intl.DateTimeFormatOptions): string => {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };

  return date.toLocaleDateString(undefined, { ...defaultOptions, ...options });
};

/**
 * Format a Date object for display with time
 */
export const formatDateTimeForDisplay = (
  date: Date,
  options?: Intl.DateTimeFormatOptions,
): string => {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };

  return date.toLocaleString(undefined, { ...defaultOptions, ...options });
};

/**
 * Calculate age from date of birth
 */
export const calculateAge = (dob: Date | string): number => {
  const dateObj = typeof dob === 'string' ? new Date(dob) : dob;
  const today = new Date();
  let age = today.getFullYear() - dateObj.getFullYear();
  const monthDiff = today.getMonth() - dateObj.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateObj.getDate())) {
    age--;
  }
  return age;
};

/**
 * Check if a date is today
 */
export const isToday = (date: Date): boolean => {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};

/**
 * Check if a date is yesterday
 */
export const isYesterday = (date: Date): boolean => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  return (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  );
};

/**
 * Get relative time string (e.g., "2 hours ago", "yesterday")
 */
export const getRelativeTimeString = (date: Date): string => {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 1) {
    return 'Just now';
  }
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minutes ago`;
  }
  if (diffInHours < 24) {
    return `${diffInHours} hours ago`;
  }
  if (diffInDays === 1) {
    return 'Yesterday';
  }
  if (diffInDays < 7) {
    return `${diffInDays} days ago`;
  }

  return formatDateForDisplay(date);
};
