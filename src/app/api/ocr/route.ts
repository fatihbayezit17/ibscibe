import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// Google sunucu yoğunluğunda sırayla devreye girecek modeller
const MODELS_TO_TRY = [
  'gemini-3.8-flash',
  'gemini-3-flash-preview',
  'gemini-2.5-flash-lite',
];

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No image file uploaded.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');

    const prompt = `You are a high-precision OCR transcription engine specialized in handwriting for IB Diploma Programme English examinations.
Transcribe the handwritten English text from this image exactly as written by the student.
Rules:
- Preserve paragraphs, formatting conventions (such as salutations, titles, signatures, dates), and line breaks accurately.
- Do not add explanations, comments, summaries, or introductions.
- Return ONLY the exact transcribed text.`;

    let lastError: any = null;

    // Modelleri ve denemeleri akıllıca döner
    for (const model of MODELS_TO_TRY) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const response = await ai.models.generateContent({
            model: model,
            contents: [
              {
                role: 'user',
                parts: [
                  { text: prompt },
                  {
                    inlineData: {
                      mimeType: file.type || 'image/jpeg',
                      data: base64Data,
                    },
                  },
                ],
              },
            ],
          });

          const transcribedText = response.text?.trim() || '';
          if (transcribedText) {
            return NextResponse.json({ text: transcribedText });
          }
        } catch (err: any) {
          lastError = err;
          // Eğer 503 (yoğunluk) ise biraz nefes alıp ya tekrar dener ya da sonraki modele geçer
          console.warn(`Model ${model} attempt ${attempt} failed:`, err?.message || err);
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    }

    throw lastError || new Error('Google servers are momentarily busy. Please try again.');
  } catch (error: any) {
    console.error('Gemini OCR Final Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to process handwriting with Gemini.' },
      { status: 500 }
    );
  }
}