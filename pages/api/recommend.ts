import {
  NextApiRequest,
  NextApiResponse,
} from 'next';
import { z } from 'zod';

import { GLUCOSE_TARGET_RANGES } from '@/lib/config';
import {
  createRecommendation,
  findEntriesByPatientId,
  findPatientById,
  findUserByEmail,
} from '@/lib/database';
import { logger } from '@/lib/logger';
import { getSessionUserId } from '@/lib/utils/session';
import type {
  Entry,
  Medication,
  Patient,
  Recommendation,
} from '@/types';
import OpenAI from 'openai';

import NextAuth from './auth/[...nextauth]';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.MODEL_API_KEY,
});

const recommendSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  targetTime: z.string().optional(), // ISO string for target time
  timezone: z.string().optional(),
});

type RecommendationPayload = Recommendation & { targetTime?: Date };

type SSEMessage =
  | { type: 'progress'; step: string; message?: string }
  | { type: 'error'; error: string }
  | { type: 'result'; data: RecommendationPayload };

type AIRecommendationResult = Pick<
  Recommendation,
  'doseUnits' | 'medicationName' | 'reasoning' | 'safetyNotes' | 'confidence' | 'recommendedMonitoring'
>;

type PromptPatient = Patient & {
  usualMedications?: Medication[] | string | null;
};

// Utility function to format date in local time
function formatLocalTime(date: Date, timeZone: string = 'UTC'): string {
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short',
    timeZone,
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = await getSessionUserId(req, res, NextAuth);

  if (!userId) {
    return res.status(401).json({ error: 'User ID not found' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  return createRecommendationHandler(req, res, userId);
}

async function createRecommendationHandler(req: NextApiRequest, res: NextApiResponse, userId: string) {
  try {
    // Debug: log the incoming request body
    logger.debug('Incoming /api/recommend request body:', req.body);
    
    // Set up SSE headers for streaming
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    });

    const sendProgress = (step: string, message?: string) => {
      const payload: SSEMessage = { type: 'progress', step, message };
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    const sendError = (error: string) => {
      const payload: SSEMessage = { type: 'error', error };
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
      res.end();
    };

    const sendResult = (data: RecommendationPayload) => {
      const message: SSEMessage = { type: 'result', data };
      res.write(`data: ${JSON.stringify(message)}\n\n`);
      res.end();
    };
    
    // If userId is an email, find the user first
    let actualUserId = userId;
    if (userId.includes('@')) {
      const user = await findUserByEmail(userId);
      if (!user) {
        return sendError('User not found');
      }
      actualUserId = user.id;
    }

    // Validate request body
    let validatedData;
    try {
      validatedData = recommendSchema.parse(req.body);
    } catch (validationError) {
      logger.error('Validation error in /api/recommend:', validationError);
      return sendError('Validation failed');
    }

    const { patientId, targetTime, timezone } = validatedData;
    const userTimezone = timezone || 'UTC';
    logger.debug('Validated data:', { patientId, targetTime, timezone });

    // Parse target time if provided
    const targetDateTime = targetTime ? new Date(targetTime) : new Date();
    logger.debug('Target datetime:', targetDateTime);

    // Check authentication and send progress
    sendProgress('gathering-data', 'Checking authentication...');
    await new Promise(resolve => setTimeout(resolve, 500)); // Small delay for visibility

    // Verify patient exists and belongs to user
    sendProgress('gathering-data', 'Loading patient data...');
    await new Promise(resolve => setTimeout(resolve, 300));
    const patient = await findPatientById(patientId);
    if (!patient) {
      return sendError('Patient not found');
    }

    if (patient.userId !== actualUserId) {
      return sendError('Patient not found');
    }

    // Get recent entries for the last 72 hours
    sendProgress('gathering-data', 'Loading recent entries...');
    await new Promise(resolve => setTimeout(resolve, 400));
    const entries = await findEntriesByPatientId(patientId);
    const recentEntries = entries.filter(entry => 
      new Date(entry.occurredAt) >= new Date(Date.now() - 72 * 60 * 60 * 1000)
    );
    logger.debug('Recent entries count:', recentEntries.length);
    sendProgress('gathering-data', `Found ${recentEntries.length} recent entries`);

    // Check if patient has sufficient history for recommendations
    const hasSufficientHistory = checkSufficientHistory(entries);
    if (!hasSufficientHistory.hasSufficientHistory) {
      return sendError(hasSufficientHistory.message);
    }

    // Build the prompt for the AI model
    sendProgress('building-prompt', 'Building AI prompt...');
    await new Promise(resolve => setTimeout(resolve, 400));
    const prompt = buildRecommendationPrompt(patient, recentEntries, targetDateTime, userTimezone);
    sendProgress('building-prompt', 'Prompt built successfully');
    await new Promise(resolve => setTimeout(resolve, 300));

    // Call OpenAI API for recommendation
    sendProgress('waiting-for-model', 'Calling AI model...');
    const aiRecommendation = await getAIRecommendation(prompt);
    logger.debug('AI recommendation received:', aiRecommendation);
    sendProgress('waiting-for-model', 'AI response received');
    await new Promise(resolve => setTimeout(resolve, 300));

    // Parse and save the recommendation
    sendProgress('parsing-response', 'Processing recommendation...');
    await new Promise(resolve => setTimeout(resolve, 400));
    const savedRecommendation = await createRecommendation({
      patientId,
      prompt,
      response: aiRecommendation.reasoning ?? 'No reasoning provided',
      doseUnits: aiRecommendation.doseUnits,
      medicationName: aiRecommendation.medicationName,
      reasoning: aiRecommendation.reasoning,
      safetyNotes: aiRecommendation.safetyNotes,
      confidence: aiRecommendation.confidence,
      recommendedMonitoring: aiRecommendation.recommendedMonitoring,
    });

    if (!savedRecommendation) {
      return sendError('Failed to save recommendation');
    }

    logger.info('Recommendation saved to database');
    sendProgress('parsing-response', 'Recommendation saved');
    await new Promise(resolve => setTimeout(resolve, 300));

    const result: RecommendationPayload = {
      id: savedRecommendation.id,
      patientId: savedRecommendation.patientId,
      prompt: savedRecommendation.prompt,
      response: savedRecommendation.response,
      doseUnits: savedRecommendation.doseUnits,
      medicationName: savedRecommendation.medicationName,
      reasoning: savedRecommendation.reasoning,
      safetyNotes: savedRecommendation.safetyNotes,
      confidence: savedRecommendation.confidence,
      recommendedMonitoring: savedRecommendation.recommendedMonitoring,
      createdAt: savedRecommendation.createdAt,
      targetTime: targetDateTime,
    };

    sendResult(result);
  } catch (error) {
    logger.error('Recommendation error:', error);
    logger.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    if (error instanceof z.ZodError) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: 'Invalid request data', details: error.errors })}\n\n`);
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', error: 'Internal server error' })}\n\n`);
    }
    res.end();
  }
}

