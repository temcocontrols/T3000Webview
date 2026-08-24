/**
 * Drawing Type Registry
 *
 * Each entry describes one kind of drawing and which engine opens it.
 * Adding a new type later (e.g. an Inkscape-compatible editor) is just a new
 * entry here — the dashboard, libraries and history all pick it up automatically.
 */

import type { DrawingType } from './types';

export const DRAWING_TYPES: DrawingType[] = [
  {
    id: 'hvac-schematic',
    name: 'HVAC',
    description: 'HVAC system diagrams — one graphic per device/panel, slots 1-8',
    engine: 'hvac',
    openPath: '/t3000/hvac-designer',
    importFormats: ['svg', 'json', 'png'],
    deviceAware: true,
    accent: '#0078d4',
    icon: 'Flow',
    createMode: 'hvac',
    graphicSlots: true,
    template: { width: 1600, height: 1000, backgroundColor: '#ffffff' },
  },
  // ── Hidden for now — focus on the 4 core types (user, 2026-08-22) ──
  // {
  //   id: 'floor-plan',
  //   name: 'Floor Plan',
  //   description: 'Rooms, zones and equipment laid out on a building floor',
  //   engine: 'hvac',
  //   openPath: '/t3000/hvac-designer',
  //   importFormats: ['svg', 'dxf', 'json'],
  //   deviceAware: true,
  //   accent: '#038387',
  //   icon: 'BuildingMultiple',
  //   template: { width: 1920, height: 1200, backgroundColor: '#fafafa' },
  // },
  // {
  //   id: 'eez-project',
  //   name: 'EEZ Project',
  //   description: 'Full project & instrument editor — pages, panels and extensions',
  //   engine: 'eez',
  //   openPath: '/t3000/eez',
  //   importFormats: ['project', 'svg', 'json'],
  //   deviceAware: false,
  //   accent: '#8764b8',
  //   icon: 'DocumentText',
  // },
  // {
  //   id: 'panel-symbols',
  //   name: 'Panel Symbols',
  //   description: 'Reusable symbol libraries, parts and templates',
  //   engine: 'symbols',
  //   openPath: '/t3000/hvac-designer',
  //   importFormats: ['svg', 'json'],
  //   deviceAware: false,
  //   accent: '#498205',
  //   icon: 'CircleMultipleConcentric',
  // },
  {
    id: 'lcd-ui',
    name: 'LCD UI',
    description: 'Design thermostat LCD screens and simulate them live',
    engine: 'simulator',
    openPath: '/t3000/tstat10-simulator',
    importFormats: ['json', 'svg'],
    deviceAware: true,
    accent: '#ca5010',
    icon: 'DeveloperBoard',
    createMode: 'lcd',
  },
  {
    id: 'lvgl-9-5',
    name: 'LVGL 9.5',
    description: 'Embedded UI project (LVGL 9.5) — pages, widgets and bitmaps',
    engine: 'eez',
    openPath: '/t3000/eez',
    importFormats: ['project', 'svg', 'json'],
    deviceAware: true,
    accent: '#8764b8',
    icon: 'DocumentText',
    createMode: 'lvgl',
    wizardType: 'LVGL',
  },
  {
    id: 'lvgl-flow-9-5',
    name: 'LVGL with Flow 9.5',
    description: 'Embedded UI with EEZ Flow logic (LVGL 9.5) — screens + flow',
    engine: 'eez',
    openPath: '/t3000/eez',
    importFormats: ['project', 'svg', 'json'],
    deviceAware: true,
    accent: '#7b5aa6',
    icon: 'Toolbox',
    createMode: 'lvgl',
    wizardType: 'LVGL with EEZ Flow',
  },
];

export const getDrawingType = (id: string): DrawingType =>
  getAllDrawingTypes().find((t) => t.id === id) ?? DRAWING_TYPES[0];

export const getTypesByEngine = (engine: string): DrawingType[] =>
  getAllDrawingTypes().filter((t) => t.engine === engine);

// ── User-registered custom types (Phase 6) ──────────────────────────────
// Persisted in localStorage so users can register new drawing engines without
// touching the source. Merged into the registry via getAllDrawingTypes().

const CUSTOM_TYPES_KEY = 't3-design-hub-custom-types';

export function getCustomDrawingTypes(): DrawingType[] {
  try {
    const raw = localStorage.getItem(CUSTOM_TYPES_KEY);
    return raw ? (JSON.parse(raw) as DrawingType[]) : [];
  } catch {
    return [];
  }
}

export function addCustomDrawingType(
  type: Omit<DrawingType, 'importFormats' | 'deviceAware'> &
    Partial<Pick<DrawingType, 'importFormats' | 'deviceAware'>> & { id: string }
): DrawingType {
  const custom = getCustomDrawingTypes();
  const full: DrawingType = {
    importFormats: ['svg', 'json'],
    deviceAware: false,
    ...type,
  };
  const next = [full, ...custom.filter((t) => t.id !== full.id)];
  try {
    localStorage.setItem(CUSTOM_TYPES_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable */
  }
  return full;
}

export function removeCustomDrawingType(id: string): void {
  const next = getCustomDrawingTypes().filter((t) => t.id !== id);
  try {
    localStorage.setItem(CUSTOM_TYPES_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable */
  }
}

export function getAllDrawingTypes(): DrawingType[] {
  // Custom user-registered types are hidden for now — only the 4 core types
  // (HVAC, LCD UI, LVGL 9.5, LVGL with Flow 9.5) are surfaced (user, 2026-08-22).
  return [...DRAWING_TYPES];
}
