import { GoogleGenerativeAI, SchemaType, type Schema } from '@google/generative-ai';

const IMAGE_MODEL = 'gemini-2.5-flash-image-preview';
const TEXT_MODEL = 'gemini-2.0-flash';
// const IMAGE_MODEL = 'gemini-2.0-flash-preview-image-generation';
// const TEXT_MODEL = 'gemini-2.0-flash';

const PROMPTS = {
  IMAGE_GENERATION: 'Generate a high-quality, detailed image based on this description: {prompt}',
  IMAGE_EDITING: 'Edit this image according to the following instructions: {prompt}',
  CHARACTER_SYSTEM: 'You are a professional character designer. Create detailed character descriptions in JSON format with fields: name, role, age, personality, description, backstory.',
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
  role: string;
  age: number;
  personality: string;
  description: string;
  backstory: string;
}> {
  const geminiSchema = {
    type: SchemaType.OBJECT,
    properties: {
      name: { type: SchemaType.STRING },
      role: { type: SchemaType.STRING },
      age: { type: SchemaType.NUMBER },
      personality: { type: SchemaType.STRING },
      description: { type: SchemaType.STRING },
      backstory: { type: SchemaType.STRING }
    },
    required: ["name", "role", "age", "personality", "description", "backstory"]
  } as Schema;

  const prompt = `Create a complete character description for "${name}" in the context of: ${context}

  Please provide:
  - name: Character's full name
  - role: Their role in the story (Protagonist, Antagonist, or Supporting)
  - age: Their age as a number
  - description: Physical appearance and visual characteristics (at least 20 words)
  - personality: Detailed personality traits and motivations (at least 20 words)
  - backstory: Their background story and history (at least 20 words)`;
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

export async function generateJSONWithImages<T>(
  prompt: string,
  geminiSchema: Schema,
  systemPrompt?: string,
  imageContexts?: { url: string; description: string }[]
): Promise<T> {
  const timestamp = new Date().toISOString();
  const logId = `${timestamp}_${Math.random().toString(36).substring(2, 11)}`;

  // Create test folder and log file
  const fs = await import('fs');
  const path = await import('path');
  const testDir = path.join(process.cwd(), 'test-image-context');

  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  const logPath = path.join(testDir, `${logId}_image_context.log`);

  function writeLog(message: string) {
    const logEntry = `[${new Date().toISOString()}] ${message}\n`;
    fs.appendFileSync(logPath, logEntry);
  }

  writeLog(`=== IMAGE CONTEXT SESSION START - ID: ${logId} ===`);
  writeLog(`Image contexts provided: ${imageContexts?.length || 0}`);

  if (imageContexts && imageContexts.length > 0) {
    writeLog(`Image URLs:`);
    imageContexts.forEach((ctx, i) => {
      writeLog(`  ${i + 1}. ${ctx.url} - ${ctx.description}`);
    });
  }

  const model = gemini.getGenerativeModel({
    model: TEXT_MODEL,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: geminiSchema
    }
  });

  const parts: any[] = [];
  const loadedImages: { url: string; description: string; size: number; mimeType: string; savedPath: string }[] = [];

  // Build the full text prompt first
  let fullTextPrompt = '';

  if (systemPrompt) {
    fullTextPrompt += systemPrompt + '\n\n';
  }

  // Add image context descriptions to text
  if (imageContexts && imageContexts.length > 0) {
    fullTextPrompt += 'Reference images provided:\n';
    imageContexts.forEach((ctx, i) => {
      fullTextPrompt += `${i + 1}. ${ctx.description}\n`;
    });
    fullTextPrompt += '\nUse these reference images to maintain visual consistency and style.\n\n';
  }

  fullTextPrompt += prompt;

  // Add the text prompt
  parts.push({ text: fullTextPrompt });

  // Add image files if provided
  if (imageContexts && imageContexts.length > 0) {
    for (let i = 0; i < imageContexts.length; i++) {
      const imageContext = imageContexts[i];
      try {
        writeLog(`Fetching image ${i + 1}/${imageContexts.length}: ${imageContext.url}`);

        // Fetch image from URL and attach as file
        const response = await fetch(imageContext.url);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const imageBuffer = Buffer.from(arrayBuffer);
          const base64Image = imageBuffer.toString('base64');

          // Determine MIME type from URL or default to PNG
          const mimeType = imageContext.url.includes('.jpg') || imageContext.url.includes('.jpeg')
            ? 'image/jpeg'
            : 'image/png';

          parts.push({
            inlineData: {
              mimeType,
              data: base64Image
            }
          });

          // Save image buffer to test folder
          const fileExtension = mimeType === 'image/jpeg' ? 'jpg' : 'png';
          const fileName = `${logId}_image_${i + 1}.${fileExtension}`;
          const imagePath = path.join(testDir, fileName);

          fs.writeFileSync(imagePath, imageBuffer);

          loadedImages.push({
            url: imageContext.url,
            description: imageContext.description,
            size: imageBuffer.length,
            mimeType,
            savedPath: imagePath
          });

          writeLog(`✅ Successfully loaded and saved image ${i + 1}: ${imageBuffer.length} bytes, ${mimeType} -> ${imagePath}`);
        } else {
          writeLog(`❌ Failed to fetch image ${i + 1}: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        writeLog(`❌ Error loading image ${i + 1}: ${error}`);
      }
    }
  }

  // Log final composition
  writeLog(`Final prompt composition: ${parts.length} parts (1 text + ${loadedImages.length} images)`);
  writeLog(`Full text prompt length: ${fullTextPrompt.length} characters`);

  // Save full prompt to file
  const promptPath = path.join(testDir, `${logId}_full_prompt.txt`);
  fs.writeFileSync(promptPath, fullTextPrompt);
  writeLog(`Full prompt saved to: ${promptPath}`);

  // Save detailed JSON log
  const jsonLogData = {
    logId,
    timestamp,
    imageContextsProvided: imageContexts?.length || 0,
    imageContexts: imageContexts || [],
    loadedImages,
    totalParts: parts.length,
    textParts: 1,
    imageParts: loadedImages.length,
    fullTextPromptLength: fullTextPrompt.length
  };

  const jsonLogPath = path.join(testDir, `${logId}_detailed_log.json`);
  fs.writeFileSync(jsonLogPath, JSON.stringify(jsonLogData, null, 2));
  writeLog(`Detailed JSON log saved to: ${jsonLogPath}`);

  writeLog(`Sending to Gemini with ${parts.length} parts`);

  const result = await model.generateContent({
    contents: [{ role: 'user', parts }]
  });

  const text = result.response.text().trim();

  if (!text) {
    throw new Error('No response generated');
  }

  const parsed = JSON.parse(text);
  writeLog(`✅ Successfully generated response with ${loadedImages.length} image contexts`);
  writeLog(`=== IMAGE CONTEXT SESSION END ===\n`);

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

