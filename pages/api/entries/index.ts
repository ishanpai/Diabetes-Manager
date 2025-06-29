import {
  NextApiRequest,
  NextApiResponse,
} from 'next';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';

import {
  createEntry,
  findEntriesByPatientId,
  findPatientsByUserId,
  findUserByEmail,
} from '@/lib/database';

import NextAuth from '../auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, NextAuth);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Access user ID from session - handle both possible structures
  const userId = (session as any).user?.id || (session as any).user?.email;

  if (!userId) {
    return res.status(401).json({ error: 'User ID not found' });
  }

  switch (req.method) {
    case 'GET':
      return getEntries(req, res, userId);
    case 'POST':
      return createEntryHandler(req, res, userId);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function getEntries(req: NextApiRequest, res: NextApiResponse, userId: string) {
  try {
    // If userId is an email, find the user first
    let actualUserId = userId;
    if (userId.includes('@')) {
      const user = findUserByEmail(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      actualUserId = user.id;
    }

    // Get query parameters
    const { patientId, limit = 10, offset = 0, entryType, date, startDate, endDate } = req.query;
    const limitNum = parseInt(limit as string, 10);
    const offsetNum = parseInt(offset as string, 10);

    let entries = [];

    if (patientId && typeof patientId === 'string') {
      // Get entries for a specific patient
      // First verify the patient belongs to the user
      const patients = findPatientsByUserId(actualUserId);
      const patient = patients.find(p => p.id === patientId);
      
      if (!patient) {
        return res.status(404).json({ error: 'Patient not found or access denied' });
      }

      // Get entries for this specific patient
      entries = findEntriesByPatientId(patientId, limitNum, offsetNum);
      
      // Filter by entry type if specified
      if (entryType && typeof entryType === 'string') {
        entries = entries.filter(entry => entry.entryType === entryType);
      }
      
      // Filter by date range if specified
      if (startDate && endDate && typeof startDate === 'string' && typeof endDate === 'string') {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        entries = entries.filter(entry => {
          const entryDate = new Date(entry.occurredAt);
          return entryDate >= start && entryDate <= end;
        });
      }
      // Filter by single date if specified (for backward compatibility)
      else if (date && typeof date === 'string') {
        const targetDate = new Date(date);
        const targetDateStr = targetDate.toISOString().split('T')[0]; // YYYY-MM-DD format
        
        entries = entries.filter(entry => {
          const entryDate = new Date(entry.occurredAt);
          const entryDateStr = entryDate.toISOString().split('T')[0];
          return entryDateStr === targetDateStr;
        });
      }
    } else {
      // Get all entries for all patients of the user
      const patients = findPatientsByUserId(actualUserId);
      
      for (const patient of patients) {
        const patientEntries = findEntriesByPatientId(patient.id, limitNum, offsetNum);
        entries.push(...patientEntries);
      }
      
      // Apply filters to all entries
      if (entryType && typeof entryType === 'string') {
        entries = entries.filter(entry => entry.entryType === entryType);
      }
      
      // Filter by date range if specified
      if (startDate && endDate && typeof startDate === 'string' && typeof endDate === 'string') {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        entries = entries.filter(entry => {
          const entryDate = new Date(entry.occurredAt);
          return entryDate >= start && entryDate <= end;
        });
      }
      // Filter by single date if specified (for backward compatibility)
      else if (date && typeof date === 'string') {
        const targetDate = new Date(date);
        const targetDateStr = targetDate.toISOString().split('T')[0];
        
        entries = entries.filter(entry => {
          const entryDate = new Date(entry.occurredAt);
          const entryDateStr = entryDate.toISOString().split('T')[0];
          return entryDateStr === targetDateStr;
        });
      }
    }

    // Transform entries for response
    const transformedEntries = entries.map(entry => ({
      id: entry.id,
      entryType: entry.entryType,
      value: entry.value,
      units: entry.units,
      medicationBrand: entry.medicationBrand,
      occurredAt: entry.occurredAt,
      createdAt: entry.createdAt,
      patientId: entry.patientId,
    }));

    res.status(200).json({
      success: true,
      data: transformedEntries,
    });
  } catch (error) {
    console.error('Error fetching entries:', error);
    res.status(500).json({ error: 'Failed to fetch entries' });
  }
}

async function createEntryHandler(req: NextApiRequest, res: NextApiResponse, userId: string) {
  try {
    // If userId is an email, find the user first
    let actualUserId = userId;
    if (userId.includes('@')) {
      const user = findUserByEmail(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      actualUserId = user.id;
    }

    // Create a validation schema
    const createEntrySchema = z.discriminatedUnion('entryType', [
      z.object({
        entryType: z.literal('glucose'),
        value: z.string().min(1, 'Glucose value is required'),
        units: z.enum(['mg/dL', 'mmol/L']),
        occurredAt: z.string().or(z.date()),
        patientId: z.string().min(1, 'Patient ID is required'),
      }),
      z.object({
        entryType: z.literal('meal'),
        value: z.string().min(1, 'Meal description is required'),
        occurredAt: z.string().or(z.date()),
        patientId: z.string().min(1, 'Patient ID is required'),
      }),
      z.object({
        entryType: z.literal('insulin'),
        value: z.string().min(1, 'Insulin dose is required'),
        units: z.string().min(1, 'Units are required for insulin'),
        medicationBrand: z.string().optional(),
        occurredAt: z.string().or(z.date()),
        patientId: z.string().min(1, 'Patient ID is required'),
      }),
    ]);

    const validatedData = createEntrySchema.parse(req.body);

    // Convert occurredAt to Date if it's a string
    const occurredAt = validatedData.occurredAt instanceof Date 
      ? validatedData.occurredAt 
      : new Date(validatedData.occurredAt);

    // Prepare entry data
    const entryData: any = {
      entryType: validatedData.entryType,
      value: validatedData.value,
      occurredAt,
      patientId: validatedData.patientId,
    };

    // Add insulin-specific fields if present
    if (validatedData.entryType === 'insulin') {
      entryData.units = validatedData.units;
      entryData.medicationBrand = validatedData.medicationBrand;
    } else if (validatedData.entryType === 'glucose') {
      entryData.units = validatedData.units;
    }

    // Debug: log the entry data before creating
    console.log('Creating entry with data:', JSON.stringify(entryData, null, 2));

    const newEntry = createEntry(entryData);

    if (!newEntry) {
      return res.status(500).json({ error: 'Failed to create entry' });
    }

    // Transform for response
    const transformedEntry = {
      id: newEntry.id,
      entryType: newEntry.entryType,
      value: newEntry.value,
      units: newEntry.units,
      medicationBrand: newEntry.medicationBrand,
      occurredAt: newEntry.occurredAt,
      createdAt: newEntry.createdAt,
      patientId: newEntry.patientId,
    };

    res.status(201).json({
      success: true,
      data: transformedEntry,
      message: 'Entry created successfully',
    });
  } catch (error) {
    console.error('Error creating entry:', error);

    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: 'Failed to create entry' });
  }
} 