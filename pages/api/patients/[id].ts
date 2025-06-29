import {
  NextApiRequest,
  NextApiResponse,
} from 'next';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';

import {
  deletePatient,
  findPatientById,
  findUserByEmail,
  updatePatient,
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
    return res.status(400).json({ error: 'Invalid patient ID' });
  }

  switch (req.method) {
    case 'GET':
      return getPatient(req, res, userId, id);
    case 'PUT':
      return updatePatientHandler(req, res, userId, id);
    case 'DELETE':
      return deletePatientHandler(req, res, userId, id);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function getPatient(req: NextApiRequest, res: NextApiResponse, userId: string, patientId: string) {
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

    // Fetch patient and await the result
    const patient = await findPatientById(patientId);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found or access denied' });
    }

    res.status(200).json({
      success: true,
      data: patient,
    });
  } catch (error) {
    console.error('Error fetching patient:', error);
    res.status(500).json({ error: 'Failed to fetch patient' });
  }
}

async function updatePatientHandler(req: NextApiRequest, res: NextApiResponse, userId: string, patientId: string) {
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

    // Fetch patient and await the result
    const patient = await findPatientById(patientId);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found or access denied' });
    }
    if ((patient as any).userId !== actualUserId) {
      return res.status(404).json({ error: 'Patient not found or access denied' });
    }
    // Create a validation schema
    const updatePatientSchema = z.object({
      name: z.string().min(1, 'Name is required').optional(),
      dob: z.string().or(z.date()).optional(),
      diabetesType: z.enum(['type1', 'type2', 'gestational', 'other']).optional(),
      lifestyle: z.string().optional(),
      activityLevel: z.string().optional(),
      usualMedications: z.string().optional(),
    });

    const validatedData = updatePatientSchema.parse(req.body);

    // Prepare update data
    const updateData: any = {};

    if (validatedData.name !== undefined) {
      updateData.name = validatedData.name;
    }

    if (validatedData.dob !== undefined) {
      updateData.dob = validatedData.dob instanceof Date 
        ? validatedData.dob 
        : new Date(validatedData.dob);
    }

    if (validatedData.diabetesType !== undefined) {
      updateData.diabetesType = validatedData.diabetesType;
    }

    if (validatedData.lifestyle !== undefined) {
      updateData.lifestyle = validatedData.lifestyle;
    }

    if (validatedData.activityLevel !== undefined) {
      updateData.activityLevel = validatedData.activityLevel;
    }

    if (validatedData.usualMedications !== undefined) {
      updateData.usualMedications = validatedData.usualMedications;
    }

    const updatedPatient = await updatePatient(patientId, updateData);

    if (!updatedPatient) {
      return res.status(404).json({ error: 'Patient not found' });
    }


    res.status(200).json({
      success: true,
      data: updatedPatient,
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

async function deletePatientHandler(req: NextApiRequest, res: NextApiResponse, userId: string, patientId: string) {
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

    // Fetch patient and await the result
    const patient = await findPatientById(patientId);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found or access denied' });
    }
    if ((patient as any).userId !== actualUserId) {
      return res.status(404).json({ error: 'Patient not found or access denied' });
    }

    const success = deletePatient(patientId);

    if (!success) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Patient deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting patient:', error);
    res.status(500).json({ error: 'Failed to delete patient' });
  }
}