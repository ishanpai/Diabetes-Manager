import {
  NextApiRequest,
  NextApiResponse,
} from 'next';
import { getServerSession } from 'next-auth';
import OpenAI from 'openai';
import { z } from 'zod';

import { prisma } from '@/lib/database';

import NextAuth from './auth/[...nextauth]';

// Initialize OpenAI client
const openai = new OpenAI({
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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Recommendation API called with body:', req.body);
    
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

    // Check authentication
    sendProgress('gathering-data', 'Checking authentication...');
    await new Promise(resolve => setTimeout(resolve, 500)); // Small delay for visibility
    const session = await getServerSession(req, res, NextAuth);
    console.log('Session:', session);
    
    if (!session) {
      return sendError('Not authenticated');
    }

    const sessionUserId = (session as any).user?.id || (session as any).user?.email;
    console.log('Session User ID:', sessionUserId);

    if (!sessionUserId) {
      return sendError('User ID not found in session');
    }

    // Get the actual user ID from the database
    sendProgress('gathering-data', 'Finding user...');
    await new Promise(resolve => setTimeout(resolve, 300));
    let actualUserId = sessionUserId;
    if (sessionUserId.includes('@')) {
      // If it's an email, find the user first
      const user = await prisma.user.findUnique({
        where: { email: sessionUserId }
      });
      if (!user) {
        return sendError('User not found');
      }
      actualUserId = user.id;
    }
    console.log('Actual User ID:', actualUserId);

    // Validate request body
    sendProgress('gathering-data', 'Validating request...');
    await new Promise(resolve => setTimeout(resolve, 200));
    const validatedData = recommendSchema.parse(req.body);
    const { patientId, targetTime } = validatedData;
    console.log('Validated data:', { patientId, targetTime });

    // Parse target time if provided
    const targetDateTime = targetTime ? new Date(targetTime) : new Date();
    console.log('Target datetime:', targetDateTime);

    // Verify patient exists and belongs to user
    sendProgress('gathering-data', 'Loading patient data...');
    await new Promise(resolve => setTimeout(resolve, 400));
    const patient = await prisma.patient.findFirst({
      where: {
        id: patientId,
        userId: actualUserId,
      },
      include: {
        entries: {
          where: {
            occurredAt: {
              gte: new Date(Date.now() - 72 * 60 * 60 * 1000), // Last 72 hours
            },
          },
          orderBy: {
            occurredAt: 'asc',
          },
        },
      },
    });

    console.log('Patient found:', !!patient);
    if (!patient) {
      return sendError('Patient not found');
    }

    // Get recent entries for the last 72 hours
    const recentEntries = patient.entries;
    console.log('Recent entries count:', recentEntries.length);
    sendProgress('gathering-data', `Found ${recentEntries.length} recent entries`);
    await new Promise(resolve => setTimeout(resolve, 300));

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
    const savedRecommendation = await prisma.recommendation.create({
      data: {
        patientId,
        prompt,
        response: aiRecommendation.reasoning,
        doseUnits: aiRecommendation.doseUnits,
        reasoning: aiRecommendation.reasoning,
        safetyNotes: aiRecommendation.safetyNotes,
        confidence: aiRecommendation.confidence,
        recommendedMonitoring: aiRecommendation.recommendedMonitoring,
        targetTime: targetDateTime,
      },
    });

    console.log('Recommendation saved to database');
    sendProgress('parsing-response', 'Recommendation saved');
    await new Promise(resolve => setTimeout(resolve, 300));

    const result = {
      id: savedRecommendation.id,
      patientId: savedRecommendation.patientId,
      doseUnits: savedRecommendation.doseUnits,
      reasoning: savedRecommendation.reasoning,
      safetyNotes: savedRecommendation.safetyNotes,
      confidence: savedRecommendation.confidence,
      recommendedMonitoring: savedRecommendation.recommendedMonitoring,
      createdAt: savedRecommendation.createdAt,
      targetTime: savedRecommendation.targetTime,
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
  // Parse usualMedications from JSON string
  let medications = [];
  try {
    medications = JSON.parse(patient.usualMedications || '[]');
  } catch (error) {
    console.error('Error parsing usualMedications:', error);
    medications = [];
  }

  const patientInfo = `
<PATIENT_INFO>
- Name: ${patient.name}
- Age: ${patient.age} years old
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
    <VALUE>${entry.value}${entry.units ? ` ${entry.units}` : ''}</VALUE>
    <OCCURRED_AT>${formatLocalTime(entry.occurredAt)}</OCCURRED_AT>
    </${entry.entryType.toUpperCase()}>`).join('\n')}
</RECENT_HISTORY>`
    : `<RECENT_HISTORY>
No recent entries in the last 72 hours.
</RECENT_HISTORY>`;

  return `
<TASK>
You are a medical AI assistant specializing in diabetes management and insulin dosing recommendations. Your task is to analyze patient data and provide evidence-based insulin dose recommendations for administration at a specific target time.
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

Always prioritize patient safety and be conservative in your recommendations.
</INSTRUCTIONS>

<CONTEXT>
${patientInfo}

${targetTimeInfo}

${recentHistory}
</CONTEXT>

<RESPONSE_FORMAT>
Provide your recommendation in the following exact JSON format. Do not include any text before or after the JSON:

{
  "doseUnits": <number>,
  "reasoning": "<detailed explanation of your recommendation>",
  "safetyNotes": "<any important safety warnings or considerations>",
  "confidence": "<high|medium|low>",
  "recommendedMonitoring": "<specific monitoring recommendations>"
}

Where:
- doseUnits: Recommended insulin dose in IU (International Units)
- reasoning: Detailed explanation of your thought process and considerations
- safetyNotes: Any important safety warnings, contraindications, or special considerations
- confidence: Your confidence level in this recommendation (high/medium/low)
- recommendedMonitoring: Specific recommendations for glucose monitoring after administration
</RESPONSE_FORMAT>

<GOOD_EXAMPLE>
{
  "doseUnits": 12,
  "reasoning": "Based on recent glucose reading of 180 mg/dL from 2 hours ago and the patient's usual dose pattern of 10-14 IU, a dose of 12 IU is recommended. The patient's sedentary lifestyle suggests slower glucose metabolism, and the last meal was 3 hours ago, reducing immediate post-meal insulin needs.",
  "safetyNotes": "Monitor glucose 1 hour after administration. Have fast-acting carbohydrates available. This dose is within the patient's usual range but higher than recent doses - monitor closely.",
  "confidence": "medium",
  "recommendedMonitoring": "Check glucose at 1 hour and 2 hours post-administration. Monitor for signs of hypoglycemia, especially if patient is more active than usual."
}
</GOOD_EXAMPLE>

<BAD_EXAMPLE>
{
  "doseUnits": 25,
  "reasoning": "Patient needs more insulin because glucose is high",
  "safetyNotes": "Be careful",
  "confidence": "high",
  "recommendedMonitoring": "Check glucose"
}
</BAD_EXAMPLE>

<FINAL_INSTRUCTIONS>
Remember: This is a medical recommendation that should be reviewed by healthcare professionals before administration. Provide detailed, evidence-based reasoning and comprehensive safety considerations like in the good example, not brief responses like in the bad example.
</FINAL_INSTRUCTIONS>
`;
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