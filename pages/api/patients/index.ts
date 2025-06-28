import {
  NextApiRequest,
  NextApiResponse,
} from 'next';
import { getServerSession } from 'next-auth/next';

import { prisma } from '@/lib/database';
import { calculateAge } from '@/lib/dateUtils';
import { patientSchema } from '@/lib/validation';
import {
  parsePatientMedications,
  parsePatientsMedications,
} from '@/utils/patient';

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
      return getPatients(req, res, userId);
    case 'POST':
      return createPatient(req, res, userId);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function getPatients(req: NextApiRequest, res: NextApiResponse, userId: string) {
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

    const patients = await prisma.patient.findMany({
      where: { userId: actualUserId },
      include: {
        entries: {
          orderBy: { occurredAt: 'desc' },
          take: 1,
        },
        _count: {
          select: {
            entries: {
              where: {
                occurredAt: {
                  gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
                },
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Parse medications for all patients
    const patientsWithParsedMedications = parsePatientsMedications(patients);

    // Transform the data to match our frontend expectations
    const transformedPatients = patientsWithParsedMedications.map((patient: any) => {
      const lastGlucoseEntry = patient.entries.find((entry: any) => entry.entryType === 'glucose');
      
      return {
        id: patient.id,
        name: patient.name,
        dob: patient.dob,
        diabetesType: patient.diabetesType,
        lifestyle: patient.lifestyle,
        activityLevel: patient.activityLevel,
        medications: patient.usualMedications, // Now using the parsed medications
        createdAt: patient.createdAt,
        updatedAt: patient.updatedAt,
        age: calculateAge(patient.dob),
        lastGlucoseReading: lastGlucoseEntry ? {
          value: parseInt(lastGlucoseEntry.value),
          occurredAt: lastGlucoseEntry.occurredAt,
          status: getGlucoseStatus(parseInt(lastGlucoseEntry.value)),
        } : undefined,
        recentEntries: patient._count.entries,
        lastEntryDate: patient.entries[0]?.occurredAt,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        totalPatients: patients.length,
        patients: transformedPatients,
      },
    });
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ error: 'Failed to fetch patients' });
  }
}

async function createPatient(req: NextApiRequest, res: NextApiResponse, userId: string) {
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

    // Convert form data to database format
    const patientData = {
      ...validatedData,
      dob: validatedData.dob instanceof Date ? validatedData.dob : new Date(validatedData.dob),
      userId: actualUserId,
      usualMedications: JSON.stringify(validatedData.usualMedications),
    };

    const patient = await prisma.patient.create({
      data: patientData,
      include: {
        entries: true,
        _count: {
          select: { entries: true },
        },
      },
    });

    // Parse medications and transform for response
    const parsedPatient = parsePatientMedications(patient);
    const transformedPatient = {
      id: parsedPatient.id,
      name: parsedPatient.name,
      dob: parsedPatient.dob,
      diabetesType: parsedPatient.diabetesType,
      lifestyle: parsedPatient.lifestyle,
      activityLevel: parsedPatient.activityLevel,
      medications: parsedPatient.usualMedications,
      createdAt: parsedPatient.createdAt,
      updatedAt: parsedPatient.updatedAt,
      age: calculateAge(parsedPatient.dob),
      recentEntries: 0,
    };

    res.status(201).json({
      success: true,
      data: transformedPatient,
      message: 'Patient created successfully',
    });
  } catch (error) {
    console.error('Error creating patient:', error);
    
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to create patient' });
  }
}

function getGlucoseStatus(value: number): 'low' | 'normal' | 'high' {
  if (value < 70) return 'low';
  if (value > 180) return 'high';
  return 'normal';
} 