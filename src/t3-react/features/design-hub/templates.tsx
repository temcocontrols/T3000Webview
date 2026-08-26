/**
 * Drawing Templates — ready-made starter canvases per drawing type.
 * "New from template" creates a drawing with the template's canvas + hint.
 */
import type { DrawingType } from './types';

export interface DrawingTemplate {
  id: string;
  name: string;
  description: string;
  typeId: string;
  width: number;
  height: number;
  backgroundColor: string;
  hint?: string; // shown in the editor as a layer/note
}

export const DRAWING_TEMPLATES: DrawingTemplate[] = [
  {
    id: 'tpl-hvac-schematic',
    name: 'HVAC Schematic',
    description: 'Blank schematic canvas with title block, ready for ductwork',
    typeId: 'hvac-schematic',
    width: 1600,
    height: 1000,
    backgroundColor: '#ffffff',
    hint: 'Title block: 100px strip at the top',
  },
  // Floor Plan / Symbol Sheet hidden for now — types not surfaced (user, 2026-08-22)
  // {
  //   id: 'tpl-floorplan',
  //   name: 'Floor Plan A4',
  //   description: 'Building floor plan layout (1920×1200)',
  //   typeId: 'floor-plan',
  //   width: 1920,
  //   height: 1200,
  //   backgroundColor: '#fafafa',
  //   hint: 'Scale 1:100 — one square = 1 m',
  // },
  // {
  //   id: 'tpl-symbols',
  //   name: 'Symbol Sheet',
  //   description: 'Grid sheet for building a reusable symbol library',
  //   typeId: 'panel-symbols',
  //   width: 1200,
  //   height: 1600,
  //   backgroundColor: '#ffffff',
  //   hint: 'Draw one symbol per 200px cell',
  // },
  {
    id: 'tpl-lcd',
    name: 'Thermostat LCD',
    description: 'Starter thermostat LCD screen (128×128)',
    typeId: 'lcd-ui',
    width: 128,
    height: 128,
    backgroundColor: '#000000',
    hint: 'LCD pixel canvas',
  },
];

export const getTemplateById = (id: string): DrawingTemplate | undefined =>
  DRAWING_TEMPLATES.find((t) => t.id === id);

export const getTemplatesByType = (typeId: string): DrawingTemplate[] =>
  DRAWING_TEMPLATES.filter((t) => t.typeId === typeId);

export const templatesForType = (type: DrawingType): DrawingTemplate[] =>
  DRAWING_TEMPLATES.filter((t) => t.typeId === type.id);
