import { Entry } from '@/types';

export function formatEntryValue(entry: Entry): string {
  switch (entry.entryType) {
    case 'glucose':
      return `${entry.value} ${entry.units}`;
    case 'insulin':
      return `${entry.value} ${entry.units}`;
    case 'meal':
      return entry.value;
    default:
      return entry.value;
  }
}

export function getEntryTypeLabel(entryType: Entry['entryType']): string {
  switch (entryType) {
    case 'glucose':
      return 'Glucose Reading';
    case 'insulin':
      return 'Insulin Dose';
    case 'meal':
      return 'Meal';
    default:
      return 'Entry';
  }
}

export function getEntryTypeColor(entryType: Entry['entryType']): string {
  switch (entryType) {
    case 'glucose':
      return 'bg-blue-100 text-blue-800';
    case 'insulin':
      return 'bg-purple-100 text-purple-800';
    case 'meal':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function getEntryIcon(entryType: Entry['entryType']): string {
  switch (entryType) {
    case 'glucose':
      return '🩸';
    case 'insulin':
      return '💉';
    case 'meal':
      return '🍽️';
    default:
      return '📝';
  }
}

export function formatEntryTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function formatEntryDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));
}

export function getEntryDescription(entry: Entry): string {
  switch (entry.entryType) {
    case 'glucose':
      return `Glucose reading of ${entry.value} ${entry.units}`;
    case 'insulin':
      return `Insulin dose of ${entry.value} ${entry.units} (${entry.medicationBrand})`;
    case 'meal':
      return `Meal: ${entry.value}`;
    default:
      return entry.value;
  }
}

export function sortEntriesByDate(entries: Entry[]): Entry[] {
  return [...entries].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
}

export function filterEntriesByType(entries: Entry[], type: Entry['entryType']): Entry[] {
  return entries.filter(entry => entry.entryType === type);
}

export function getLatestEntry(entries: Entry[]): Entry | null {
  if (entries.length === 0) {return null;}
  return sortEntriesByDate(entries)[0];
}

export function getLatestGlucoseEntry(entries: Entry[]): Entry | null {
  const glucoseEntries = filterEntriesByType(entries, 'glucose');
  return getLatestEntry(glucoseEntries);
} 