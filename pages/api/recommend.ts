import {
  NextApiRequest,
  NextApiResponse,
} from 'next';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';

import {
  createRecommendation,
  findEntriesByPatientId,
  findPatientById,
  findUserByEmail,
} from '@/lib/database';

import NextAuth from './auth/[...nextauth]';

// Initialize OpenAI client
const openai = new (require('openai')).default({
  apiKey: process.env.MODEL_API_KEY,
});

const recommendSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  targetTime: z.string().optional(), // ISO string for target time
});

// Utility function to format date in local time
function formatLocalTime(date: Date): string {
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short'
  });
}

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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  return createRecommendationHandler(req, res, userId);
}

async function createRecommendationHandler(req: NextApiRequest, res: NextApiResponse, userId: string) {
  try {
    // Debug: log the incoming request body
    console.log('Incoming /api/recommend request body:', req.body);
    
    // Set up SSE headers for streaming
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    });

    const sendProgress = (step: string, message?: string) => {
      res.write(`data: ${JSON.stringify({ type: 'progress', step, message })}\n\n`);
    };

    const sendError = (error: string) => {
      res.write(`data: ${JSON.stringify({ type: 'error', error })}\n\n`);
      res.end();
    };

    const sendResult = (data: any) => {
      res.write(`data: ${JSON.stringify({ type: 'result', data })}\n\n`);
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
      console.error('Validation error in /api/recommend:', validationError);
      return sendError('Validation failed');
    }

    const { patientId, targetTime } = validatedData;
    console.log('Validated data:', { patientId, targetTime });

    // Parse target time if provided
    const targetDateTime = targetTime ? new Date(targetTime) : new Date();
    console.log('Target datetime:', targetDateTime);

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
    console.log('Recent entries count:', recentEntries.length);
    sendProgress('gathering-data', `Found ${recentEntries.length} recent entries`);

    // Check if patient has sufficient history for recommendations
    const hasSufficientHistory = checkSufficientHistory(entries);
    if (!hasSufficientHistory.hasSufficientHistory) {
      return sendError(hasSufficientHistory.message);
    }

    // Build the prompt for the AI model
    sendProgress('building-prompt', 'Building AI prompt...');
    await new Promise(resolve => setTimeout(resolve, 400));
    const prompt = buildRecommendationPrompt(patient, recentEntries, targetDateTime);
    sendProgress('building-prompt', 'Prompt built successfully');
    await new Promise(resolve => setTimeout(resolve, 300));

    // Call OpenAI API for recommendation
    sendProgress('waiting-for-model', 'Calling AI model...');
    const aiRecommendation = await getAIRecommendation(prompt);
    console.log('AI recommendation received:', aiRecommendation);
    sendProgress('waiting-for-model', 'AI response received');
    await new Promise(resolve => setTimeout(resolve, 300));

    // Parse and save the recommendation
    sendProgress('parsing-response', 'Processing recommendation...');
    await new Promise(resolve => setTimeout(resolve, 400));
    const savedRecommendation = await createRecommendation({
      patientId,
      prompt,
      response: aiRecommendation.reasoning,
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

    console.log('Recommendation saved to database');
    sendProgress('parsing-response', 'Recommendation saved');
    await new Promise(resolve => setTimeout(resolve, 300));

    const result = {
      id: savedRecommendation.id,
      patientId: savedRecommendation.patientId,
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
    console.error('Recommendation error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    if (error instanceof z.ZodError) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: 'Invalid request data', details: error.errors })}\n\n`);
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', error: 'Internal server error' })}\n\n`);
    }
    res.end();
  }
}

function buildRecommendationPrompt(patient: any, entries: any[], targetTime: Date) {
  // Handle usualMedications - it could be a JSON string or already an object/array
  let medications = [];
  try {
    if (typeof patient.usualMedications === 'string') {
      medications = JSON.parse(patient.usualMedications || '[]');
    } else if (Array.isArray(patient.usualMedications)) {
      medications = patient.usualMedications;
    } else {
      medications = [];
    }
  } catch (error) {
    console.error('Error parsing usualMedications:', error);
    medications = [];
  }

  // Calculate age
  const age = Math.floor((new Date().getTime() - new Date(patient.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));

  // Analyze medication timing patterns from recent history
  const insulinEntries = entries.filter(entry => entry.entryType === 'insulin');
  const medicationPatterns = analyzeMedicationPatterns(insulinEntries, targetTime);

  const patientInfo = `
<PATIENT_INFO>
- Name: ${patient.name}
- Age: ${age} years old
- Diabetes Type: ${patient.diabetesType}
- Lifestyle: ${patient.lifestyle || 'Not specified'}
- Activity Level: ${patient.activityLevel || 'Not specified'}
- Usual Medications: ${medications.map((med: any) => `${med.brand} ${med.dosage} (${med.timing})`).join(', ')}
</PATIENT_INFO>
`;

  const targetTimeInfo = `
<TARGET_TIME>
Target Administration Time: ${formatLocalTime(targetTime)}
</TARGET_TIME>
`;

  const recentHistory = entries.length > 0 
    ? `<RECENT_HISTORY>
Recent History (Last 72 hours):
${entries.map(entry => `<${entry.entryType.toUpperCase()}>
    <VALUE>${entry.value}${entry.units ? ` ${entry.units}` : ''} ${entry.medicationBrand ? `(${entry.medicationBrand})` : ''}</VALUE>
    <OCCURRED_AT>${formatLocalTime(entry.occurredAt)}</OCCURRED_AT>
    </${entry.entryType.toUpperCase()}>`).join('\n')}
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

  return `
<TASK>
You are a medical AI assistant specializing in diabetes management and insulin dosing recommendations. Your task is to analyze patient data and provide evidence-based insulin dose recommendations for administration at a specific target time, including which specific medication to use based on timing patterns and patient history.
</TASK>

<INSTRUCTIONS>
You must provide your response in the exact JSON format specified below. Do not include any additional text, explanations, or formatting outside of the JSON structure.

Consider the following factors when making your recommendation:
1. Current glucose levels and trends over the past 72 hours
2. Recent meals and their timing relative to the target administration time
3. Previous insulin doses and their effectiveness
4. Patient's usual medication schedule and diabetes type
5. Any patterns in glucose control and response to insulin
6. Time until administration and potential glucose changes
7. Patient's lifestyle and activity level
8. Safety considerations to minimize risk of hypoglycemia or hyperglycemia
9. MEDICATION SELECTION: Analyze the patient's recent insulin administration patterns to determine which medication is most appropriate for this specific time of day and situation. Look for:
   - Time-based patterns (e.g., specific medications used at specific times)
   - Meal-related patterns (e.g., rapid-acting before meals, long-acting at night)
   - Consistency in medication choice for similar situations
   - The patient's usual medication schedule and preferences

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
  "medicationName": "<specific medication name from patient's usual medications>",
  "reasoning": "<detailed explanation of your recommendation>",
  "safetyNotes": "<any important safety warnings or considerations>",
  "confidence": "<high|medium|low>",
  "recommendedMonitoring": "<specific monitoring recommendations>"
}

Where:
- doseUnits: Recommended insulin dose in IU (International Units)
- medicationName: The specific medication name from the patient's usual medications, chosen based on timing patterns and patient history
- reasoning: Detailed explanation of your thought process, including why you chose this specific medication based on timing patterns
- safetyNotes: Any important safety warnings, contraindications, or special considerations
- confidence: Your confidence level in this recommendation (high/medium/low)
- recommendedMonitoring: Specific recommendations for glucose monitoring after administration
</RESPONSE_FORMAT>

<GOOD_EXAMPLE>
{
  "doseUnits": 12,
  "medicationName": "Actrapid",
  "reasoning": "Based on recent glucose reading of 180 mg/dL from 2 hours ago and the patient's usual dose pattern of 10-14 IU, a dose of 12 IU is recommended. The patient's sedentary lifestyle suggests slower glucose metabolism, and the last meal was 3 hours ago, reducing immediate post-meal insulin needs. Actrapid is chosen as it's consistently used by this patient for morning and lunchtime insulin administration, and the target time (2:00 PM) aligns with the patient's typical lunchtime insulin pattern.",
  "safetyNotes": "Monitor glucose 1 hour after administration. Have fast-acting carbohydrates available. This dose is within the patient's usual range but higher than recent doses - monitor closely.",
  "confidence": "medium",
  "recommendedMonitoring": "Check glucose at 1 hour and 2 hours post-administration. Monitor for signs of hypoglycemia, especially if patient is more active than usual."
}
</GOOD_EXAMPLE>

<BAD_EXAMPLE>
{
  "doseUnits": 25,
  "medicationName": "Insulin",
  "reasoning": "Patient needs more insulin because glucose is high",
  "safetyNotes": "Be careful",
  "confidence": "high",
  "recommendedMonitoring": "Check glucose"
}
</BAD_EXAMPLE>

<FINAL_INSTRUCTIONS>
Remember: This is a medical recommendation that should be reviewed by healthcare professionals before administration. Provide detailed, evidence-based reasoning and comprehensive safety considerations like in the good example, not brief responses like in the bad example. Always specify the exact medication name from the patient's usual medications, and explain your medication choice based on timing patterns and patient history.
</FINAL_INSTRUCTIONS>
`;
}

function analyzeMedicationPatterns(insulinEntries: any[], targetTime: Date): string {
  if (insulinEntries.length === 0) {
    return "No recent insulin administration patterns available.";
  }

  // Group entries by time of day
  const morningEntries = insulinEntries.filter(entry => {
    const hour = new Date(entry.occurredAt).getHours();
    return hour >= 6 && hour < 12;
  });
  
  const afternoonEntries = insulinEntries.filter(entry => {
    const hour = new Date(entry.occurredAt).getHours();
    return hour >= 12 && hour < 18;
  });
  
  const eveningEntries = insulinEntries.filter(entry => {
    const hour = new Date(entry.occurredAt).getHours();
    return hour >= 18 || hour < 6;
  });

  let patterns = [];
  
  if (morningEntries.length > 0) {
    const morningMeds = morningEntries.map(e => e.medicationBrand).filter(Boolean);
    const mostCommonMorning = getMostCommon(morningMeds);
    if (mostCommonMorning) {
      patterns.push(`Morning (6 AM - 12 PM): Primarily uses ${mostCommonMorning} (${morningEntries.length} entries)`);
    }
  }
  
  if (afternoonEntries.length > 0) {
    const afternoonMeds = afternoonEntries.map(e => e.medicationBrand).filter(Boolean);
    const mostCommonAfternoon = getMostCommon(afternoonMeds);
    if (mostCommonAfternoon) {
      patterns.push(`Afternoon (12 PM - 6 PM): Primarily uses ${mostCommonAfternoon} (${afternoonEntries.length} entries)`);
    }
  }
  
  if (eveningEntries.length > 0) {
    const eveningMeds = eveningEntries.map(e => e.medicationBrand).filter(Boolean);
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

function getMostCommon(arr: string[]): string | null {
  if (arr.length === 0) return null;
  
  const counts: { [key: string]: number } = {};
  arr.forEach(item => {
    counts[item] = (counts[item] || 0) + 1;
  });
  
  return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
}

async function getAIRecommendation(prompt: string) {
  try {
    console.log('Calling OpenAI API...');
    
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

    console.log('OpenAI response received');
    
    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error('No response content from OpenAI');
    }

    console.log('Raw AI response:', responseContent);

    // Parse JSON response
    try {
      const parsed = JSON.parse(responseContent);
      return {
        doseUnits: parsed.doseUnits || 8,
        medicationName: parsed.medicationName || 'Unknown',
        reasoning: parsed.reasoning || 'No reasoning provided',
        safetyNotes: parsed.safetyNotes || '',
        confidence: parsed.confidence || 'medium',
        recommendedMonitoring: parsed.recommendedMonitoring || '',
      };
    } catch (parseError) {
      console.error('Error parsing JSON from AI response:', parseError);
      console.error('Response content:', responseContent);
      
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
    console.error('OpenAI API error:', error);
    
    // Fallback to mock recommendation if OpenAI fails
    console.log('Falling back to mock recommendation');
    return {
      doseUnits: 8,
      reasoning: `Unable to get AI recommendation due to technical issues. Please consult with your healthcare provider for insulin dosing guidance. Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      safetyNotes: 'Technical error occurred - manual review required',
      confidence: 'low',
      recommendedMonitoring: 'Consult healthcare provider immediately',
    };
  }
}

function checkSufficientHistory(entries: any[]): { hasSufficientHistory: boolean; message: string } {
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