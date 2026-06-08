import { create } from 'zustand';
import { API_BASE_URL } from '../../../config/constants';

export interface TagDefinition {
  tag_name: string;
  doc?: string;
  category: string;
  deprecated: boolean;
  source?: string;
  usage_count: number;
  parents: string[];
}

export interface TagTreeNode {
  tag_name: string;
  doc?: string;
  category: string;
  deprecated: boolean;
  children: TagTreeNode[];
}

export interface PointTagEntry {
  serial_number: number;
  point_type: string;
  point_index: string;
  point_id: string;
  tag_name: string;
}

interface HaystackState {
  tags: TagDefinition[];
  tagTree: TagTreeNode[];
  pointTags: PointTagEntry[];
  isLoading: boolean;
  error: string | null;
  selectedTag: TagDefinition | null;

  // Actions
  fetchTags: (filter?: string) => Promise<void>;
  fetchTagTree: () => Promise<void>;
  fetchPointTags: (serialNumbers: number[], pointType?: string) => Promise<void>;
  createTag: (tagName: string, doc?: string) => Promise<boolean>;
  updateTag: (tagName: string, updates: { doc?: string; deprecated?: boolean }) => Promise<boolean>;
  deleteTag: (tagName: string) => Promise<boolean>;
  replaceTag: (oldTag: string, newTag: string) => Promise<boolean>;
  batchUpdatePointTags: (updates: BatchPointTagUpdate[]) => Promise<boolean>;
  setSelectedTag: (tag: TagDefinition | null) => void;
}

export interface BatchPointTagUpdate {
  serial_number: number;
  point_type: string;
  point_index: string;
  point_id: string;
  add_tags?: string[];
  remove_tags?: string[];
  set_tags?: string[];
}

export const useHaystackStore = create<HaystackState>((set, get) => ({
  tags: [],
  tagTree: [],
  pointTags: [],
  isLoading: false,
  error: null,
  selectedTag: null,

  fetchTags: async (filter?: string) => {
    set({ isLoading: true, error: null });
    try {
      const url = new URL(`${API_BASE_URL}/api/haystack/tags`);
      if (filter) url.searchParams.set('filter', filter);
      const res = await fetch(url.toString());
      const data = await res.json();
      set({ tags: data.tags || [], isLoading: false });
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
    }
  },

  fetchTagTree: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch(`${API_BASE_URL}/api/haystack/tag-tree`);
      const data = await res.json();
      set({ tagTree: data.tree || [], isLoading: false });
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
    }
  },

  fetchPointTags: async (serialNumbers: number[], pointType?: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/haystack/point-tags/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serialNumbers: serialNumbers.join(','),
          pointType: pointType || undefined,
        }),
      });
      const data = await res.json();
      set({ pointTags: data.entries || [] });
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  createTag: async (tagName: string, doc?: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/haystack/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagName, doc }),
      });
      if (res.ok) { get().fetchTags(); get().fetchTagTree(); return true; }
      return false;
    } catch { return false; }
  },

  updateTag: async (tagName: string, updates) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/haystack/tags/${encodeURIComponent(tagName)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) { get().fetchTags(); return true; }
      return false;
    } catch { return false; }
  },

  deleteTag: async (tagName: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/haystack/tags/${encodeURIComponent(tagName)}`, {
        method: 'DELETE',
      });
      if (res.ok) { get().fetchTags(); get().fetchTagTree(); return true; }
      return false;
    } catch { return false; }
  },

  replaceTag: async (oldTag: string, newTag: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/haystack/replace-tag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldTag, newTag }),
      });
      if (res.ok) { get().fetchTags(); return true; }
      return false;
    } catch { return false; }
  },

  batchUpdatePointTags: async (updates) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/haystack/point-tags/write`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      return res.ok;
    } catch { return false; }
  },

  setSelectedTag: (tag) => set({ selectedTag: tag }),
}));
