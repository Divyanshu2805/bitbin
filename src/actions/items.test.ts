import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { Session } from 'next-auth';

// Mock the auth module
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

// Mock the db module
vi.mock('@/lib/db/items', () => ({
  updateItem: vi.fn(),
  deleteItem: vi.fn(),
  createItem: vi.fn(),
  toggleItemFavorite: vi.fn(),
  toggleItemPin: vi.fn(),
  getCollectionsForItem: vi.fn(),
  setItemInCollection: vi.fn(),
  VALID_ITEM_TYPES: ['snippet', 'prompt', 'command', 'note', 'file', 'image', 'link'] as const,
}));

// Mock the usage module
vi.mock('@/lib/usage', () => ({
  canCreateItem: vi.fn(),
}));

import { updateItem, deleteItem, createItem, toggleItemFavorite, toggleItemPin, getItemCollections, setItemCollection } from './items';
import { auth } from '@/auth';
import { updateItem as updateItemQuery, deleteItem as deleteItemQuery, createItem as createItemQuery, toggleItemFavorite as toggleItemFavoriteQuery, toggleItemPin as toggleItemPinQuery, getCollectionsForItem, setItemInCollection } from '@/lib/db/items';
import { canCreateItem } from '@/lib/usage';

const mockAuth = auth as unknown as Mock<() => Promise<Session | null>>;
const mockUpdateItemQuery = vi.mocked(updateItemQuery);
const mockDeleteItemQuery = vi.mocked(deleteItemQuery);
const mockCreateItemQuery = vi.mocked(createItemQuery);
const mockToggleItemFavoriteQuery = vi.mocked(toggleItemFavoriteQuery);
const mockToggleItemPinQuery = vi.mocked(toggleItemPinQuery);
const mockCanCreateItem = vi.mocked(canCreateItem);

describe('updateItem server action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns error when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const result = await updateItem('item-123', {
      title: 'Test',
      description: null,
      content: null,
      url: null,
      language: null,
      tags: [],
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized');
  });

  it('returns validation error for empty title', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });

    const result = await updateItem('item-123', {
      title: '   ',
      description: null,
      content: null,
      url: null,
      language: null,
      tags: [],
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Validation failed');
    expect(result.fieldErrors?.title).toBeDefined();
  });

  it('returns validation error for a description over the cap', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });

    const result = await updateItem('item-123', {
      title: 'Test',
      description: 'a'.repeat(1001),
      content: null,
      url: null,
      language: null,
      tags: [],
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Validation failed');
    expect(result.fieldErrors?.description).toBeDefined();
  });

  it('returns validation error for invalid URL', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });

    const result = await updateItem('item-123', {
      title: 'Test',
      description: null,
      content: null,
      url: 'not-a-url',
      language: null,
      tags: [],
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Validation failed');
    expect(result.fieldErrors?.url).toBeDefined();
  });

  it('returns error when item not found', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });
    mockUpdateItemQuery.mockResolvedValue(null);

    const result = await updateItem('item-123', {
      title: 'Test',
      description: null,
      content: null,
      url: null,
      language: null,
      tags: [],
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Item not found or access denied');
  });

  it('returns updated item on success', async () => {
    const mockItem = {
      id: 'item-123',
      title: 'Updated Title',
      description: 'Updated description',
      content: 'const x = 1;',
      url: null,
      language: 'javascript',
      contentType: 'TEXT',
      fileUrl: null,
      fileName: null,
      fileSize: null,
      isFavorite: false,
      isPinned: false,
      itemType: { name: 'snippet', icon: 'Code', color: '#3b82f6' },
      tags: ['react', 'hooks'],
      collections: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });
    mockUpdateItemQuery.mockResolvedValue(mockItem);

    const result = await updateItem('item-123', {
      title: 'Updated Title',
      description: 'Updated description',
      content: 'const x = 1;',
      url: null,
      language: 'javascript',
      tags: ['react', 'hooks'],
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockItem);
    expect(mockUpdateItemQuery).toHaveBeenCalledWith('user-123', 'item-123', {
      title: 'Updated Title',
      description: 'Updated description',
      content: 'const x = 1;',
      url: null,
      language: 'javascript',
      tags: ['react', 'hooks'],
    });
  });

  it('filters empty tags', async () => {
    const mockItem = {
      id: 'item-123',
      title: 'Test',
      description: null,
      content: null,
      url: null,
      language: null,
      contentType: 'TEXT',
      fileUrl: null,
      fileName: null,
      fileSize: null,
      isFavorite: false,
      isPinned: false,
      itemType: { name: 'snippet', icon: 'Code', color: '#3b82f6' },
      tags: ['valid'],
      collections: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });
    mockUpdateItemQuery.mockResolvedValue(mockItem);

    await updateItem('item-123', {
      title: 'Test',
      description: null,
      content: null,
      url: null,
      language: null,
      tags: ['valid', '', '  ', 'another'],
    });

    expect(mockUpdateItemQuery).toHaveBeenCalledWith('user-123', 'item-123', {
      title: 'Test',
      description: null,
      content: null,
      url: null,
      language: null,
      tags: ['valid', 'another'],
    });
  });

  it('passes collectionIds when provided', async () => {
    const mockItem = {
      id: 'item-123',
      title: 'Test',
      description: null,
      content: null,
      url: null,
      language: null,
      contentType: 'TEXT',
      fileUrl: null,
      fileName: null,
      fileSize: null,
      isFavorite: false,
      isPinned: false,
      itemType: { name: 'snippet', icon: 'Code', color: '#3b82f6' },
      tags: [],
      collections: [{ id: 'coll-1', name: 'React' }],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });
    mockUpdateItemQuery.mockResolvedValue(mockItem);

    await updateItem('item-123', {
      title: 'Test',
      description: null,
      content: null,
      url: null,
      language: null,
      tags: [],
      collectionIds: ['coll-1', 'coll-2'],
    });

    expect(mockUpdateItemQuery).toHaveBeenCalledWith('user-123', 'item-123', {
      title: 'Test',
      description: null,
      content: null,
      url: null,
      language: null,
      tags: [],
      collectionIds: ['coll-1', 'coll-2'],
    });
  });
});

