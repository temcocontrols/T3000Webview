/**
 * Design Hub Store
 * Zustand store for the Design Hub dashboard.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  ActivityItem,
  DrawingType,
  HubFolder,
  HubProject,
  HubView,
  LibraryItem,
  ProjectTab,
  SortKey,
} from '../types';
import type { DrawingTemplate } from '../templates';
import { designHubService } from '../services/designHubService';
import { addCustomDrawingType } from '../drawingTypes';
import { PanelDataRefreshService } from '../../../shared/services/panelDataRefreshService';

interface DesignHubState {
  projects: HubProject[];
  recentProjects: HubProject[];
  activity: ActivityItem[];
  libraries: LibraryItem[];
  activeTab: ProjectTab;
  search: string;
  isLoading: boolean;

  // Favorites / sort / view / selection
  favorites: string[];
  sortBy: SortKey;
  view: HubView;
  selecting: boolean;
  selectedIds: string[];

  // Folders
  folders: HubFolder[];
  activeFolder: string | null;

  load: () => void;
  setActiveTab: (tab: ProjectTab) => void;
  setSearch: (search: string) => void;
  openProject: (project: HubProject) => void;
  refresh: () => void;

  toggleFavorite: (projectId: string) => void;
  setSortBy: (sort: SortKey) => void;
  setView: (view: HubView) => void;
  setSelecting: (selecting: boolean) => void;
  toggleSelect: (projectId: string) => void;
  clearSelection: () => void;

  setActiveFolder: (folderId: string | null) => void;
  addFolder: (name: string, color?: string) => HubFolder;
  renameFolder: (folderId: string, name: string) => void;
  deleteFolder: (folderId: string) => void;
  setProjectFolder: (projectId: string, folderId: string | null) => void;

  saveSnapshot: (projectId: string, name?: string) => void;
  restoreSnapshot: (projectId: string, snapshotId: string) => boolean;
  deleteSnapshot: (projectId: string, snapshotId: string) => void;
  deleteProjects: (ids: string[]) => void;
  duplicateProject: (projectId: string) => HubProject | null;
  renameProject: (projectId: string, name: string) => void;
  createFromTemplate: (template: DrawingTemplate) => HubProject;
  exportHub: () => Blob;
  importHub: (file: File) => Promise<{ projects: number; libraries: number; customTypes: number }>;

  // Phase 4 — sharing / backend
  shareProject: (projectId: string, shared: boolean) => void;
  syncLibraryToCloud: (libraryId: string) => void;
  syncBackend: () => Promise<{ backend: boolean; projects: number; libraries: number }>;

  // Phase 5 — device integration
  deployProject: (project: HubProject) => Promise<{ success: boolean; message: string }>;
  bindProject: (
    projectId: string,
    binding: { serialNumber?: number; building?: string; floor?: string; room?: string }
  ) => HubProject | null;

  // Phase 6 — custom types + import
  addCustomType: (
    type: Omit<DrawingType, 'importFormats' | 'deviceAware'> &
      Partial<Pick<DrawingType, 'importFormats' | 'deviceAware'>>
  ) => DrawingType;
  importFile: (file: File) => Promise<{ drawingId: string; openPath: string; name: string }>;
}

export const useDesignHubStore = create<DesignHubState>()(
  devtools(
    (set, get) => ({
      projects: [],
      recentProjects: [],
      activity: [],
      libraries: [],
      activeTab: 'all',
      search: '',
      isLoading: true,
      favorites: [],
      sortBy: 'updated',
      view: 'grid',
      selecting: false,
      selectedIds: [],
      folders: [],
      activeFolder: null,

      load: () => {
        designHubService.seedEngineProjects();
        set({
          projects: designHubService.listProjects(),
          recentProjects: designHubService.listRecentProjects(),
          activity: designHubService.listActivity(),
          libraries: designHubService.listLibraries(),
          favorites: designHubService.listFavorites(),
          folders: designHubService.listFolders(),
          isLoading: false,
        });
      },

      setActiveTab: (tab) => set({ activeTab: tab }),

      setSearch: (search) => set({ search }),

      openProject: (project) => {
        designHubService.recordOpen(project.id, project.name, project.typeId);
        set({
          recentProjects: designHubService.listRecentProjects(),
          activity: designHubService.listActivity(),
        });
      },

      refresh: () => {
        set({
          projects: designHubService.listProjects(),
          recentProjects: designHubService.listRecentProjects(),
          activity: designHubService.listActivity(),
          libraries: designHubService.listLibraries(),
          favorites: designHubService.listFavorites(),
          folders: designHubService.listFolders(),
        });
      },

      // ── Favorites / sort / view / selection ──
      toggleFavorite: (projectId) => {
        designHubService.toggleFavorite(projectId);
        set({ favorites: designHubService.listFavorites() });
      },

      setSortBy: (sortBy) => set({ sortBy }),
      setView: (view) => set({ view }),
      setSelecting: (selecting) => set({ selecting }),

      toggleSelect: (projectId) =>
        set((s) => ({
          selectedIds: s.selectedIds.includes(projectId)
            ? s.selectedIds.filter((id) => id !== projectId)
            : [...s.selectedIds, projectId],
        })),

      clearSelection: () => set({ selectedIds: [], selecting: false }),

      // ── Folders ──
      setActiveFolder: (activeFolder) => set({ activeFolder }),

      addFolder: (name, color) => {
        const folder = designHubService.addFolder(name, color);
        set({ folders: designHubService.listFolders() });
        return folder;
      },

      renameFolder: (folderId, name) => {
        designHubService.renameFolder(folderId, name);
        set({ folders: designHubService.listFolders() });
      },

      deleteFolder: (folderId) => {
        designHubService.deleteFolder(folderId);
        set({ folders: designHubService.listFolders(), projects: designHubService.listProjects() });
      },

      setProjectFolder: (projectId, folderId) => {
        designHubService.setProjectFolder(projectId, folderId);
        set({ projects: designHubService.listProjects(), activity: designHubService.listActivity() });
      },

      // ── Snapshots ──
      saveSnapshot: (projectId, name) => {
        designHubService.saveSnapshot(projectId, name);
        set({ activity: designHubService.listActivity() });
      },

      restoreSnapshot: (projectId, snapshotId) => {
        const ok = designHubService.restoreSnapshot(projectId, snapshotId);
        set({ projects: designHubService.listProjects(), activity: designHubService.listActivity() });
        return ok;
      },

      deleteSnapshot: (projectId, snapshotId) => {
        designHubService.deleteSnapshot(projectId, snapshotId);
      },

      deleteProjects: (ids) => {
        ids.forEach((id) => designHubService.deleteProject(id));
        set({
          projects: designHubService.listProjects(),
          recentProjects: designHubService.listRecentProjects(),
          activity: designHubService.listActivity(),
          favorites: designHubService.listFavorites(),
          selectedIds: [],
        });
      },

      duplicateProject: (projectId) => {
        const copy = designHubService.duplicateProject(projectId);
        set({ projects: designHubService.listProjects(), activity: designHubService.listActivity() });
        return copy;
      },

      renameProject: (projectId, name) => {
        designHubService.renameProject(projectId, name);
        set({ projects: designHubService.listProjects(), activity: designHubService.listActivity() });
      },

      createFromTemplate: (template) => {
        const project = designHubService.createFromTemplate(template);
        set({ projects: designHubService.listProjects(), activity: designHubService.listActivity() });
        return project;
      },

      exportHub: () => designHubService.exportHub(),

      importHub: async (file) => {
        const result = await designHubService.importHub(file);
        set({
          projects: designHubService.listProjects(),
          recentProjects: designHubService.listRecentProjects(),
          activity: designHubService.listActivity(),
          libraries: designHubService.listLibraries(),
          favorites: designHubService.listFavorites(),
        });
        return result;
      },

      // ── Phase 4 — sharing / backend ──
      shareProject: (projectId, shared) => {
        designHubService.shareProject(projectId, shared);
        set({ activity: designHubService.listActivity(), projects: designHubService.listProjects() });
      },

      syncLibraryToCloud: (libraryId) => {
        designHubService.syncLibraryToCloud(libraryId);
        set({ libraries: designHubService.listLibraries(), activity: designHubService.listActivity() });
      },

      syncBackend: async () => {
        const result = await designHubService.syncToBackend();
        return result;
      },

      // ── Phase 5 — device integration ──
      deployProject: async (project) => {
        if (!project.serialNumber) {
          return { success: false, message: 'Bind this drawing to a device first.' };
        }
        try {
          const result = await PanelDataRefreshService.refreshFromDevice({
            serialNumber: project.serialNumber,
            type: 'graphic',
          });
          designHubService.recordActivity('deployed', `Deployed "${project.name}" to device`, {
            detail: `SN ${project.serialNumber} — ${result.savedCount} items`,
            typeId: project.typeId,
            projectId: project.id,
          });
          if (result.success) {
            designHubService.markDeployed(project.id);
          }
          set({
            activity: designHubService.listActivity(),
            projects: designHubService.listProjects(),
          });
          return { success: result.success, message: result.message || 'Device sync completed' };
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Device sync failed';
          return { success: false, message };
        }
      },

      bindProject: (projectId, binding) => {
        const updated = designHubService.saveProjectBinding(projectId, binding);
        set({
          projects: designHubService.listProjects(),
          recentProjects: designHubService.listRecentProjects(),
          activity: designHubService.listActivity(),
        });
        return updated;
      },

      // ── Phase 6 — custom types + import ──
      addCustomType: (type) => {
        const full = addCustomDrawingType(type as any);
        designHubService.recordActivity('created', `Registered drawing type "${full.name}"`, {
          detail: full.id,
          typeId: full.id,
        });
        set({ activity: designHubService.listActivity() });
        return full;
      },

      importFile: async (file) => {
        const result = await designHubService.importFile(file);
        set({
          projects: designHubService.listProjects(),
          recentProjects: designHubService.listRecentProjects(),
          activity: designHubService.listActivity(),
        });
        return result;
      },
    }),
    { name: 'design-hub' }
  )
);
