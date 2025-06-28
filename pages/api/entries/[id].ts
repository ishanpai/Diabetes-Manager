import {
  NextApiRequest,
  NextApiResponse,
} from 'next';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';

import { prisma } from '@/lib/database';

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
      return updateEntry(req, res, userId, id);
    case 'DELETE':
      return deleteEntry(req, res, userId, id);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function getEntry(req: NextApiRequest, res: NextApiResponse, userId: string, entryId: string) {
  try {
    // If userId is an email, find the user first
    let actualUserId = userId;
    if (userId.includes('@')) {
      const user = await prisma.user.findUnique({
        where: { email: userId }
      });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      actualUserId = user.id;
    }

    const entry = await prisma.entry.findFirst({
      where: { 
        id: entryId,
        patient: {
          userId: actualUserId
        }
      },
      include: {
        patient: true,
      },
    });

    if (!entry) {
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

async function updateEntry(req: NextApiRequest, res: NextApiResponse, userId: string, entryId: string) {
  try {
    // If userId is an email, find the user first
    let actualUserId = userId;
    if (userId.includes('@')) {
      const user = await prisma.user.findUnique({
        where: { email: userId }
      });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      actualUserId = user.id;
    }

    // Verify the entry belongs to a patient owned by the user
    const existingEntry = await prisma.entry.findFirst({
      where: { 
        id: entryId,
        patient: {
          userId: actualUserId
        }
      },
    });

    if (!existingEntry) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    // Create a validation schema without patientId requirement for updates
    const updateEntrySchema = z.discriminatedUnion('entryType', [
      z.object({
        entryType: z.literal('glucose'),
        value: z.string().refine((val) => {
          const num = parseFloat(val);
          return !isNaN(num) && num >= 40 && num <= 600;
        }, 'Glucose must be between 40 and 600 mg/dL'),
        units: z.enum(['mg/dL', 'mmol/L']),
        occurredAt: z.preprocess((val) => {
          if (typeof val === 'string') {
            return new Date(val);
          }
          return val;
        }, z.date({
          required_error: "Date and time is required",
          invalid_type_error: "Invalid date format",
        })),
      }),
      z.object({
        entryType: z.literal('meal'),
        value: z.string().min(1, 'Meal description is required'),
        occurredAt: z.preprocess((val) => {
          if (typeof val === 'string') {
            return new Date(val);
          }
          return val;
        }, z.date({
          required_error: "Date and time is required",
          invalid_type_error: "Invalid date format",
        })),
      }),
      z.object({
        entryType: z.literal('insulin'),
        value: z.string().refine((val) => {
          const num = parseFloat(val);
          return !isNaN(num) && num >= 0 && num <= 50;
        }, 'Insulin dose must be between 0 and 50 IU'),
        units: z.literal('IU'),
        medicationBrand: z.string().min(1, 'Medication brand is required'),
        occurredAt: z.preprocess((val) => {
          if (typeof val === 'string') {
            return new Date(val);
          }
          return val;
        }, z.date({
          required_error: "Date and time is required",
          invalid_type_error: "Invalid date format",
        })),
      }),
    ]);

    const validatedData = updateEntrySchema.parse(req.body);

    const updatedEntry = await prisma.entry.update({
      where: { id: entryId },
      data: {
        entryType: validatedData.entryType,
        value: validatedData.value,
        units: 'units' in validatedData ? validatedData.units : undefined,
        medicationBrand: 'medicationBrand' in validatedData ? validatedData.medicationBrand : undefined,
        occurredAt: validatedData.occurredAt,
      },
    });

    // Transform for response
    const transformedEntry = {
      id: updatedEntry.id,
      entryType: updatedEntry.entryType,
      value: updatedEntry.value,
      units: updatedEntry.units,
      medicationBrand: updatedEntry.medicationBrand,
      occurredAt: updatedEntry.occurredAt,
      createdAt: updatedEntry.createdAt,
      patientId: updatedEntry.patientId,
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

async function deleteEntry(req: NextApiRequest, res: NextApiResponse, userId: string, entryId: string) {
  try {
    // If userId is an email, find the user first
    let actualUserId = userId;
    if (userId.includes('@')) {
      const user = await prisma.user.findUnique({
        where: { email: userId }
      });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      actualUserId = user.id;
    }

    // Verify the entry belongs to a patient owned by the user
    const entry = await prisma.entry.findFirst({
      where: { 
        id: entryId,
        patient: {
          userId: actualUserId
        }
      },
    });

    if (!entry) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    await prisma.entry.delete({
      where: { id: entryId },
    });

    res.status(200).json({
      success: true,
      message: 'Entry deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting entry:', error);
    res.status(500).json({ error: 'Failed to delete entry' });
  }
} 