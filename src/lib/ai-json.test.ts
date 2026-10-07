import { describe, it, expect, vi } from 'vitest';
import { extractJson, requestJsonText } from './ai-json';

describe('extractJson', () => {
  it('reads bare JSON', () => {
    expect(extractJson('{"tags":["a","b"]}')).toEqual({ tags: ['a', 'b'] });
    expect(extractJson('["a","b"]')).toEqual(['a', 'b']);
    expect(extractJson('"just a string"')).toBe('just a string');
  });

  it('reads JSON inside a code fence', () => {
    expect(extractJson('```json\n{"description":"A hook."}\n```')).toEqual({ description: 'A hook.' });
    expect(extractJson('```\n["x"]\n```')).toEqual(['x']);
  });

  it('finds the JSON inside a sentence', () => {
    expect(extractJson('Sure! Here are the tags: {"tags":["react","hooks"]} Hope that helps.')).toEqual({
      tags: ['react', 'hooks'],
    });
    expect(extractJson('Tags: ["react", "hooks"].')).toEqual(['react', 'hooks']);
  });

  it('is not fooled by braces inside strings', () => {
    expect(extractJson('Result: {"description":"Uses a } brace and a \\" quote"} done')).toEqual({
      description: 'Uses a } brace and a " quote',
    });
  });

  it('is undefined when there is no JSON at all', () => {
    expect(extractJson('react, hooks, auth')).toBeUndefined();
    expect(extractJson('   ')).toBeUndefined();
    expect(extractJson('{"unfinished": ')).toBeUndefined();
  });
});

describe('requestJsonText', () => {
  const request = { model: 'm', instructions: 'i', input: 'x' };

  it('asks for JSON mode first and returns the text', async () => {
    const create = vi.fn().mockResolvedValue({ output_text: '{"a":1}' });

    const text = await requestJsonText({ responses: { create } } as never, request);

    expect(text).toBe('{"a":1}');
    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith({ ...request, text: { format: { type: 'json_object' } } });
  });

  it('asks again without JSON mode when the provider refuses it', async () => {
    const create = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('response_format is not supported'), { status: 400 }))
      .mockResolvedValueOnce({ output_text: 'Tags: ["a"]' });

    const text = await requestJsonText({ responses: { create } } as never, request);

    expect(text).toBe('Tags: ["a"]');
    expect(create).toHaveBeenCalledTimes(2);
    expect(create).toHaveBeenLastCalledWith(request);
  });

  it('does not retry on other failures (a bad key stays a bad key)', async () => {
    const create = vi.fn().mockRejectedValue(Object.assign(new Error('Unauthorized'), { status: 401 }));

    await expect(requestJsonText({ responses: { create } } as never, request)).rejects.toThrow('Unauthorized');
    expect(create).toHaveBeenCalledTimes(1);
  });
});
