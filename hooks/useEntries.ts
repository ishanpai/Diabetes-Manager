import {
  useEffect,
  useState,
} from 'react';

import { Entry } from '@/types';

interface UseEntriesOptions {
  patientId?: string;
  limit?: number;
  offset?: number;
}

interface UseEntriesReturn {
  entries: Entry[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  totalEntries: number;
  hasMore: boolean;
  createEntry: (data: Omit<Entry, 'id' | 'createdAt'>) => Promise<void>;
}

export function useEntries(options: UseEntriesOptions = {}): UseEntriesReturn {
  const { patientId, limit = 10, offset = 0 } = options;
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalEntries, setTotalEntries] = useState(0);

  const fetchEntries = async () => {
    if (!patientId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        patientId,
        limit: limit.toString(),
        offset: offset.toString(),
      });
      
      const response = await fetch(`/api/entries?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch entries');
      }
      
      const result = await response.json();
      
      if (result.success) {
        setEntries(result.data.entries);
        setTotalEntries(result.data.totalEntries);
      } else {
        throw new Error(result.error || 'Failed to fetch entries');
      }
    } catch (err) {
      console.error('Error fetching entries:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const createEntry = async (data: Omit<Entry, 'id' | 'createdAt'>) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to create entry');
      }

      const result = await response.json();
      
      if (result.success) {
        // Refresh entries after creating new one
        await fetchEntries();
      } else {
        throw new Error(result.error || 'Failed to create entry');
      }
    } catch (err) {
      console.error('Error creating entry:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [patientId, limit, offset]);

  return {
    entries,
    loading,
    error,
    refetch: fetchEntries,
    totalEntries,
    hasMore: totalEntries > offset + entries.length,
    createEntry,
  };
} 