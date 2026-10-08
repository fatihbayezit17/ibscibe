import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
    }

    const studentText = body.essay || body.studentText;
    const chosenTextType = body.textType || body.chosenTextType;
    const promptText = body.stimulus || body.promptText;

    if (!studentText || studentText.trim().length < 5) {
      return NextResponse.json({
        scoreA: 2,
        scoreB: 2,
        scoreC: 1,
        feedback: 'Insufficient candidate text provided to assess against IB criteria.'
      });
    }

    const evaluationPrompt = `You are a certified senior examiner for the International Baccalaureate (IB) Diploma Programme Language B Paper 1.
Evaluate this candidate's written production strictly according to official IB DP Language B criteria.

Task Stimulus: "${promptText || 'School/Community Task'}"
Target Text Type: "${chosenTextType || 'Article'}"
Candidate Text:
"""
${studentText}
"""

MARK SCHEME & RUBRICS:
- Criterion A: Language (out of 12) -> Vocabulary range, grammatical accuracy, complex structures.
- Criterion B: Message (out of 12) -> Relevance to stimulus, idea development, depth and clarity.
- Criterion C: Conceptual Understanding / Conventions (out of 6) -> Adherence to text type conventions, register, tone, audience awareness, formatting (e.g., presence of an appropriate title, suitable subheadings, opening/closing conventions required for "${chosenTextType}").

CRITICAL INSTRUCTIONS:
1. Check if the candidate selected and adhered to the correct text type ("${chosenTextType}"). Check if an appropriate title and formatting conventions are used.
2. Structure your feedback into:
   - Criterion Breakdown (Language, Message, Conventions & Text Type check)
   - Strengths
   - Areas for Improvement / Deficiencies (Formatting, title, or task gaps)
   - MODEL REWRITE / HOW IT COULD BE BETTER (Provide an exemplary rewritten excerpt demonstrating top-band IB standard).

Return ONLY a valid JSON object in this exact format without any markdown code blocks or backticks:
{
  "scoreA": 8,
  "scoreB": 8,
  "scoreC": 4,
  "feedback": "• Criterion A (Language - 8/12): Rationale here...\n• Criterion B (Message - 8/12): Rationale here...\n• Criterion C (Conventions & Text Type - 4/6): Checked title and format...\n\n🌟 STRENGTHS:\n- Strength 1\n\n⚠️ DEFICIENCIES & AREAS FOR IMPROVEMENT:\n- Gap 1\n\n💡 MODEL REWRITE / HOW IT COULD BE BETTER:\nExemplary text snippet here..."
}`;

    // Doğru `@google/genai` SDK çağrı sözdizimi
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [evaluationPrompt],
    });

    const responseText = response.text || '';
    const cleanJson = responseText.replace(/```json|```/g, '').trim();
    
    let parsed;
    try {
      parsed = JSON.parse(cleanJson);
    } catch (parseErr) {
      console.error('JSON Parse Error. Raw response was:', responseText);
      parsed = {
        scoreA: 6,
        scoreB: 6,
        scoreC: 3,
        feedback: responseText || 'Assessment generated.'
      };
    }

    return NextResponse.json({
      scoreA: Number(parsed.scoreA) ?? 6,
      scoreB: Number(parsed.scoreB) ?? 6,
      scoreC: Number(parsed.scoreC) ?? 3,
      feedback: parsed.feedback || 'Assessment generated.'
    });

  } catch (error: any) {
    console.error('AI Rubric Evaluation Critical Error:', error?.message || error);
    return NextResponse.json({
      scoreA: 5,
      scoreB: 5,
      scoreC: 2,
      feedback: `AI Evaluation Error: ${error?.message || 'Server encountered an issue. Please try again.'}`
    });
  }
}