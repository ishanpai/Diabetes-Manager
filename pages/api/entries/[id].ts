import {
  NextApiRequest,
  NextApiResponse,
} from 'next';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';

import {
  deleteEntry,
  findEntryById,
  findPatientById,
  findUserByEmail,
  updateEntry,
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

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid entry ID' });
  }

  switch (req.method) {
    case 'GET':
      return getEntry(req, res, userId, id);
    case 'PUT':
      return updateEntryHandler(req, res, userId, id);
    case 'DELETE':
      return deleteEntryHandler(req, res, userId, id);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function getEntry(req: NextApiRequest, res: NextApiResponse, userId: string, entryId: string) {
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

    const entry = findEntryById(entryId);
    if (!entry) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    // Verify the entry belongs to a patient owned by the user
    const patient = findPatientById(entry.patientId);
    if (!patient || patient.userId !== actualUserId) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    // Transform for response
    const transformedEntry = {
      id: entry.id,
      entryType: entry.entryType,
      value: entry.value,
      units: entry.units,
      medicationBrand: entry.medicationBrand,
      occurredAt: entry.occurredAt,
      createdAt: entry.createdAt,
      patientId: entry.patientId,
    };

    res.status(200).json({
      success: true,
      data: transformedEntry,
    });
  } catch (error) {
    console.error('Error fetching entry:', error);
    res.status(500).json({ error: 'Failed to fetch entry' });
  }
}

async function updateEntryHandler(req: NextApiRequest, res: NextApiResponse, userId: string, entryId: string) {
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

    // Verify the entry belongs to a patient owned by the user
    const existingEntry = findEntryById(entryId);
    if (!existingEntry) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    const patient = findPatientById(existingEntry.patientId);
    if (!patient || patient.userId !== actualUserId) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    // Create a validation schema without patientId requirement for updates
    const updateEntrySchema = z.discriminatedUnion('entryType', [
      z.object({
        entryType: z.literal('glucose'),
        value: z.string().min(1, 'Glucose value is required'),
        occurredAt: z.string().or(z.date()),
      }),
      z.object({
        entryType: z.literal('meal'),
        value: z.string().min(1, 'Meal description is required'),
        occurredAt: z.string().or(z.date()),
      }),
      z.object({
        entryType: z.literal('insulin'),
        value: z.string().min(1, 'Insulin dose is required'),
        units: z.string().min(1, 'Units are required for insulin'),
        medicationBrand: z.string().optional(),
        occurredAt: z.string().or(z.date()),
      }),
    ]);

    const validatedData = updateEntrySchema.parse(req.body);

    // Convert occurredAt to Date if it's a string
    const occurredAt = validatedData.occurredAt instanceof Date 
      ? validatedData.occurredAt 
      : new Date(validatedData.occurredAt);

    // Prepare update data
    const updateData: any = {
      entryType: validatedData.entryType,
      value: validatedData.value,
      occurredAt,
    };

    // Add insulin-specific fields if present
    if (validatedData.entryType === 'insulin') {
      updateData.units = validatedData.units;
      updateData.medicationBrand = validatedData.medicationBrand;
    }

    const updatedEntry = updateEntry(entryId, updateData);

    if (!updatedEntry) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    // Transform for response
    const transformedEntry = {
      id: updatedEntry.id,
      entryType: updatedEntry.entryType,
      value: updatedEntry.value,
      units: updatedEntry.units,
      medicationBrand: updatedEntry.medicationBrand,
      occurredAt: updatedEntry.occurredAt,
      createdAt: updatedEntry.createdAt,
    };

    res.status(200).json({
      success: true,
      data: transformedEntry,
      message: 'Entry updated successfully',
    });
  } catch (error) {
    console.error('Error updating entry:', error);

    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: 'Failed to update entry' });
  }
}

async function deleteEntryHandler(req: NextApiRequest, res: NextApiResponse, userId: string, entryId: string) {
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

    // Verify the entry belongs to a patient owned by the user
    const entry = findEntryById(entryId);
    if (!entry) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    const patient = findPatientById(entry.patientId);
    if (!patient || patient.userId !== actualUserId) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    const success = deleteEntry(entryId);

    if (!success) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Entry deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting entry:', error);
    res.status(500).json({ error: 'Failed to delete entry' });
  }
} 