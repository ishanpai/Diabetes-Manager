import {
  useEffect,
  useState,
} from 'react';

import { useAuth } from './useAuth';

export interface UserSettings {
  glucoseUnits: 'mg/dL' | 'mmol/L';
}

const defaultSettings: UserSettings = {
  glucoseUnits: 'mg/dL',
};

export function useSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load settings from database
  useEffect(() => {
    if (user) {
      fetchSettings();
    } else {
      setSettings(defaultSettings);
      setLoading(false);
    }
  }, [user]);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setSettings(result.data);
        } else {
          setSettings(defaultSettings);
        }
      } else {
        setSettings(defaultSettings);
      }
    } catch (err) {
      console.error('Error loading settings:', err);
      setSettings(defaultSettings);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSettings),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save settings');
      }

      const result = await response.json();
      if (result.success) {
        const updatedSettings = { ...settings, ...result.data };
        setSettings(updatedSettings);
        return updatedSettings;
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      throw new Error(err instanceof Error ? err.message : 'Failed to save settings');
    }
  };

  return {
    settings,
    loading,
    error,
    updateSettings,
  };
} 