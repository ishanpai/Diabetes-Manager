import {
  NextApiRequest,
  NextApiResponse,
} from 'next';
import { getServerSession } from 'next-auth/next';

import { prisma } from '@/lib/database';
import { calculateAge } from '@/lib/dateUtils';
import { patientSchema } from '@/lib/validation';
import { parsePatientMedications } from '@/utils/patient';

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
    return res.status(400).json({ error: 'Invalid patient ID' });
  }

  switch (req.method) {
    case 'GET':
      return getPatient(req, res, userId, id);
    case 'PUT':
      return updatePatient(req, res, userId, id);
    case 'DELETE':
      return deletePatient(req, res, userId, id);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function getPatient(req: NextApiRequest, res: NextApiResponse, userId: string, patientId: string) {
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

    const patient = await prisma.patient.findFirst({
      where: {
        id: patientId,
        userId: actualUserId
      },
      include: {
        entries: {
          orderBy: { occurredAt: 'desc' },
          take: 10,
        },
        _count: {
          select: { entries: true },
        },
      },
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Parse the medications before sending to frontend
    const parsedPatient = parsePatientMedications(patient);

    // Add calculated age to the response
    const patientWithAge = {
      ...parsedPatient,
      age: calculateAge(parsedPatient.dob),
    };

    res.status(200).json({
      success: true,
      data: patientWithAge,
    });
  } catch (error) {
    console.error('Error fetching patient:', error);
    res.status(500).json({ error: 'Failed to fetch patient' });
  }
}

async function updatePatient(req: NextApiRequest, res: NextApiResponse, userId: string, patientId: string) {
  try {
    const validatedData = patientSchema.parse(req.body);

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

    const patient = await prisma.patient.findFirst({
      where: {
        id: patientId,
        userId: actualUserId
      },
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const updatedPatient = await prisma.patient.update({
      where: { id: patientId },
      data: {
        ...validatedData,
        dob: validatedData.dob instanceof Date ? validatedData.dob : new Date(validatedData.dob),
        usualMedications: JSON.stringify(validatedData.usualMedications),
      },
      include: {
        entries: true,
        _count: {
          select: { entries: true },
        },
      },
    });

    // Parse the medications before sending to frontend
    const parsedPatient = parsePatientMedications(updatedPatient);

    // Add calculated age to the response
    const patientWithAge = {
      ...parsedPatient,
      age: calculateAge(parsedPatient.dob),
    };

    res.status(200).json({
      success: true,
      data: patientWithAge,
      message: 'Patient updated successfully',
    });
  } catch (error) {
    console.error('Error updating patient:', error);

    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: 'Failed to update patient' });
  }
}

async function deletePatient(req: NextApiRequest, res: NextApiResponse, userId: string, patientId: string) {
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

    const patient = await prisma.patient.findFirst({
      where: {
        id: patientId,
        userId: actualUserId
      },
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    await prisma.patient.delete({
      where: { id: patientId },
    });

    res.status(200).json({
      success: true,
      message: 'Patient deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting patient:', error);
    res.status(500).json({ error: 'Failed to delete patient' });
  }
}