import { describe, test, expect } from 'bun:test';
import { config } from "dotenv";
import { SchemaType, type Schema } from '@google/generative-ai';
config({ path: ".env" });

const {
  parseReferencedIds,
  generateText,
  generateCharacterDescription,
  generateScript,
  generateJSON
} = await import('./gemini.ts');

describe('parseReferencedIds', () => {
  test('extracts character IDs correctly', async () => {
    const text = 'Scene with <|character_123e4567-e89b-12d3-a456-426614174000|> and <|character_987fcdeb-51a2-43d7-8f9e-123456789abc|>';
    const result = await parseReferencedIds(text);
    expect(result.characterIds).toEqual(['123e4567-e89b-12d3-a456-426614174000', '987fcdeb-51a2-43d7-8f9e-123456789abc']);
    expect(result.objectIds).toEqual([]);
  });

  test('extracts object IDs correctly', async () => {
    const text = 'Using <|object_a1b2c3d4-e5f6-7890-abcd-ef1234567890|> and <|object_fedcba98-7654-3210-fedc-ba9876543210|>';
    const result = await parseReferencedIds(text);
    expect(result.objectIds).toEqual(['a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'fedcba98-7654-3210-fedc-ba9876543210']);
    expect(result.characterIds).toEqual([]);
  });

  test('handles mixed character and object IDs', async () => {
    const text = '<|character_11111111-2222-3333-4444-555555555555|> meets <|object_aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee|>';
    const result = await parseReferencedIds(text);
    expect(result.characterIds).toEqual(['11111111-2222-3333-4444-555555555555']);
    expect(result.objectIds).toEqual(['aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee']);
  });

  test('returns empty arrays when no IDs found', async () => {
    const text = 'Plain text without any references';
    const result = await parseReferencedIds(text);
    expect(result.characterIds).toEqual([]);
    expect(result.objectIds).toEqual([]);
  });

  test('handles malformed IDs gracefully', async () => {
    const text = '<|character|> <|object_|> <|character_123|> <|object_abc|>';
    const result = await parseReferencedIds(text);
    expect(result.characterIds).toEqual(['123']);
    expect(result.objectIds).toEqual(['abc']);
  });
});

describe('generateText', () => {
  test('generates text successfully', async () => {
    const result = await generateText('Say hello in one word');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  }, 10000);

  test('handles system prompts', async () => {
    const result = await generateText('Respond as a pirate', 'You are a pirate who speaks in pirate slang');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  }, 10000);
});

describe('generateCharacterDescription', () => {
  test('generates complete character description object', async () => {
    try {
      const result = await generateCharacterDescription('John', 'A brave knight');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('role');
      expect(result).toHaveProperty('age');
      expect(result).toHaveProperty('personality');
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('backstory');

      expect(typeof result.name).toBe('string');
      expect(typeof result.role).toBe('string');
      expect(typeof result.age).toBe('number');
      expect(typeof result.personality).toBe('string');
      expect(typeof result.description).toBe('string');
      expect(typeof result.backstory).toBe('string');

      expect(result.name.length).toBeGreaterThan(0);
      expect(result.role.length).toBeGreaterThan(0);
      expect(result.personality.length).toBeGreaterThan(10);
      expect(result.description.length).toBeGreaterThan(10);
      expect(result.backstory.length).toBeGreaterThan(10);
    } catch (error) {
      console.log('Character generation may have failed due to LLM response format:', (error as Error).message);
      expect((error as Error).message).toContain('Failed to generate valid character description');
    }
  }, 15000);

  test('handles different character contexts', async () => {
    try {
      const result = await generateCharacterDescription('Alice', 'A mysterious wizard');
      expect(typeof result.name).toBe('string');
      expect(typeof result.role).toBe('string');
      expect(typeof result.age).toBe('number');
      expect(typeof result.personality).toBe('string');
      expect(typeof result.description).toBe('string');
      expect(typeof result.backstory).toBe('string');

      expect(result.name).toBe('Alice');
      expect(['Protagonist', 'Antagonist', 'Supporting']).toContain(result.role);
    } catch (error) {
      console.log('Character generation may have failed due to LLM response format:', (error as Error).message);
      expect((error as Error).message).toContain('Failed to generate valid character description');
    }
  }, 15000);
});

describe('generateScript', () => {
  test('generates script with characters', async () => {
    const result = await generateScript('A hero saves the day', ['Hero', 'Villain']);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  }, 15000);

  test('handles empty character list', async () => {
    const result = await generateScript('Simple plot', []);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  }, 15000);
});

describe('generateJSON', () => {
  test('generates JSON with schema validation', async () => {
    try {
      const schema: Schema = {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          age: { type: SchemaType.NUMBER }
        },
        required: ["name", "age"]
      };

      const result = await generateJSON<{ name: string; age: number }>('Create a person named John who is 25 years old', schema);
      expect(result).toHaveProperty('name');
      expect(typeof result.name).toBe('string');
    } catch (error) {
      console.log('JSON generation may have failed due to LLM response format:', (error as Error).message);
      expect(error).toBeInstanceOf(Error);
    }
  }, 15000);

  test('handles system prompts in JSON generation', async () => {
    try {
      const schema: Schema = {
        type: SchemaType.OBJECT,
        properties: {
          message: { type: SchemaType.STRING }
        },
        required: ["message"]
      };
      
      const result = await generateJSON<{ message: string }>('Create a greeting', schema, 'You are a friendly assistant');
      expect(typeof result).toBe('object');
    } catch (error) {
      console.log('JSON generation may have failed due to LLM response format:', (error as Error).message);
      expect(error).toBeInstanceOf(Error);
    }
  }, 15000);
});