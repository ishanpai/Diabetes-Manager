import {
  NextApiRequest,
  NextApiResponse,
} from 'next';
import { z } from 'zod';

import {
  createPatient,
  findEntriesByPatientId,
  findPatientsByUserId,
  findUserByEmail,
} from '@/lib/database';
import { logger } from '@/lib/logger';
import type { Medication } from '@/types';

import NextAuth from '../auth/[...nextauth]';
import { getSessionUserId } from '@/lib/utils/session';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = await getSessionUserId(req, res, NextAuth);

  if (!userId) {
    return res.status(401).json({ error: 'User ID not found' });
  }

  switch (req.method) {
    case 'GET':
      return getPatients(res, userId);
    case 'POST':
      return createPatientHandler(req, res, userId);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function getPatients(res: NextApiResponse, userId: string) {
  try {
    let actualUserId = userId;
    if (userId.includes('@')) {
      const user = await findUserByEmail(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      actualUserId = user.id;
    }

    const patients = await findPatientsByUserId(actualUserId);

    // Transform for response with additional stats
    const transformedPatients = await Promise.all(patients.map(async patient => {
      // Get recent entries for stats
      const patientEntries = await findEntriesByPatientId(patient.id, 10, 0);
      const glucoseEntries = patientEntries.filter(entry => entry.entryType === 'glucose');
      const lastGlucoseEntry = glucoseEntries[0]; // Most recent first
      
      // Calculate age
      const age = Math.floor((new Date().getTime() - new Date(patient.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      
      // Parse medications
      let medications: Medication[] = [];
      try {
        if (typeof patient.usualMedications === 'string') {
          medications = JSON.parse(patient.usualMedications) as Medication[];
        } else {
          medications = patient.usualMedications || [];
        }
      } catch (error) {
        logger.error('Error parsing patient medications:', error);
        medications = [];
      }

      return {
        id: patient.id,
        name: patient.name,
        dob: patient.dob,
        diabetesType: patient.diabetesType,
        lifestyle: patient.lifestyle,
        activityLevel: patient.activityLevel,
        usualMedications: medications,
        createdAt: patient.createdAt,
        updatedAt: patient.updatedAt,
        age,
        lastGlucoseReading: lastGlucoseEntry ? {
          value: parseInt(lastGlucoseEntry.value),
          occurredAt: lastGlucoseEntry.occurredAt,
          status: getGlucoseStatus(parseInt(lastGlucoseEntry.value)),
        } : undefined,
        recentEntries: patientEntries.length,
        lastEntryDate: patientEntries[0]?.occurredAt,
      };
    }));

    res.status(200).json({
      success: true,
      data: {
        totalPatients: patients.length,
        patients: transformedPatients,
      },
    });
  } catch (error) {
    logger.error('Error fetching patients:', error);
    res.status(500).json({ error: 'Failed to fetch patients' });
  }
}

async function createPatientHandler(req: NextApiRequest, res: NextApiResponse, userId: string) {
  try {
    // If userId is an email, find the user first
    let actualUserId = userId;
    if (userId.includes('@')) {
      const user = await findUserByEmail(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      actualUserId = user.id;
    }

    // Create a validation schema
    const createPatientSchema = z.object({
      name: z.string().min(1, 'Name is required'),
      dob: z.string().or(z.date()),
      diabetesType: z.enum(['type1', 'type2', 'gestational', 'other']),
      lifestyle: z.string().optional(),
      activityLevel: z.string().optional(),
      usualMedications: z.string().optional(),
    });

    const validatedData = createPatientSchema.parse(req.body);

    // Convert dates if they're strings
    const dob = validatedData.dob instanceof Date 
      ? validatedData.dob 
      : new Date(validatedData.dob);

    let parsedMedications: Medication[] = [];
    try {
      parsedMedications = JSON.parse(validatedData.usualMedications || '[]') as Medication[];
    } catch (error) {
      logger.error('Error parsing medications payload:', error);
      return res.status(400).json({ error: 'Invalid medications format' });
    }

    const patientData = {
      userId: actualUserId,
      name: validatedData.name,
      dob,
      diabetesType: validatedData.diabetesType,
      lifestyle: validatedData.lifestyle || '',
      activityLevel: validatedData.activityLevel || '',
      usualMedications: parsedMedications,
    };

    const newPatient = await createPatient(patientData);

    if (!newPatient) {
      return res.status(500).json({ error: 'Failed to create patient' });
    }

    // Transform for response
    const transformedPatient = {
      id: newPatient.id,
      name: newPatient.name,
      dob: newPatient.dob,
      diabetesType: newPatient.diabetesType,
      lifestyle: newPatient.lifestyle,
      activityLevel: newPatient.activityLevel,
      usualMedications: newPatient.usualMedications,
      createdAt: newPatient.createdAt,
      updatedAt: newPatient.updatedAt,
    };

    res.status(201).json({
      success: true,
      data: transformedPatient,
      message: 'Patient created successfully',
    });
  } catch (error) {
    logger.error('Error creating patient:', error);

    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: 'Failed to create patient' });
  }
}

function getGlucoseStatus(value: number): 'low' | 'normal' | 'high' {
  if (value < 70) {return 'low';}
  if (value > 180) {return 'high';}
  return 'normal';
} 