function buildRecommendationPrompt(
  patient: PromptPatient,
  entries: Entry[],
  targetTime: Date,
  timeZone: string,
) {
  // Handle usualMedications - it could be a JSON string or already an object/array
  let medications: Medication[] = [];
  try {
    if (typeof patient.usualMedications === 'string') {
      medications = JSON.parse(patient.usualMedications || '[]') as Medication[];
    } else if (Array.isArray(patient.usualMedications)) {
      medications = patient.usualMedications;
    } else {
      medications = [];
    }
  } catch (error) {
    logger.error('Error parsing usualMedications:', error);
    medications = [];
  }

  // Calculate age
  const age = Math.floor((new Date().getTime() - new Date(patient.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));

  // Analyze medication timing patterns from recent history
  const insulinEntries = entries.filter((entry) => entry.entryType === 'insulin');
  const medicationPatterns = analyzeMedicationPatterns(insulinEntries, targetTime, timeZone);

  const patientInfo = `
<PATIENT_INFO>
- Name: ${patient.name}
- Age: ${age} years old
- Diabetes Type: ${patient.diabetesType}
- Lifestyle: ${patient.lifestyle || 'Not specified'}
- Activity Level: ${patient.activityLevel || 'Not specified'}
- Usual Medications: ${medications.map((med: Medication) => `${med.brand} ${med.dosage} (${med.timing})`).join(', ')}
</PATIENT_INFO>
`;

  const targetTimeInfo = `
<TARGET_TIME>
Target Administration Time: ${formatLocalTime(targetTime, timeZone)}
</TARGET_TIME>
`;

  // Sort entries by occurredAt in descending order (newest first) for better AI comprehension
  const sortedEntries = [...entries].sort((a, b) => 
    new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
  );

  // Separate entries into most recent (last 24 hours) and older (24-72 hours)
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  const mostRecentEntries = sortedEntries.filter(entry => 
    new Date(entry.occurredAt) >= twentyFourHoursAgo
  );
  
  const olderEntries = sortedEntries.filter(entry => 
    new Date(entry.occurredAt) < twentyFourHoursAgo
  );

  const recentHistory = entries.length > 0 
    ? `<RECENT_HISTORY>
${mostRecentEntries.length > 0 ? `MOST RECENT ENTRIES (Last 24 hours):
${mostRecentEntries.map(entry => `<${entry.entryType.toUpperCase()}>
    <VALUE>${entry.value}${entry.units ? ` ${entry.units}` : ''} ${entry.medicationBrand ? `(${entry.medicationBrand})` : ''}</VALUE>
    <OCCURRED_AT>${formatLocalTime(new Date(entry.occurredAt), timeZone)}</OCCURRED_AT>
    </${entry.entryType.toUpperCase()}>`).join('\n')}` : 'No entries in the last 24 hours.'}

${olderEntries.length > 0 ? `OLDER ENTRIES (24-72 hours ago):
${olderEntries.map(entry => `<${entry.entryType.toUpperCase()}>
    <VALUE>${entry.value}${entry.units ? ` ${entry.units}` : ''} ${entry.medicationBrand ? `(${entry.medicationBrand})` : ''}</VALUE>
    <OCCURRED_AT>${formatLocalTime(new Date(entry.occurredAt), timeZone)}</OCCURRED_AT>
    </${entry.entryType.toUpperCase()}>`).join('\n')}` : ''}
</RECENT_HISTORY>`
    : `<RECENT_HISTORY>
No recent entries in the last 72 hours.
</RECENT_HISTORY>`;

  const patternAnalysis = medicationPatterns ? `
<MEDICATION_PATTERN_ANALYSIS>
Based on recent insulin administration patterns:
${medicationPatterns}
</MEDICATION_PATTERN_ANALYSIS>
` : '';

  const morningTargetMin = GLUCOSE_TARGET_RANGES.targetMin;
  const morningTargetMax = GLUCOSE_TARGET_RANGES.targetMax;

  return `
<TASK>
You are a medical AI assistant specializing in diabetes management and insulin dosing recommendations. Your task is to analyze patient data and provide evidence-based insulin dose recommendations for administration at a specific target time, prioritizing recent glucose readings and patterns over historical medication preferences.
</TASK>

<INSTRUCTIONS>
You must provide your response in the exact JSON format specified below. Do not include any additional text, explanations, or formatting outside of the JSON structure.

Consider the following factors when making your recommendation, in order of priority:
1. **CURRENT GLUCOSE LEVELS**: The most recent glucose reading is the primary factor. If glucose is high, consider higher doses; if low, consider lower doses.
2. **GLUCOSE TRENDS**: Look at glucose patterns over the past 24-72 hours to understand the patient's current metabolic state.
3. **Recent meals and their timing relative to the target administration time**
4. **Previous insulin doses and their effectiveness** (how well recent doses controlled glucose)
5. **Patient's diabetes type and current health status**
6. **Time until administration and potential glucose changes**
7. **Patient's lifestyle and activity level**
8. **Safety considerations to minimize risk of hypoglycemia or hyperglycemia**
9. **MEDICATION SELECTION**: Choose the most appropriate medication based on:
   - **TIME-BASED PATTERNS**: Maintain consistency with the patient's usual medication schedule for specific times of day (e.g., if they use Actrapid in the morning, continue using Actrapid in the morning)
   - **BRAND CONSISTENCY**: Stick to the same medication brand that the patient typically uses at this time of day, unless there's a compelling clinical reason to change
   - **DOSE FLEXIBILITY**: While keeping the same medication brand, adjust the dose based on current glucose levels and recent trends
   - **The patient's usual medications as the primary reference for brand selection**

**For morning fasted blood sugar, the ideal target range is ${morningTargetMin}-${morningTargetMax} mg/dL.**

The morning fasted blood sugar target range represents the optimal glucose level for patients after an overnight fast and before breakfast. Maintaining glucose within this range helps minimize the risk of both hypoglycemia (low blood sugar) and hyperglycemia (high blood sugar) at the start of the day. 

**IMPORTANT**: Base your dose primarily on the current glucose reading and recent trends. Do not feel constrained by the patient's usual medications or historical doses if the current situation warrants a different approach. Recent glucose readings and patterns should drive your recommendation more than historical preferences.

**IMPORTANT CLINICAL RULE**: Only use a glucose reading as the primary basis for insulin dosing if it was measured after the most recent insulin dose. If the most recent glucose reading is from before the last insulin administration, it is outdated and should not be used as the main basis for the current recommendation. In such cases, base your recommendation on recent trends, usual doses, and safety, and clearly state that a new glucose reading is needed for optimal dosing. Meals do not invalidate a glucose reading for dosing purposes.

**NOTE**: The recent history is divided into two sections: "MOST RECENT ENTRIES" (last 24 hours) and "OLDER ENTRIES" (24-72 hours ago). The most recent insulin dose will be the first insulin entry in the "MOST RECENT ENTRIES" section. Pay special attention to the most recent entries as they are most relevant for current dosing decisions.

Always prioritize patient safety and be conservative in your recommendations.
</INSTRUCTIONS>

<CONTEXT>
${patientInfo}

${targetTimeInfo}

${recentHistory}

${patternAnalysis}
</CONTEXT>

<RESPONSE_FORMAT>
Provide your recommendation in the following exact JSON format. Do not include any text before or after the JSON:

{
  "doseUnits": <number>,
  "medicationName": "<medication name from recent history or usual medications>",
  "reasoning": "<detailed explanation of your recommendation>",
  "safetyNotes": "<any important safety warnings or considerations>",
  "confidence": "<high|medium|low>",
  "recommendedMonitoring": "<specific monitoring recommendations>"
}

Where:
- doseUnits: Recommended insulin dose in IU (International Units), based primarily on current glucose and recent trends
- medicationName: The medication name from recent history, usual medications, or a logical choice based on timing and duration needed
- reasoning: Detailed explanation focusing on current glucose levels, recent trends, and why this dose/medication is appropriate now
- safetyNotes: Any important safety warnings, contraindications, or special considerations
- confidence: Your confidence level in this recommendation (high/medium/low)
- recommendedMonitoring: Specific recommendations for glucose monitoring after administration
</RESPONSE_FORMAT>

<GOOD_EXAMPLE>
{
  "doseUnits": 15,
  "medicationName": "Actrapid",
  "reasoning": "Current glucose reading is 220 mg/dL, which is significantly above the target range of 100-150 mg/dL. The patient's glucose has been trending upward over the past 24 hours, with readings of 180, 195, and now 220 mg/dL. This suggests inadequate insulin coverage. The last insulin dose was 8 IU of Actrapid 6 hours ago, but glucose continued to rise. Actrapid is maintained as the medication choice since it's consistently used by this patient for morning insulin administration, maintaining brand consistency. However, the dose is increased to 15 IU (from the usual 8-10 IU range) to address the current high glucose and upward trend.",
  "safetyNotes": "This is a higher dose than recent administrations. Monitor glucose closely at 1, 2, and 4 hours post-administration. Have fast-acting carbohydrates available. Consider reducing the dose if patient is planning significant physical activity.",
  "confidence": "medium",
  "recommendedMonitoring": "Check glucose at 1, 2, and 4 hours post-administration. Monitor for signs of hypoglycemia. If glucose remains high after 2 hours, consider additional insulin or contact healthcare provider."
}
</GOOD_EXAMPLE>

<BAD_EXAMPLE>
{
  "doseUnits": 8,
  "medicationName": "Actrapid",
  "reasoning": "Patient usually takes 8 IU of Actrapid",
  "safetyNotes": "Be careful",
  "confidence": "high",
  "recommendedMonitoring": "Check glucose"
}
{
  "doseUnits": 12,
  "medicationName": "Actrapid",
  "reasoning": "The patient's glucose was 181 mg/dL at 7:00 AM, so a higher dose is recommended after lunch.",
  "safetyNotes": "Monitor for hypoglycemia.",
  "confidence": "medium",
  "recommendedMonitoring": "Check glucose after 2 hours."
}
</BAD_EXAMPLE>

<FINAL_INSTRUCTIONS>
Remember: This is a medical recommendation that should be reviewed by healthcare professionals before administration. Base your dose recommendation primarily on current glucose readings and recent trends, but maintain consistency with the patient's usual medication brand for the specific time of day. Provide detailed, evidence-based reasoning that explains why this specific dose is appropriate for the current situation while maintaining the patient's established medication routine. Always prioritize patient safety and be prepared to adjust doses when the current glucose situation warrants it, but keep the same medication brand unless there's a compelling clinical reason to change.
</FINAL_INSTRUCTIONS>
`;
}

function analyzeMedicationPatterns(insulinEntries: Entry[], _targetTime: Date, timeZone: string) {
  if (insulinEntries.length === 0) {
    return "No recent insulin administration patterns available.";
  }

  // Group entries by time of day using the user's timezone
  const normalizeBrand = (brand?: string | null): string | null => {
    if (!brand) {
      return null;
    }
    const trimmed = brand.trim();
    return trimmed.length > 0 ? trimmed : null;
  };

  const morningEntries = insulinEntries.filter(entry => {
    const hour = Number(new Date(entry.occurredAt).toLocaleString('en-US', { hour: '2-digit', hour12: false, timeZone }));
    return hour >= 6 && hour < 12;
  });
  
  const afternoonEntries = insulinEntries.filter(entry => {
    const hour = Number(new Date(entry.occurredAt).toLocaleString('en-US', { hour: '2-digit', hour12: false, timeZone }));
    return hour >= 12 && hour < 18;
  });
  
  const eveningEntries = insulinEntries.filter(entry => {
    const hour = Number(new Date(entry.occurredAt).toLocaleString('en-US', { hour: '2-digit', hour12: false, timeZone }));
    return hour >= 18 || hour < 6;
  });

  const patterns = [];
  
  if (morningEntries.length > 0) {
    const morningMeds = morningEntries
      .map(e => normalizeBrand(e.medicationBrand))
      .filter((brand): brand is string => Boolean(brand));
    const mostCommonMorning = getMostCommon(morningMeds);
    if (mostCommonMorning) {
      patterns.push(`Morning (6 AM - 12 PM): Primarily uses ${mostCommonMorning} (${morningEntries.length} entries)`);
    }
  }
  
  if (afternoonEntries.length > 0) {
    const afternoonMeds = afternoonEntries
      .map(e => normalizeBrand(e.medicationBrand))
      .filter((brand): brand is string => Boolean(brand));
    const mostCommonAfternoon = getMostCommon(afternoonMeds);
    if (mostCommonAfternoon) {
      patterns.push(`Afternoon (12 PM - 6 PM): Primarily uses ${mostCommonAfternoon} (${afternoonEntries.length} entries)`);
    }
  }
  
  if (eveningEntries.length > 0) {
    const eveningMeds = eveningEntries
      .map(e => normalizeBrand(e.medicationBrand))
      .filter((brand): brand is string => Boolean(brand));
    const mostCommonEvening = getMostCommon(eveningMeds);
    if (mostCommonEvening) {
      patterns.push(`Evening/Night (6 PM - 6 AM): Primarily uses ${mostCommonEvening} (${eveningEntries.length} entries)`);
    }
  }

  // Analyze dose patterns
  const recentDoses = insulinEntries.slice(0, 5).map(e => parseFloat(e.value)).filter(d => !isNaN(d));
  if (recentDoses.length > 0) {
    const avgDose = recentDoses.reduce((a, b) => a + b, 0) / recentDoses.length;
    patterns.push(`Recent dose range: ${Math.min(...recentDoses)}-${Math.max(...recentDoses)} IU (average: ${avgDose.toFixed(1)} IU)`);
  }

  return patterns.length > 0 ? patterns.join('\n') : "Limited pattern data available.";
}

function getMostCommon(arr: (string)[]): string | null {
  if (arr.length === 0) {return null;}
  
  const counts: { [key: string]: number } = {};
  arr.forEach(item => {
    counts[item] = (counts[item] || 0) + 1;
  });
  
  return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
}

async function getAIRecommendation(prompt: string): Promise<AIRecommendationResult> {
  try {
    logger.debug('Calling OpenAI API...');
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a medical AI assistant specializing in diabetes management and insulin dosing recommendations. You provide evidence-based recommendations based on patient data, but always remind users that these are suggestions and should be reviewed by healthcare professionals. Be conservative in your recommendations and prioritize patient safety. You must respond only with valid JSON in the exact format requested."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.2, // Lower temperature for more consistent medical recommendations
      max_tokens: 1000,
      response_format: { type: "json_object" }, // Ensure JSON response
    });

    logger.debug('OpenAI response received');
    
    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error('No response content from OpenAI');
    }

    logger.debug('Raw AI response:', responseContent);

    // Parse JSON response
    try {
      const parsed = JSON.parse(responseContent) as Record<string, unknown>;
      return {
        doseUnits: typeof parsed.doseUnits === 'number' ? parsed.doseUnits : undefined,
        medicationName: typeof parsed.medicationName === 'string' ? parsed.medicationName : undefined,
        reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : undefined,
        safetyNotes: typeof parsed.safetyNotes === 'string' ? parsed.safetyNotes : undefined,
        confidence: normalizeConfidence(parsed.confidence),
        recommendedMonitoring: typeof parsed.recommendedMonitoring === 'string'
          ? parsed.recommendedMonitoring
          : undefined,
      };
    } catch (parseError) {
      logger.error('Error parsing JSON from AI response:', parseError);
      logger.error('Response content:', responseContent);
      
      // Fallback: extract dose and reasoning from text
      const doseMatch = responseContent.match(/"doseUnits"\s*:\s*(\d+(?:\.\d+)?)/);
      const doseUnits = doseMatch ? parseFloat(doseMatch[1]) : 8;

      return {
        doseUnits,
        medicationName: 'Unknown',
        reasoning: responseContent,
        safetyNotes: 'Unable to parse structured response',
        confidence: 'low',
        recommendedMonitoring: 'Please consult healthcare provider',
      };
    }

  } catch (error) {
    logger.error('OpenAI API error:', error);
    
    // Fallback to mock recommendation if OpenAI fails
    logger.warn('Falling back to mock recommendation');
    return {
      doseUnits: 8,
      reasoning: `Unable to get AI recommendation due to technical issues. Please consult with your healthcare provider for insulin dosing guidance. Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      safetyNotes: 'Technical error occurred - manual review required',
      confidence: 'low',
      recommendedMonitoring: 'Consult healthcare provider immediately',
    };
  }
}

function normalizeConfidence(confidence: unknown): Recommendation['confidence'] | undefined {
  if (confidence === 'high' || confidence === 'medium' || confidence === 'low') {
    return confidence;
  }
  if (typeof confidence === 'string') {
    const lowered = confidence.toLowerCase();
    if (lowered === 'high' || lowered === 'medium' || lowered === 'low') {
      return lowered as Recommendation['confidence'];
    }
  }
  return undefined;
}

function checkSufficientHistory(entries: Entry[]): { hasSufficientHistory: boolean; message: string } {
  const totalEntries = entries.length;
  
  if (totalEntries === 0) {
    return {
      hasSufficientHistory: false,
      message: "No patient history found. Please add at least 1 day of glucose readings, meals, and insulin doses before getting recommendations."
    };
  }
  
  if (totalEntries < 3) {
    return {
      hasSufficientHistory: false,
      message: `Only ${totalEntries} entries found. Please add at least 3 entries (glucose, meals, insulin) over at least 1 day before getting recommendations.`
    };
  }
  
  // Check if we have entries from at least 1 day ago
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);
  
  const hasHistoricalData = entries.some(entry => {
    const entryDate = new Date(entry.occurredAt);
    return entryDate < oneDayAgo;
  });
  
  if (!hasHistoricalData) {
    return {
      hasSufficientHistory: false,
      message: "All entries are from today. Please add entries from at least 1 day ago to provide better context for recommendations."
    };
  }
  
  return {
    hasSufficientHistory: true,
    message: "Sufficient history available for recommendations."
  };
} 
