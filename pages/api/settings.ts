import {
  NextApiRequest,
  NextApiResponse,
} from 'next';
import { z } from 'zod';

import {
  findUserSettingsByUserId,
  upsertUserSettings,
} from '@/lib/database';
import { logger } from '@/lib/logger';
import { getSessionUserId } from '@/lib/utils/session';

import { authOptions } from './auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = await getSessionUserId(req, res, authOptions);

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  switch (req.method) {
    case 'GET':
      return getSettings(req, res, userId);
    case 'PUT':
      return updateSettings(req, res, userId);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function getSettings(req: NextApiRequest, res: NextApiResponse, userId: string) {
  try {
    const settings = await findUserSettingsByUserId(userId);
    
    // Return default settings if none exist
    const defaultSettings = {
      glucoseUnits: 'mg/dL' as const,
    };

    res.status(200).json({
      success: true,
      data: settings ? {
        glucoseUnits: settings.glucoseUnits,
      } : defaultSettings,
    });
  } catch (error) {
    logger.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
}

async function updateSettings(req: NextApiRequest, res: NextApiResponse, userId: string) {
  try {
    // Create a validation schema
    const updateSettingsSchema = z.object({
      glucoseUnits: z.enum(['mg/dL', 'mmol/L']).optional(),
    });

    const validatedData = updateSettingsSchema.parse(req.body);

    // Update settings in database
    const updatedSettings = await upsertUserSettings(userId, validatedData.glucoseUnits || 'mg/dL');

    if (!updatedSettings) {
      return res.status(500).json({ error: 'Failed to update settings' });
    }

    res.status(200).json({
      success: true,
      data: {
        glucoseUnits: updatedSettings.glucoseUnits,
      },
      message: 'Settings updated successfully',
    });
  } catch (error) {
    logger.error('Error updating settings:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid settings data' });
    }

    res.status(500).json({ error: 'Failed to update settings' });
  }
} 
