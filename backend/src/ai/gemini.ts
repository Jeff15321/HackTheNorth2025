import { GoogleGenerativeAI, SchemaType, type Schema } from '@google/generative-ai';

const IMAGE_MODEL = 'gemini-2.0-flash-preview-image-generation';
const TEXT_MODEL = 'gemini-2.5-flash';

const PROMPTS = {
  IMAGE_GENERATION: 'Generate a high-quality, detailed image based on this description: {prompt}',
  IMAGE_EDITING: 'Edit this image according to the following instructions: {prompt}',
  CHARACTER_SYSTEM: 'You are a professional character designer. Create detailed character descriptions in JSON format with fields: name, age, personality, description.',
  SCRIPT_SYSTEM: 'You are a professional screenwriter. Generate detailed scripts with dialogue, scene descriptions, and camera directions. Keep scenes under 8 seconds for video generation.',
  SCENE_SYSTEM: 'You are a film director. Generate detailed scene breakdowns in JSON format with fields: detailed_plot, concise_plot, duration, dialogue.',
  FRAME_SYSTEM: 'You are a video prompt engineer. Generate Veo 3 video prompts in JSON format with fields: veo3_prompt, dialogue, summary, split_reason.',
  PLOT_SYSTEM: 'You are a professional story consultant. Generate detailed plot outlines with clear story beats, character arcs, and scene breakdowns.'
};

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error('GEMINI_API_KEY environment variable required');

const gemini = new GoogleGenerativeAI(apiKey.trim());

export async function generateImage(prompt: string, options?: { width?: number; height?: number; inputImage?: Buffer }): Promise<Buffer> {
  const model = gemini.getGenerativeModel({ model: IMAGE_MODEL });
  const imagePrompt = options?.inputImage
    ? PROMPTS.IMAGE_EDITING.replace('{prompt}', prompt)
    : PROMPTS.IMAGE_GENERATION.replace('{prompt}', prompt);

  const parts: any[] = [{ text: imagePrompt }];

  if (options?.inputImage) {
    parts.push({
      inlineData: {
        mimeType: 'image/png',
        data: options.inputImage.toString('base64')
      }
    });
  }

  const result = await model.generateContent({
    contents: [{ role: 'user', parts }],
    generationConfig: { responseModalities: ["IMAGE", "TEXT"] } as any
  });

  const responseParts = result.response.candidates?.[0]?.content?.parts;
  if (!responseParts) throw new Error('No image generated');

  for (const part of responseParts) {
    if ('inlineData' in part && part.inlineData?.data) {
      return Buffer.from(part.inlineData.data, 'base64');
    }
  }

  const textPart = responseParts.find(part => 'text' in part);
  if (textPart && 'text' in textPart && textPart.text) {
    try {
      const jsonResponse = JSON.parse(textPart.text);
      if (jsonResponse.image) return Buffer.from(jsonResponse.image, 'base64');
    } catch {}
  }

  throw new Error('No image data in response');
}

export async function editImage(imageBuffer: Buffer, editPrompt: string): Promise<Buffer> {
  return generateImage(editPrompt, { inputImage: imageBuffer });
}

export async function generateText(prompt: string, systemPrompt?: string): Promise<string> {
  const model = gemini.getGenerativeModel({ model: TEXT_MODEL });
  const fullPrompt = systemPrompt ? `${systemPrompt}\n\nUser: ${prompt}` : prompt;
  const result = await model.generateContent(fullPrompt);
  const text = result.response.text();

  if (!text) throw new Error('No text generated');
  return text;
}

export async function generateScript(plot: string, characters: string[]): Promise<string> {
  const prompt = `Plot: ${plot}\nCharacters: ${characters.join(', ')}\n\nGenerate a complete script with scene descriptions, character dialogue, camera directions, and time constraints (max 8 seconds per scene).`;
  return generateText(prompt, PROMPTS.SCRIPT_SYSTEM);
}

export async function generateCharacterDescription(name: string, context: string): Promise<{
  name: string;
  age: number;
  personality: string;
  description: string;
}> {
  const geminiSchema = {
    type: SchemaType.OBJECT,
    properties: {
      name: { type: SchemaType.STRING },
      age: { type: SchemaType.NUMBER },
      personality: { type: SchemaType.STRING },
      description: { type: SchemaType.STRING }
    },
    required: ["name", "age", "personality", "description"]
  } as Schema;

  const prompt = `Create a character description for "${name}" in the context of: ${context}`;
  return generateJSON(prompt, geminiSchema, PROMPTS.CHARACTER_SYSTEM);
}

export async function generateJSON<T>(
  prompt: string,
  geminiSchema: Schema,
  systemPrompt?: string
): Promise<T> {
  const model = gemini.getGenerativeModel({
    model: TEXT_MODEL,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: geminiSchema
    }
  });

  const jsonPrompt = `${systemPrompt ? systemPrompt + '\n\n' : ''}${prompt}`;

  const result = await model.generateContent(jsonPrompt);
  const text = result.response.text().trim();

  if (!text) {
    throw new Error('No response generated');
  }

  const parsed = JSON.parse(text);
  return parsed as T;
}

export async function parseReferencedIds(text: string): Promise<{
  characterIds: string[];
  objectIds: string[];
}> {
  const characterMatches = text.match(/<\|character_([a-f0-9-]+)\|>/g) || [];
  const objectMatches = text.match(/<\|object_([a-f0-9-]+)\|>/g) || [];

  const characterIds = characterMatches
    .map(match => match.match(/<\|character_([a-f0-9-]+)\|>/)?.[1])
    .filter(Boolean) as string[];

  const objectIds = objectMatches
    .map(match => match.match(/<\|object_([a-f0-9-]+)\|>/)?.[1])
    .filter(Boolean) as string[];

  return { characterIds, objectIds };
}

