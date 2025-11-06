import { z } from 'zod';

// User validation schemas
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const signupSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

// Patient validation schemas
export const medicationSchema = z.object({
  brand: z
    .string()
    .min(1, 'Medication brand is required')
    .transform((val) => val.trim()),
  dosage: z
    .string()
    .min(1, 'Dosage is required')
    .transform((val) => val.trim()),
  timing: z
    .string()
    .optional()
    .transform((val) => val?.trim() || ''),
});

export const patientSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  dob: z.preprocess(
    (val) => {
      if (typeof val === 'string') {
        // Accept YYYY-MM-DD or ISO string
        return new Date(val);
      }
      return val;
    },
    z.date({
      required_error: 'Date of birth is required',
      invalid_type_error: 'Invalid date format',
    }),
  ),
  diabetesType: z.string().min(1, 'Diabetes type is required'),
  lifestyle: z.string().optional(),
  activityLevel: z.enum(['Low', 'Moderate', 'High']).optional(),
  usualMedications: z.array(medicationSchema).min(1, 'At least one medication is required'),
});

// Entry validation schemas
export const glucoseEntrySchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  entryType: z.literal('glucose'),
  value: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num >= 40 && num <= 600;
  }, 'Glucose must be between 40 and 600 mg/dL'),
  units: z.enum(['mg/dL', 'mmol/L']),
  occurredAt: z.preprocess(
    (val) => {
      if (typeof val === 'string') {
        return new Date(val);
      }
      return val;
    },
    z.date({
      required_error: 'Date and time is required',
      invalid_type_error: 'Invalid date format',
    }),
  ),
});

export const mealEntrySchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  entryType: z.literal('meal'),
  value: z.string().min(1, 'Meal description is required'),
  occurredAt: z.preprocess(
    (val) => {
      if (typeof val === 'string') {
        return new Date(val);
      }
      return val;
    },
    z.date({
      required_error: 'Date and time is required',
      invalid_type_error: 'Invalid date format',
    }),
  ),
});

export const insulinEntrySchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  entryType: z.literal('insulin'),
  value: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num >= 0 && num <= 50;
  }, 'Insulin dose must be between 0 and 50 IU'),
  units: z.literal('IU'),
  medicationBrand: z
    .string()
    .min(1, 'Medication brand is required')
    .transform((val) => val.trim()),
  occurredAt: z.preprocess(
    (val) => {
      if (typeof val === 'string') {
        return new Date(val);
      }
      return val;
    },
    z.date({
      required_error: 'Date and time is required',
      invalid_type_error: 'Invalid date format',
    }),
  ),
});

export const entrySchema = z.discriminatedUnion('entryType', [
  glucoseEntrySchema,
  mealEntrySchema,
  insulinEntrySchema,
]);

// API validation schemas
export const recommendationRequestSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  currentGlucose: z.number().optional(),
  mealDescription: z.string().optional(),
});

// Utility validation functions
export const validateGlucoseValue = (value: string, units: string): boolean => {
  const num = parseFloat(value);
  if (isNaN(num)) {
    return false;
  }

  if (units === 'mg/dL') {
    return num >= 40 && num <= 600;
  } else if (units === 'mmol/L') {
    return num >= 2.2 && num <= 33.3;
  }

  return false;
};

export const validateInsulinDose = (value: string): boolean => {
  const num = parseFloat(value);
  return !isNaN(num) && num >= 0 && num <= 50;
};

export const convertGlucoseUnits = (value: number, fromUnit: string, toUnit: string): number => {
  if (fromUnit === toUnit) {
    return value;
  }

  if (fromUnit === 'mg/dL' && toUnit === 'mmol/L') {
    return value / 18;
  } else if (fromUnit === 'mmol/L' && toUnit === 'mg/dL') {
    return value * 18;
  }

  return value;
};

// Error handling
export const formatValidationError = (error: z.ZodError): Record<string, string> => {
  const formattedErrors: Record<string, string> = {};

  error.errors.forEach((err) => {
    const field = err.path.join('.');
    formattedErrors[field] = err.message;
  });

  return formattedErrors;
};
