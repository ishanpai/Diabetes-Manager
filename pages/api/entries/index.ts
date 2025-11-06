import {
  NextApiRequest,
  NextApiResponse,
} from 'next';
import { z } from 'zod';

import {
  countEntriesByPatientId,
  createEntry,
  findEntriesByPatientId,
  findEntriesByPatientIdAndType,
  findUserByEmail,
} from '@/lib/database';
import { logger } from '@/lib/logger';
import { getSessionUserId } from '@/lib/utils/session';
import type { Entry } from '@/types';

import NextAuth from '../auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = await getSessionUserId(req, res, NextAuth);

  if (!userId) {
    return res.status(401).json({ error: 'User ID not found' });
  }

  switch (req.method) {
    case 'GET':
      return getEntries(req, res);
    case 'POST':
      return createEntryHandler(req, res, userId);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function getEntries(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { patientId, limit, offset, entryType, startDate, endDate } = req.query;

    if (!patientId || typeof patientId !== 'string') {
      return res.status(400).json({ success: false, error: 'Patient ID is required' });
    }

    const parsedLimit = limit ? parseInt(limit as string, 10) : 25;
    const parsedOffset = offset ? parseInt(offset as string, 10) : 0;

    let entries: Entry[] = [];
    let totalCount = 0;

    // If filtering by entry type, use the filtered function
    if (entryType && typeof entryType === 'string' && ['glucose', 'meal', 'insulin'].includes(entryType)) {
      entries = await findEntriesByPatientIdAndType(patientId, entryType as 'glucose' | 'meal' | 'insulin', parsedLimit, parsedOffset);
      
      // For now, we'll get all entries of this type and count them
      // In a production app, you'd want a separate count function for filtered results
      const allEntriesOfType = await findEntriesByPatientIdAndType(patientId, entryType as 'glucose' | 'meal' | 'insulin', 10000, 0);
      totalCount = allEntriesOfType.length;
    } else {
      // Get total count and entries in parallel for unfiltered results
      [totalCount, entries] = await Promise.all([
        countEntriesByPatientId(patientId),
        findEntriesByPatientId(patientId, parsedLimit, parsedOffset)
      ]);
    }

    // Apply date filtering if provided
    if (startDate && endDate && typeof startDate === 'string' && typeof endDate === 'string') {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      entries = entries.filter(entry => {
        const entryDate = new Date(entry.occurredAt);
        return entryDate >= start && entryDate <= end;
      });
      
      // Recalculate total count for filtered results
      totalCount = entries.length;
    }

    const hasMore = parsedOffset + parsedLimit < totalCount;

    return res.status(200).json({
      success: true,
      data: entries,
      totalCount,
      hasMore,
    });
  } catch (error) {
    logger.error('Error fetching entries:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

async function createEntryHandler(req: NextApiRequest, res: NextApiResponse, userId: string) {
  try {
    // If userId is an email, find the user first
    if (userId.includes('@')) {
      const user = await findUserByEmail(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
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
    const entryData: Parameters<typeof createEntry>[0] = {
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
    logger.info('Creating entry with data:', JSON.stringify(entryData, null, 2));

    const newEntry = await createEntry(entryData);

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
    logger.error('Error creating entry:', error);

    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: 'Failed to create entry' });
  }
} 
