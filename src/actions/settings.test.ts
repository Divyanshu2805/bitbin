import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { Session } from 'next-auth';

// Mock the auth module
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

// Mock the db module
vi.mock('@/lib/db/users', () => ({
  updateEditorPreferences: vi.fn(),
  updateUserName: vi.fn(),
}));

import { updateEditorPreferences, updateName } from './settings';
import { auth } from '@/auth';
import { updateEditorPreferences as updateEditorPreferencesQuery, updateUserName } from '@/lib/db/users';
import { DEFAULT_EDITOR_PREFERENCES } from '@/lib/constants/editor';

const mockAuth = auth as unknown as Mock<() => Promise<Session | null>>;
const mockUpdateEditorPreferencesQuery = vi.mocked(updateEditorPreferencesQuery);
const mockUpdateUserName = vi.mocked(updateUserName);

describe('updateEditorPreferences server action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns error when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const result = await updateEditorPreferences(DEFAULT_EDITOR_PREFERENCES);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized');
  });

  it('returns error for invalid font size', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });

    const result = await updateEditorPreferences({
      ...DEFAULT_EDITOR_PREFERENCES,
      fontSize: 999, // Invalid font size
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid preferences');
  });

  it('returns error for invalid tab size', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });

    const result = await updateEditorPreferences({
      ...DEFAULT_EDITOR_PREFERENCES,
      tabSize: 3, // Invalid tab size (not 2, 4, or 8)
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid preferences');
  });

  it('returns error for invalid theme', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });

    const result = await updateEditorPreferences({
      ...DEFAULT_EDITOR_PREFERENCES,
      theme: 'invalid-theme' as 'vs-dark',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid preferences');
  });

  it('successfully updates valid preferences', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });
    mockUpdateEditorPreferencesQuery.mockResolvedValue(true);

    const preferences = {
      fontSize: 16,
      tabSize: 4,
      wordWrap: false,
      minimap: true,
      theme: 'monokai' as const,
    };

    const result = await updateEditorPreferences(preferences);

    expect(result.success).toBe(true);
    expect(mockUpdateEditorPreferencesQuery).toHaveBeenCalledWith('user-123', preferences);
  });

  it('returns error when database update fails', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });
    mockUpdateEditorPreferencesQuery.mockResolvedValue(false);

    const result = await updateEditorPreferences(DEFAULT_EDITOR_PREFERENCES);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to update preferences');
  });

  it('handles database exceptions gracefully', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });
    mockUpdateEditorPreferencesQuery.mockRejectedValue(new Error('Database error'));

    const result = await updateEditorPreferences(DEFAULT_EDITOR_PREFERENCES);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to update preferences');
  });

  it('validates all valid font sizes', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });
    mockUpdateEditorPreferencesQuery.mockResolvedValue(true);

    const validFontSizes = [12, 13, 14, 15, 16, 18, 20];

    for (const fontSize of validFontSizes) {
      const result = await updateEditorPreferences({
        ...DEFAULT_EDITOR_PREFERENCES,
        fontSize,
      });
      expect(result.success).toBe(true);
    }
  });

  it('validates all valid themes', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });
    mockUpdateEditorPreferencesQuery.mockResolvedValue(true);

    const validThemes = ['vs-dark', 'monokai', 'github-dark'] as const;

    for (const theme of validThemes) {
      const result = await updateEditorPreferences({
        ...DEFAULT_EDITOR_PREFERENCES,
        theme,
      });
      expect(result.success).toBe(true);
    }
  });
});

describe('updateName server action', () => {
  const session = { user: { id: 'user-123', isPro: false }, expires: new Date().toISOString() };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns error when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const result = await updateName({ name: 'Ada' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized');
    expect(mockUpdateUserName).not.toHaveBeenCalled();
  });

  it('rejects an empty name', async () => {
    mockAuth.mockResolvedValue(session);

    const result = await updateName({ name: '   ' });

    expect(result.success).toBe(false);
    expect(result.fieldErrors?.name).toContain('Name is required');
    expect(mockUpdateUserName).not.toHaveBeenCalled();
  });

  it('rejects a name over 50 characters', async () => {
    mockAuth.mockResolvedValue(session);

    const result = await updateName({ name: 'a'.repeat(51) });

    expect(result.success).toBe(false);
    expect(result.fieldErrors?.name).toContain('Name must be 50 characters or fewer');
  });

  it('trims the name and saves it for the session user only', async () => {
    mockAuth.mockResolvedValue(session);
    mockUpdateUserName.mockResolvedValue('Ada Lovelace');

    const result = await updateName({ name: '  Ada Lovelace  ' });

    expect(mockUpdateUserName).toHaveBeenCalledWith('user-123', 'Ada Lovelace');
    expect(result).toEqual({ success: true, data: { name: 'Ada Lovelace' } });
  });

  it('returns an error when the user no longer exists', async () => {
    mockAuth.mockResolvedValue(session);
    mockUpdateUserName.mockResolvedValue(null);

    const result = await updateName({ name: 'Ada' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Could not update your name. Try again.');
  });
});
