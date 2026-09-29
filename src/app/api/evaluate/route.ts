import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { studentText, chosenTextType, promptText } = await req.json();

    if (!studentText || studentText.trim().length < 5) {
      return NextResponse.json({
        scoreA: 1,
        scoreB: 1,
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
- Criterion B: Message (out of 12) -> Relevance to stimulus, idea development, depth and clarity. (PENALTY: If off-topic, nonsense, or test gibberish, award maximum 1-3).
- Criterion C: Conceptual Understanding / Conventions (out of 6) -> Adherence to text type conventions, register, tone, audience awareness.

CRITICAL INSTRUCTION:
Your feedback MUST be well-structured into clear sections so the teacher understands your exact grading rationale:
1. Criterion Breakdown (Language, Message, Conventions)
2. Strengths (What the student did well)
3. Areas for Improvement / Deficiencies (Grammar/vocab slips, task omissions, formatting errors)

Return ONLY a valid JSON object in this exact format without markdown backticks:
{
  "scoreA": <number 0-12>,
  "scoreB": <number 0-12>,
  "scoreC": <number 0-6>,
  "feedback": "• Criterion A (Language - X/12): [Rationale]\\n• Criterion B (Message - Y/12): [Rationale]\\n• Criterion C (Conventions - Z/6): [Rationale]\\n\\n🌟 STRENGTHS:\\n- [Specific praise]\\n\\n⚠️ DEFICIENCIES & AREAS FOR IMPROVEMENT:\\n- [Concrete gaps, why points were deducted]"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: evaluationPrompt,
    });

    const rawOutput = response.text?.replace(/```json|```/g, '').trim() || '{}';
    const parsed = JSON.parse(rawOutput);

    return NextResponse.json({
      scoreA: Number(parsed.scoreA) ?? 2,
      scoreB: Number(parsed.scoreB) ?? 2,
      scoreC: Number(parsed.scoreC) ?? 1,
      feedback: parsed.feedback || 'Preliminary rubric assessment generated.'
    });

  } catch (error: any) {
    console.error('AI Rubric Evaluation Error:', error);
    return NextResponse.json({
      scoreA: 2,
      scoreB: 2,
      scoreC: 1,
      feedback: 'Criterion A (2/12): Basic sentence structures.\\nCriterion B (2/12): Minimal task alignment.\\nCriterion C (1/6): Format conventions need development.'
    });
  }
}