// Centralized configuration for diabetes manager

export const GLUCOSE_TARGET_RANGES = {
  veryLow: 70, // Hypoglycemia threshold
  low: 80,
  targetMin: 100,
  targetMax: 150,
  high: 180,
  veryHigh: 240,
};

export const PROGRESS_STEPS = [
  { key: 'gathering-data', label: 'Gathering patient data' },
  { key: 'building-prompt', label: 'Building AI prompt' },
  { key: 'waiting-for-model', label: 'Waiting for AI model' },
  { key: 'parsing-response', label: 'Processing AI recommendation' },
];

export const DOSE_DIFFERENCE_WARNING_THRESHOLD = 0.2;

// Add other config values here as needed