describe('deleteItem server action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns error when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const result = await deleteItem('item-123');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized');
  });

  it('returns error for empty item ID', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });

    const result = await deleteItem('');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid item ID');
  });

  it('returns error when item not found', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });
    mockDeleteItemQuery.mockResolvedValue(false);

    const result = await deleteItem('item-123');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Item not found or access denied');
  });

  it('returns success when item deleted', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });
    mockDeleteItemQuery.mockResolvedValue(true);

    const result = await deleteItem('item-123');

    expect(result.success).toBe(true);
    expect(mockDeleteItemQuery).toHaveBeenCalledWith('user-123', 'item-123');
  });
});

describe('createItem server action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: allow item creation
    mockCanCreateItem.mockResolvedValue(true);
  });

  it('returns error when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const result = await createItem({
      typeName: 'snippet',
      title: 'Test',
      description: null,
      content: null,
      url: null,
      language: null,
      tags: [],
      fileUrl: null,
      fileName: null,
      fileSize: null,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized');
  });

  it('returns validation error for empty title', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });

    const result = await createItem({
      typeName: 'snippet',
      title: '   ',
      description: null,
      content: null,
      url: null,
      language: null,
      tags: [],
      fileUrl: null,
      fileName: null,
      fileSize: null,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Validation failed');
    expect(result.fieldErrors?.title).toBeDefined();
  });

  it('returns validation error for a description over the cap', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });

    const result = await createItem({
      typeName: 'snippet',
      title: 'Test',
      description: 'a'.repeat(1001),
      content: null,
      url: null,
      language: null,
      tags: [],
      fileUrl: null,
      fileName: null,
      fileSize: null,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Validation failed');
    expect(result.fieldErrors?.description).toBeDefined();
  });

  it('returns validation error for invalid URL', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });

    const result = await createItem({
      typeName: 'link',
      title: 'Test Link',
      description: null,
      content: null,
      url: 'not-a-url',
      language: null,
      tags: [],
      fileUrl: null,
      fileName: null,
      fileSize: null,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Validation failed');
    expect(result.fieldErrors?.url).toBeDefined();
  });

  it('returns error when file type and not Pro', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });

    const result = await createItem({
      typeName: 'file',
      title: 'Test File',
      description: null,
      content: null,
      url: null,
      language: null,
      tags: [],
      fileUrl: 'https://example.com/file.pdf',
      fileName: 'file.pdf',
      fileSize: 1024,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('File and image uploads require a Pro subscription');
  });

  it('returns error when image type and not Pro', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });

    const result = await createItem({
      typeName: 'image',
      title: 'Test Image',
      description: null,
      content: null,
      url: null,
      language: null,
      tags: [],
      fileUrl: 'https://example.com/image.png',
      fileName: 'image.png',
      fileSize: 2048,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('File and image uploads require a Pro subscription');
  });

  it('returns error when item limit reached', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });
    mockCanCreateItem.mockResolvedValue(false);

    const result = await createItem({
      typeName: 'snippet',
      title: 'Test',
      description: null,
      content: null,
      url: null,
      language: null,
      tags: [],
      fileUrl: null,
      fileName: null,
      fileSize: null,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('free tier limit of 50 items');
  });

  it('returns error when URL is required for link but not provided', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });

    const result = await createItem({
      typeName: 'link',
      title: 'Test Link',
      description: null,
      content: null,
      url: null,
      language: null,
      tags: [],
      fileUrl: null,
      fileName: null,
      fileSize: null,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('URL is required for links');
    expect(result.fieldErrors?.url).toContain('URL is required');
  });

  it('returns error when creation fails', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });
    mockCreateItemQuery.mockResolvedValue(null);

    const result = await createItem({
      typeName: 'snippet',
      title: 'Test',
      description: null,
      content: null,
      url: null,
      language: null,
      tags: [],
      fileUrl: null,
      fileName: null,
      fileSize: null,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to create item');
  });

  it('returns created item on success', async () => {
    const mockItem = {
      id: 'item-123',
      title: 'New Snippet',
      description: 'A test snippet',
      content: 'const x = 1;',
      url: null,
      language: 'javascript',
      contentType: 'TEXT',
      fileUrl: null,
      fileName: null,
      fileSize: null,
      isFavorite: false,
      isPinned: false,
      itemType: { name: 'snippet', icon: 'Code', color: '#3b82f6' },
      tags: ['react'],
      collections: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });
    mockCreateItemQuery.mockResolvedValue(mockItem);

    const result = await createItem({
      typeName: 'snippet',
      title: 'New Snippet',
      description: 'A test snippet',
      content: 'const x = 1;',
      url: null,
      language: 'javascript',
      tags: ['react'],
      fileUrl: null,
      fileName: null,
      fileSize: null,
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockItem);
    expect(mockCreateItemQuery).toHaveBeenCalledWith('user-123', {
      typeName: 'snippet',
      title: 'New Snippet',
      description: 'A test snippet',
      content: 'const x = 1;',
      url: null,
      language: 'javascript',
      tags: ['react'],
      fileUrl: null,
      fileName: null,
      fileSize: null,
    });
  });

  it('filters empty tags', async () => {
    const mockItem = {
      id: 'item-123',
      title: 'Test',
      description: null,
      content: null,
      url: null,
      language: null,
      contentType: 'TEXT',
      fileUrl: null,
      fileName: null,
      fileSize: null,
      isFavorite: false,
      isPinned: false,
      itemType: { name: 'snippet', icon: 'Code', color: '#3b82f6' },
      tags: ['valid', 'another'],
      collections: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });
    mockCreateItemQuery.mockResolvedValue(mockItem);

    await createItem({
      typeName: 'snippet',
      title: 'Test',
      description: null,
      content: null,
      url: null,
      language: null,
      tags: ['valid', '', '  ', 'another'],
      fileUrl: null,
      fileName: null,
      fileSize: null,
    });

    expect(mockCreateItemQuery).toHaveBeenCalledWith('user-123', {
      typeName: 'snippet',
      title: 'Test',
      description: null,
      content: null,
      url: null,
      language: null,
      tags: ['valid', 'another'],
      fileUrl: null,
      fileName: null,
      fileSize: null,
    });
  });

  it('passes collectionIds when provided', async () => {
    const mockItem = {
      id: 'item-123',
      title: 'Test',
      description: null,
      content: null,
      url: null,
      language: null,
      contentType: 'TEXT',
      fileUrl: null,
      fileName: null,
      fileSize: null,
      isFavorite: false,
      isPinned: false,
      itemType: { name: 'snippet', icon: 'Code', color: '#3b82f6' },
      tags: [],
      collections: [{ id: 'coll-1', name: 'React' }],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });
    mockCreateItemQuery.mockResolvedValue(mockItem);

    await createItem({
      typeName: 'snippet',
      title: 'Test',
      description: null,
      content: null,
      url: null,
      language: null,
      tags: [],
      collectionIds: ['coll-1', 'coll-2'],
      fileUrl: null,
      fileName: null,
      fileSize: null,
    });

    expect(mockCreateItemQuery).toHaveBeenCalledWith('user-123', {
      typeName: 'snippet',
      title: 'Test',
      description: null,
      content: null,
      url: null,
      language: null,
      tags: [],
      collectionIds: ['coll-1', 'coll-2'],
      fileUrl: null,
      fileName: null,
      fileSize: null,
    });
  });
});

