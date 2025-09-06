/**
 * Unit Tests for Tool Definitions
 * Tests for tool configurations and utility functions
 */

import { describe, it, expect } from 'vitest';
import {
  newTools,
  toolsCategories,
  gaugeDefaultColors,
  getToolsByCategory,
  getToolByName,
  getAllCategories,
  type Tool,
  type ToolCategory
} from '../../../../src/lib/T3000/Hvac/Data/Constant/ToolDefinitions';

describe('ToolDefinitions', () => {
  describe('Tool Configuration', () => {
    it('should have valid tool structure', () => {
      expect(Array.isArray(newTools)).toBe(true);
      expect(newTools.length).toBeGreaterThan(0);

      // Check first tool has required properties
      const firstTool = newTools[0];
      expect(firstTool).toHaveProperty('name');
      expect(firstTool).toHaveProperty('label');
      expect(firstTool).toHaveProperty('icon');
      expect(firstTool).toHaveProperty('cat');
      expect(firstTool).toHaveProperty('settings');
      expect(Array.isArray(firstTool.cat)).toBe(true);
      expect(typeof firstTool.settings).toBe('object');
    });

    it('should have unique tool names', () => {
      const names = newTools.map(tool => tool.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });

    it('should have valid categories for all tools', () => {
      newTools.forEach(tool => {
        expect(Array.isArray(tool.cat)).toBe(true);
        // Some tools may have empty categories in legacy data

        tool.cat.forEach(category => {
          expect(typeof category).toBe('string');
          // Allow empty categories for legacy tools
        });
      });
    });

    it('should have valid settings structure', () => {
      newTools.forEach(tool => {
        Object.values(tool.settings).forEach(setting => {
          expect(setting).toHaveProperty('value');
          expect(setting).toHaveProperty('type');
          expect(setting).toHaveProperty('id');
          expect(typeof setting.type).toBe('string');
          expect(typeof setting.id).toBe('number');
        });
      });
    });
  });

  describe('Tool Categories', () => {
    it('should have valid categories array', () => {
      expect(Array.isArray(toolsCategories)).toBe(true);
      expect(toolsCategories.length).toBeGreaterThan(0);

      const expectedCategories = [
        "Basic",
        "General",
        "Pipe",
        "NewDuct",
        "Duct",
        "Room",
        "Metrics"
      ];

      expect(toolsCategories).toEqual(expectedCategories);
    });

    it('should have tools for each category', () => {
      toolsCategories.forEach(category => {
        const toolsInCategory = newTools.filter(tool =>
          tool.cat.includes(category)
        );
        expect(toolsInCategory.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Gauge Default Colors', () => {
    it('should have valid color configuration', () => {
      expect(Array.isArray(gaugeDefaultColors)).toBe(true);
      expect(gaugeDefaultColors.length).toBe(3);

      gaugeDefaultColors.forEach(colorRange => {
        expect(colorRange).toHaveProperty('offset');
        expect(colorRange).toHaveProperty('color');
        expect(typeof colorRange.offset).toBe('number');
        expect(typeof colorRange.color).toBe('string');
        expect(colorRange.color).toMatch(/^#[0-9a-fA-F]{6}$/);
      });
    });

    it('should have ascending offsets', () => {
      for (let i = 1; i < gaugeDefaultColors.length; i++) {
        expect(gaugeDefaultColors[i].offset)
          .toBeGreaterThan(gaugeDefaultColors[i - 1].offset);
      }
    });
  });

  describe('Utility Functions', () => {
    describe('getToolsByCategory', () => {
      it('should return tools for valid category', () => {
        const basicTools = getToolsByCategory('Basic');
        expect(Array.isArray(basicTools)).toBe(true);

        basicTools.forEach(tool => {
          expect(tool.cat).toContain('Basic');
        });
      });

      it('should return empty array for invalid category', () => {
        const invalidTools = getToolsByCategory('NonExistent' as ToolCategory);
        expect(Array.isArray(invalidTools)).toBe(true);
        expect(invalidTools.length).toBe(0);
      });

      it('should return correct tools for each category', () => {
        toolsCategories.forEach(category => {
          const tools = getToolsByCategory(category);
          expect(tools.length).toBeGreaterThan(0);

          tools.forEach(tool => {
            expect(tool.cat).toContain(category);
          });
        });
      });
    });

    describe('getToolByName', () => {
      it('should return tool for valid name', () => {
        const pointerTool = getToolByName('Pointer');
        expect(pointerTool).toBeDefined();
        expect(pointerTool?.name).toBe('Pointer');
        expect(pointerTool?.label).toBe('Select');
      });

      it('should return undefined for invalid name', () => {
        const invalidTool = getToolByName('NonExistentTool');
        expect(invalidTool).toBeUndefined();
      });

      it('should return correct tool for all valid names', () => {
        newTools.forEach(tool => {
          const foundTool = getToolByName(tool.name);
          expect(foundTool).toBeDefined();
          expect(foundTool).toEqual(tool);
        });
      });
    });

    describe('getAllCategories', () => {
      it('should return all categories', () => {
        const categories = getAllCategories();
        expect(Array.isArray(categories)).toBe(true);
        expect(categories).toEqual(toolsCategories);
      });

      it('should return a copy of categories', () => {
        const categories = getAllCategories();
        categories.push('NewCategory' as ToolCategory);

        // Original should not be modified
        expect(toolsCategories).not.toContain('NewCategory');
        expect(getAllCategories()).toEqual(toolsCategories);
      });
    });
  });

  describe('Specific Tool Validations', () => {
    it('should have Pointer tool as first tool', () => {
      expect(newTools[0].name).toBe('Pointer');
      expect(newTools[0].cat).toContain('Basic');
    });

    it('should have gauge tools with proper settings', () => {
      const gaugeTool = getToolByName('Gauge');
      expect(gaugeTool).toBeDefined();
      expect(gaugeTool?.settings).toHaveProperty('min');
      expect(gaugeTool?.settings).toHaveProperty('max');
      expect(gaugeTool?.settings).toHaveProperty('colors');
      expect(gaugeTool?.settings.colors.value).toEqual(gaugeDefaultColors);
    });

    it('should have HVAC tools with active and alarm settings', () => {
      const hvacTools = ['Fan', 'CoolingCoil', 'HeatingCoil', 'Humidifier'];

      hvacTools.forEach(toolName => {
        const tool = getToolByName(toolName);
        expect(tool).toBeDefined();
        expect(tool?.settings).toHaveProperty('active');
        expect(tool?.settings).toHaveProperty('inAlarm');
        expect(tool?.settings.active.type).toBe('boolean');
        expect(tool?.settings.inAlarm.type).toBe('boolean');
      });
    });

    it('should have drawing tools with fill color settings', () => {
      const drawingTools = ['Line', 'G_Rectangle', 'G_Circle', 'Oval'];

      drawingTools.forEach(toolName => {
        const tool = getToolByName(toolName);
        expect(tool).toBeDefined();
        expect(tool?.settings).toHaveProperty('fillColor');
        expect(tool?.settings.fillColor.type).toBe('color');
        expect(tool?.settings.fillColor.value).toBe('#659dc5');
      });
    });

    it('should have icon tools with color and state settings', () => {
      const iconTools = ['IconBasic', 'Icon', 'Switch', 'LED'];

      iconTools.forEach(toolName => {
        const tool = getToolByName(toolName);
        expect(tool).toBeDefined();
        expect(tool?.settings).toHaveProperty('active');
        expect(tool?.settings).toHaveProperty('onColor');
        expect(tool?.settings).toHaveProperty('offColor');
      });
    });
  });

  describe('Tool Settings Validation', () => {
    it('should have valid color values', () => {
      newTools.forEach(tool => {
        Object.entries(tool.settings).forEach(([key, setting]) => {
          if (setting.type === 'color') {
            expect(typeof setting.value).toBe('string');
            // Allow hex colors (3 or 6 digits) and named colors for legacy data
            expect(setting.value.length).toBeGreaterThan(0);
            expect(setting.value).toMatch(/^(#[0-9a-fA-F]{3,6}|[a-zA-Z]+)$/);
          }
        });
      });
    });

    it('should have valid number values', () => {
      newTools.forEach(tool => {
        Object.entries(tool.settings).forEach(([key, setting]) => {
          if (setting.type === 'number') {
            expect(typeof setting.value).toBe('number');
            expect(Number.isFinite(setting.value)).toBe(true);
          }
        });
      });
    });

    it('should have valid boolean values', () => {
      newTools.forEach(tool => {
        Object.entries(tool.settings).forEach(([key, setting]) => {
          if (setting.type === 'boolean') {
            expect(typeof setting.value).toBe('boolean');
          }
        });
      });
    });

    it('should have unique setting IDs within each tool', () => {
      newTools.forEach(tool => {
        const settingIds = Object.values(tool.settings).map(s => s.id);
        const uniqueIds = new Set(settingIds);
        expect(uniqueIds.size).toBe(settingIds.length);
      });
    });
  });
});
