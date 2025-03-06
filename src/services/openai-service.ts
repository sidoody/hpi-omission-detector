// src/services/openai-service.ts
import OpenAI from 'openai';
import { AnalysisResult, OmissionType } from '@/types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function detectOmissions(transcript: string, hpi: string): Promise<AnalysisResult> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are an expert clinical documentation specialist focused on identifying clinically significant omissions in medical documentation. Your task is to compare a clinical encounter transcript with a generated History of Present Illness (HPI) and identify important clinical information that appears in the transcript but is missing from the HPI.

CATEGORIZATION FRAMEWORK:
Each omission must be categorized using ONLY one of these exact omission types:

1. OMISSION TYPES (EXACTLY as listed below - do not modify or add new types):
   - "Recent medical events": Emergency department visits, hospitalizations, or other significant healthcare encounters
   - "Omission of Symptoms": Key symptoms discussed but missing from the HPI (especially shortness of breath, pain, fatigue)
   - "Medication Omission": Missing details about medications discussed, especially recent changes or specific medications like inhalers
   - "Symptom details and characteristics": Details about what makes symptoms better or worse, timing, specific locations, or other modifiers
   - "People involved in interaction": Missing information about who was present or involved in care (interpreters, family members)
   - "Documentation style": Stylistic or formatting issues in the documentation

EXAMPLES OF OMISSIONS BY TYPE:
- Recent medical events: "Visit to ER omitted"
- Omission of Symptoms: "Shortness of Breath and fatigue symptoms omitted"
- Medication Omission: "Missed information about Tamsulosin" or "No mention of inhalers in HPI"
- Symptom details and characteristics: "Lower leg pain details omitted"
- People involved in interaction: "Daughter not present, but HPI said she was" or "Omitted spanish interpreter number"
- Documentation style: "A1c belongs in A/P not subjective"

IMPORTANT GUIDELINES:
- Focus ONLY on information present in the transcript but missing from the HPI
- Prioritize clinical information that would impact medical decision-making
- Identify specific, precise information rather than general categories
- Include direct quotes from the transcript as evidence
- For each omission, explain exactly what is missing and why it matters clinically
- Categorize each omission using ONLY the predefined omission types listed above
- DO NOT add your own omission types - use ONLY the exact terms provided above

Format your response as JSON:
{
  "summary": "Brief focus on the most important clinical omissions",
  "omissions": [
    {
      "type": "One of the exact omission types from the list above",
      "description": "Specific information missing from the HPI",
      "evidence": "Direct quote from transcript showing the omitted information",
      "recommendation": "How this should be documented in the HPI"
    }
  ],
  "assessment": "Assessment of clinical impact of these omissions"
}`
      },
      {
        role: "user",
        content: `Clinical Transcript:\n${transcript}\n\nGenerated HPI:\n${hpi}`
      }
    ],
    temperature: 0.1,
    max_tokens: 2000,
    response_format: { type: "json_object" }
  });

  try {
    const parsedResponse = JSON.parse(response.choices[0].message.content || '{}') as AnalysisResult;
    return parsedResponse;
  } catch (error) {
    console.error("Error parsing JSON response:", error);
    return {
      summary: "Error analyzing the documents",
      omissions: [],
      assessment: "Please try again"
    };
  }
}

// New function to integrate omissions into HPI
export async function integrateOmissionIntoHpi(hpi: string, omission: any): Promise<string> {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert medical documentation specialist. Your task is to integrate missing information into a History of Present Illness (HPI) document naturally, as if it had been included from the beginning. 
  
  IMPORTANT GUIDELINES:
  - Maintain the original style and tone of the HPI and make any new addition very concise.
  - Insert the new information in a location that makes logical sense based on the omission type
  - Make any necessary grammatical adjustments to ensure the text flows naturally
  - Make the additions concise (1-2 sentence max)
  - Return the entire updated HPI with the new information integrated
  - Do NOT add any markers, highlights, or indications that content was added - this should look like one cohesive document
  - Return ONLY the updated HPI text, no explanation or commentary`
        },
        {
          role: "user",
          content: `Original HPI:
  ${hpi}
  
  Omission Information:
  Type: ${omission.type}
  Description: ${omission.description}
  Evidence from transcript: "${omission.evidence}"
  Recommendation: ${omission.recommendation}
  
  Please integrate this information naturally into the HPI document.`
        }
      ],
      temperature: 0.1,
      max_tokens: 2000
    });
  
    try {
      return response.choices[0].message.content || hpi;
    } catch (error) {
      console.error("Error integrating omission:", error);
      return hpi;
    }
  }