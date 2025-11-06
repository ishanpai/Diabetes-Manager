import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import {
  AppState,
  Entry,
  GlucoseUnit,
  Patient,
  Recommendation,
  RecommendationProgress,
  User,
} from '@/types';
import { logger } from '@/lib/logger';

interface AppStore extends AppState {
  // Actions
  setUser: (user: User | null) => void;
  setCurrentPatient: (patient: Patient | null) => void;
  setPatients: (patients: Patient[]) => void;
  addPatient: (patient: Patient) => void;
  updatePatient: (patient: Patient) => void;
  removePatient: (patientId: string) => void;
  setEntries: (entries: Entry[]) => void;
  addEntry: (entry: Entry) => void;
  updateEntry: (entry: Entry) => void;
  removeEntry: (entryId: string) => void;
  setRecommendations: (recommendations: Recommendation[]) => void;
  addRecommendation: (recommendation: Recommendation) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setRecommendationProgress: (progress: RecommendationProgress) => void;
  setGlucoseUnit: (unit: GlucoseUnit) => void;
  clearError: () => void;
  logout: () => void;
}

const initialState: AppState = {
  user: null,
  currentPatient: null,
  patients: [],
  entries: [],
  recommendations: [],
  isLoading: false,
  error: null,
  recommendationProgress: 'idle',
  units: {
    glucose: 'mg/dL',
    insulin: 'IU',
  },
};

export const useAppStore = create<AppStore>()(
  persist(
    (set, _get) => ({
      ...initialState,

      setUser: (user) => set({ user }),

      setCurrentPatient: (patient) => set({ currentPatient: patient }),

      setPatients: (patients) => set({ patients }),

      addPatient: (patient) =>
        set((state) => ({
          patients: [...state.patients, patient],
        })),

      updatePatient: (patient) =>
        set((state) => ({
          patients: state.patients.map((p) => (p.id === patient.id ? patient : p)),
          currentPatient: state.currentPatient?.id === patient.id ? patient : state.currentPatient,
        })),

      removePatient: (patientId) =>
        set((state) => ({
          patients: state.patients.filter((p) => p.id !== patientId),
          currentPatient: state.currentPatient?.id === patientId ? null : state.currentPatient,
        })),

      setEntries: (entries) => set({ entries }),

      addEntry: (entry) =>
        set((state) => ({
          entries: [entry, ...state.entries],
        })),

      updateEntry: (entry) =>
        set((state) => ({
          entries: state.entries.map((e) => (e.id === entry.id ? entry : e)),
        })),

      removeEntry: (entryId) =>
        set((state) => ({
          entries: state.entries.filter((e) => e.id !== entryId),
        })),

      setRecommendations: (recommendations) => set({ recommendations }),

      addRecommendation: (recommendation) =>
        set((state) => ({
          recommendations: [recommendation, ...state.recommendations],
        })),

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error }),

      setRecommendationProgress: (recommendationProgress) => set({ recommendationProgress }),

      setGlucoseUnit: (glucose) =>
        set((state) => ({
          units: { ...state.units, glucose },
        })),

      clearError: () => set({ error: null }),

      logout: () => set(initialState),
    }),
    {
      name: 'diabetes-app-storage',
      partialize: (state) => ({
        user: state.user,
        currentPatient: state.currentPatient,
        patients: state.patients,
        units: state.units,
      }),
    },
  ),
);

// Selectors for better performance
export const useUser = () => useAppStore((state) => state.user);
export const useCurrentPatient = () => useAppStore((state) => state.currentPatient);
export const usePatients = () => useAppStore((state) => state.patients);
export const useEntries = () => useAppStore((state) => state.entries);
export const useRecommendations = () => useAppStore((state) => state.recommendations);
export const useIsLoading = () => useAppStore((state) => state.isLoading);
export const useError = () => useAppStore((state) => state.error);
export const useRecommendationProgress = () => useAppStore((state) => state.recommendationProgress);
export const useUnits = () => useAppStore((state) => state.units);

// Computed selectors
export const usePatientEntries = (patientId?: string) => {
  const entries = useEntries();
  const currentPatient = useCurrentPatient();
  const targetPatientId = patientId || currentPatient?.id;

  logger.debug('Entries selector result:', entries);

  return targetPatientId ? entries.filter((entry) => entry.patientId === targetPatientId) : [];
};

export const useGlucoseEntries = (patientId?: string) => {
  const entries = usePatientEntries(patientId);
  return entries.filter((entry) => entry.entryType === 'glucose');
};

export const useMealEntries = (patientId?: string) => {
  const entries = usePatientEntries(patientId);
  return entries.filter((entry) => entry.entryType === 'meal');
};

export const useInsulinEntries = (patientId?: string) => {
  const entries = usePatientEntries(patientId);
  return entries.filter((entry) => entry.entryType === 'insulin');
};