describe('toggleItemFavorite server action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns error when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const result = await toggleItemFavorite('item-123');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized');
  });

  it('returns error for empty item ID', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });

    const result = await toggleItemFavorite('');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid item ID');
  });

  it('returns error when item not found', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });
    mockToggleItemFavoriteQuery.mockResolvedValue(null);

    const result = await toggleItemFavorite('item-123');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Item not found or access denied');
  });

  it('returns new favorite state when toggled on', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });
    mockToggleItemFavoriteQuery.mockResolvedValue(true);

    const result = await toggleItemFavorite('item-123');

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ isFavorite: true });
    expect(mockToggleItemFavoriteQuery).toHaveBeenCalledWith('user-123', 'item-123');
  });

  it('returns new favorite state when toggled off', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });
    mockToggleItemFavoriteQuery.mockResolvedValue(false);

    const result = await toggleItemFavorite('item-123');

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ isFavorite: false });
  });
});

describe('toggleItemPin server action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns error when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const result = await toggleItemPin('item-123');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized');
  });

  it('returns error for empty item ID', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });

    const result = await toggleItemPin('');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid item ID');
  });

  it('returns error when item not found', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });
    mockToggleItemPinQuery.mockResolvedValue(null);

    const result = await toggleItemPin('item-123');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Item not found or access denied');
  });

  it('returns new pinned state when toggled on', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });
    mockToggleItemPinQuery.mockResolvedValue(true);

    const result = await toggleItemPin('item-123');

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ isPinned: true });
    expect(mockToggleItemPinQuery).toHaveBeenCalledWith('user-123', 'item-123');
  });

  it('returns new pinned state when toggled off', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });
    mockToggleItemPinQuery.mockResolvedValue(false);

    const result = await toggleItemPin('item-123');

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ isPinned: false });
  });
});

