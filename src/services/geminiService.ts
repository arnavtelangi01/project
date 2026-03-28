import { GoogleGenAI, Type, Modality, ThinkingLevel } from "@google/genai";
import { Difficulty } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface EvaluationResult {
  score: number;
  feedback: string;
}

export const evaluateAnswerWithAI = async (
  question: string, 
  answer: string, 
  difficulty: Difficulty
): Promise<EvaluationResult> => {
  try {
    const difficultyContext = {
      EASY: "Be lenient and encouraging. Focus on basic communication and presence.",
      MEDIUM: "Be balanced. Expect clear structure and relevant examples.",
      HARD: "Be critical and demanding. Expect high-level strategic thinking, specific metrics, and exceptional professionalism."
    }[difficulty];

    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: `Question: ${question}\nAnswer: ${answer}\nDifficulty Level: ${difficulty}`,
      config: {
        systemInstruction: `You are an expert interview coach. Evaluate the user's answer to the interview question. 
        The difficulty level is ${difficulty}. ${difficultyContext}
        Provide a score from 0 to 100 and constructive feedback. Be encouraging but honest.`,
        responseMimeType: "application/json",
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.HIGH,
        },
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: {
              type: Type.NUMBER,
              description: "A score from 0 to 100 based on the quality of the answer and the selected difficulty level.",
            },
            feedback: {
              type: Type.STRING,
              description: "Constructive feedback on the answer, highlighting strengths and areas for improvement.",
            },
          },
          required: ["score", "feedback"],
        },
      },
    });

    const result = JSON.parse(response.text || '{"score": 0, "feedback": "Error evaluating answer."}');
    return result as EvaluationResult;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return {
      score: 0,
      feedback: "There was an error connecting to the AI service. Please try again.",
    };
  }
};

export const transcribeAudio = async (base64Audio: string, mimeType: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: [
        {
          inlineData: {
            data: base64Audio,
            mimeType: mimeType,
          },
        },
        {
          text: "Transcribe this audio accurately. Only return the transcribed text.",
        },
      ],
    });

    return response.text || "";
  } catch (error) {
    console.error("Transcription Error:", error);
    return "";
  }
};

export const generateSpeech = async (text: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Read this interview question clearly: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return base64Audio || "";
  } catch (error) {
    console.error("TTS Error:", error);
    return "";
  }
};

export const pcmToWav = (pcmBase64: string, sampleRate: number = 24000): string => {
  const binaryString = atob(pcmBase64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);

  // RIFF identifier
  view.setUint32(0, 0x52494646, false); // "RIFF"
  // file length
  view.setUint32(4, 36 + len, true);
  // RIFF type
  view.setUint32(8, 0x57415645, false); // "WAVE"
  // format chunk identifier
  view.setUint32(12, 0x666d7420, false); // "fmt "
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (raw)
  view.setUint16(20, 1, true);
  // channel count
  view.setUint16(22, 1, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sample rate * block align)
  view.setUint32(28, sampleRate * 2, true);
  // block align (channel count * bytes per sample)
  view.setUint16(32, 2, true);
  // bits per sample
  view.setUint16(34, 16, true);
  // data chunk identifier
  view.setUint32(36, 0x64617461, false); // "data"
  // data chunk length
  view.setUint32(40, len, true);

  const blob = new Blob([wavHeader, bytes], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
};
