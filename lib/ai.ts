import { AIRecommendationRequest, AIRecommendationResponse } from '@/types';
import { logger } from './logger';

const MODEL_API_KEY = process.env.MODEL_API_KEY;
const MODEL_NAME = process.env.MODEL_NAME || 'openai-4o-mini';

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIRequest {
  model: string;
  messages: OpenAIMessage[];
  temperature: number;
  max_tokens: number;
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

const buildPrompt = (request: AIRecommendationRequest): string => {
  const { currentGlucose, mealDescription, recentEntries } = request;

  const entriesText = recentEntries
    .map((entry) => {
      const date = new Date(entry.occurredAt).toLocaleString();
      switch (entry.entryType) {
        case 'glucose':
          return `${date}: Blood glucose ${entry.value} ${entry.units}`;
        case 'meal':
          return `${date}: Meal - ${entry.value}`;
        case 'insulin':
          return `${date}: Insulin ${entry.value} ${entry.units} (${entry.medicationBrand})`;
        default:
          return '';
      }
    })
    .filter(Boolean)
    .join('\n');

  return `You are a diabetes management AI assistant. Based on the following patient data, provide an insulin dose recommendation.

Patient History (last 72 hours):
${entriesText}

Current Context:
${currentGlucose ? `Current blood glucose: ${currentGlucose} mg/dL` : ''}
${mealDescription ? `Meal description: ${mealDescription}` : ''}

Please provide:
1. Recommended insulin dose in IU
2. Clear reasoning for the recommendation
3. Any safety warnings or considerations

Format your response as JSON:
{
  "doseUnits": number,
  "reasoning": "string",
  "confidence": number (0-1),
  "warnings": ["string array"]
}`;
};

const callOpenAI = async (prompt: string): Promise<AIRecommendationResponse> => {
  if (!MODEL_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  const messages: OpenAIMessage[] = [
    {
      role: 'system',
      content:
        'You are a diabetes management AI assistant. Provide safe, evidence-based insulin recommendations based on patient data. Always include clear reasoning and safety warnings.',
    },
    {
      role: 'user',
      content: prompt,
    },
  ];

  const requestBody: OpenAIRequest = {
    model: MODEL_NAME,
    messages,
    temperature: 0.3,
    max_tokens: 500,
  };

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${MODEL_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data: OpenAIResponse = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No response content from OpenAI');
    }

    // Parse the JSON response
    try {
      const parsed = JSON.parse(content);
      return {
        doseUnits: parsed.doseUnits,
        reasoning: parsed.reasoning,
        confidence: parsed.confidence || 0.5,
        warnings: parsed.warnings || [],
      };
    } catch (parseError) {
      throw new Error(`Failed to parse AI response: ${parseError}`);
    }
  } catch (error) {
    logger.error('AI recommendation error:', error);
    throw new Error(
      `AI recommendation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
};

export const getInsulinRecommendation = async (
  request: AIRecommendationRequest,
): Promise<AIRecommendationResponse> => {
  const prompt = buildPrompt(request);
  return callOpenAI(prompt);
};

export const validateRecommendation = (
  recommendation: AIRecommendationResponse,
  lastDose?: number,
): {
  isValid: boolean;
  warnings: string[];
} => {
  const warnings: string[] = [];

  // Check dose range
  if (recommendation.doseUnits < 0 || recommendation.doseUnits > 50) {
    warnings.push('Recommended dose is outside safe range (0-50 IU)');
  }

  // Check for significant dose changes
  if (lastDose && recommendation.doseUnits) {
    const changePercent = Math.abs((recommendation.doseUnits - lastDose) / lastDose) * 100;
    if (changePercent > 20) {
      warnings.push(
        `Dose change is ${changePercent.toFixed(1)}% from last dose. Please review carefully.`,
      );
    }
  }

  // Check confidence level
  if (recommendation.confidence < 0.3) {
    warnings.push('Low confidence in recommendation. Please review with healthcare provider.');
  }

  return {
    isValid: warnings.length === 0,
    warnings,
  };
};