describe('getItemCollections server action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns error when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const result = await getItemCollections('item-123');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized');
  });

  it("returns not found for someone else's item", async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-123', isPro: false }, expires: new Date().toISOString() });
    vi.mocked(getCollectionsForItem).mockResolvedValue(null);
    const result = await getItemCollections('item-123');
    expect(result.success).toBe(false);
    expect(vi.mocked(getCollectionsForItem)).toHaveBeenCalledWith('user-123', 'item-123');
  });

  it('returns the collections with their in/out flag', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-123', isPro: false }, expires: new Date().toISOString() });
    const options = [{ id: 'col-1', name: 'React', inCollection: true }];
    vi.mocked(getCollectionsForItem).mockResolvedValue(options);
    const result = await getItemCollections('item-123');
    expect(result).toEqual({ success: true, data: options });
  });
});

describe('setItemCollection server action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns error when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const result = await setItemCollection('item-123', 'col-1', true);
    expect(result.success).toBe(false);
    expect(vi.mocked(setItemInCollection)).not.toHaveBeenCalled();
  });

  it('rejects an empty collection ID', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-123', isPro: false }, expires: new Date().toISOString() });
    const result = await setItemCollection('item-123', '  ', true);
    expect(result.success).toBe(false);
    expect(vi.mocked(setItemInCollection)).not.toHaveBeenCalled();
  });

  it("returns not found when the item or collection isn't the user's", async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-123', isPro: false }, expires: new Date().toISOString() });
    vi.mocked(setItemInCollection).mockResolvedValue(null);
    const result = await setItemCollection('item-123', 'col-other', true);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Item or collection not found or access denied');
    expect(vi.mocked(setItemInCollection)).toHaveBeenCalledWith('user-123', 'item-123', 'col-other', true);
  });

  it('adds the item and reports the change', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-123', isPro: false }, expires: new Date().toISOString() });
    vi.mocked(setItemInCollection).mockResolvedValue({ collectionName: 'React', inCollection: true, changed: true });
    const result = await setItemCollection('item-123', 'col-1', true);
    expect(result).toEqual({ success: true, data: { collectionName: 'React', inCollection: true, changed: true } });
  });
});

describe('createItem language detection', () => {
  const base = { title: 'Test', description: null, url: null, tags: [], fileUrl: null, fileName: null, fileSize: null };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });
    mockCanCreateItem.mockResolvedValue(true);
    mockCreateItemQuery.mockResolvedValue({ id: 'item-123' } as never);
  });

  it('guesses the language of a snippet saved without one', async () => {
    await createItem({ ...base, typeName: 'snippet', content: 'def add(a, b):\n    return a + b', language: null });

    expect(mockCreateItemQuery).toHaveBeenCalledWith('user-123', expect.objectContaining({ language: 'python' }));
  });

  it('treats an unrecognised command as shell', async () => {
    await createItem({ ...base, typeName: 'command', content: 'terraform plan', language: null });

    expect(mockCreateItemQuery).toHaveBeenCalledWith('user-123', expect.objectContaining({ language: 'bash' }));
  });

  it('keeps a language the user chose, including plain text', async () => {
    await createItem({ ...base, typeName: 'snippet', content: 'def add(a, b):\n    return a + b', language: 'plaintext' });

    expect(mockCreateItemQuery).toHaveBeenCalledWith('user-123', expect.objectContaining({ language: 'plaintext' }));
  });

  it('leaves other types without a language', async () => {
    await createItem({ ...base, typeName: 'note', content: '```python\nprint(1)\n```', language: null });

    expect(mockCreateItemQuery).toHaveBeenCalledWith('user-123', expect.objectContaining({ language: null }));
  });
});
