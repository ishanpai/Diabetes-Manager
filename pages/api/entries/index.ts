import {
  NextApiRequest,
  NextApiResponse,
} from 'next';
import { getServerSession } from 'next-auth/next';

import { prisma } from '@/lib/database';
import { entrySchema } from '@/lib/validation';

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
      return createEntry(req, res, userId);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function getEntries(req: NextApiRequest, res: NextApiResponse, userId: string) {
  try {
    const { patientId, limit = '10', offset = '0' } = req.query;

    if (!patientId || typeof patientId !== 'string') {
      return res.status(400).json({ error: 'Patient ID is required' });
    }

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

    // Verify the patient belongs to the user
    const patient = await prisma.patient.findFirst({
      where: { 
        id: patientId,
        userId: actualUserId 
      },
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const entries = await prisma.entry.findMany({
      where: { patientId },
      orderBy: { occurredAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    });

    const totalEntries = await prisma.entry.count({
      where: { patientId },
    });

    // Transform the data to match our frontend expectations
    const transformedEntries = entries.map((entry: any) => ({
      id: entry.id,
      entryType: entry.entryType,
      value: entry.value,
      units: entry.units,
      medicationBrand: entry.medicationBrand,
      occurredAt: entry.occurredAt,
      createdAt: entry.createdAt,
    }));

    res.status(200).json({
      success: true,
      data: {
        entries: transformedEntries,
        totalEntries,
        hasMore: totalEntries > parseInt(offset as string) + entries.length,
      },
    });
  } catch (error) {
    console.error('Error fetching entries:', error);
    res.status(500).json({ error: 'Failed to fetch entries' });
  }
}

async function createEntry(req: NextApiRequest, res: NextApiResponse, userId: string) {
  try {
    const validatedData = entrySchema.parse(req.body);

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

    // Verify the patient belongs to the user
    const patient = await prisma.patient.findFirst({
      where: { 
        id: validatedData.patientId,
        userId: actualUserId 
      },
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const entry = await prisma.entry.create({
      data: {
        patientId: validatedData.patientId,
        entryType: validatedData.entryType,
        value: validatedData.value,
        units: 'units' in validatedData ? validatedData.units : undefined,
        medicationBrand: 'medicationBrand' in validatedData ? validatedData.medicationBrand : undefined,
        occurredAt: validatedData.occurredAt,
      },
    });

    // Transform for response
    const transformedEntry = {
      id: entry.id,
      entryType: entry.entryType,
      value: entry.value,
      units: entry.units,
      medicationBrand: entry.medicationBrand,
      occurredAt: entry.occurredAt,
      createdAt: entry.createdAt,
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