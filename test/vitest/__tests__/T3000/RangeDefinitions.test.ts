/**
 * Unit Tests for Range Definitions
 * Tests for T3000 system range configurations
 */

import { describe, it, expect } from 'vitest';
import {
  ranges,
  T3_Types,
  type T3Type,
  type DigitalRange,
  type AnalogRange,
  type RangeDefinitions
} from '../../../../src/lib/vue/T3000/Hvac/Data/Constant/T3Range';

describe('RangeDefinitions', () => {
  describe('Digital Ranges', () => {
    it('should have valid digital range structure', () => {
      expect(Array.isArray(ranges.digital)).toBe(true);
      expect(ranges.digital.length).toBeGreaterThan(0);

      ranges.digital.forEach((range: DigitalRange) => {
        expect(range).toHaveProperty('id');
        expect(range).toHaveProperty('label');
        expect(range).toHaveProperty('off');
        expect(range).toHaveProperty('on');
        expect(range).toHaveProperty('direct');

        expect(typeof range.id).toBe('number');
        expect(typeof range.label).toBe('string');
        expect(typeof range.off).toBe('string');
        expect(typeof range.on).toBe('string');
        expect(range.direct === null || typeof range.direct === 'boolean').toBe(true);
      });
    });

    it('should have unique digital range IDs', () => {
      const ids = ranges.digital.map(range => range.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have sequential digital range IDs starting from 1', () => {
      const ids = ranges.digital.map(range => range.id).sort((a, b) => a - b);
      expect(ids[0]).toBe(1);

      for (let i = 1; i < ids.length; i++) {
        expect(ids[i]).toBe(ids[i - 1] + 1);
      }
    });

    it('should have non-empty labels and values', () => {
      ranges.digital.forEach(range => {
        expect(range.label.trim()).toBeTruthy();
        expect(range.off.trim()).toBeTruthy();
        expect(range.on.trim()).toBeTruthy();
      });
    });

    it('should have expected standard digital ranges', () => {
      const expectedRanges = [
        { id: 1, label: "Off/On", off: "Off", on: "On" },
        { id: 2, label: "Close/Open", off: "Close", on: "Open" },
        { id: 3, label: "Stop/Start", off: "Stop", on: "Start" },
        { id: 8, label: "No/Yes", off: "No", on: "Yes" }
      ];

      expectedRanges.forEach(expected => {
        const found = ranges.digital.find(range => range.id === expected.id);
        expect(found).toBeDefined();
        expect(found?.label).toBe(expected.label);
        expect(found?.off).toBe(expected.off);
        expect(found?.on).toBe(expected.on);
      });
    });

    it('should have inverted ranges with direct=true', () => {
      const invertedRanges = ranges.digital.filter(range => range.direct === true);
      expect(invertedRanges.length).toBeGreaterThan(0);

      // Check that inverted ranges have IDs >= 12
      invertedRanges.forEach(range => {
        expect(range.id).toBeGreaterThanOrEqual(12);
      });
    });
  });

  describe('Analog Ranges', () => {
    describe('Input Ranges', () => {
      it('should have valid input range structure', () => {
        expect(Array.isArray(ranges.analog.input)).toBe(true);
        expect(ranges.analog.input.length).toBeGreaterThan(0);

        ranges.analog.input.forEach((range: AnalogRange) => {
          expect(range).toHaveProperty('id');
          expect(range).toHaveProperty('unit');
          expect(range).toHaveProperty('label');

          expect(typeof range.id).toBe('number');
          expect(typeof range.unit).toBe('string');
          expect(typeof range.label).toBe('string');
        });
      });

      it('should have unique input range IDs', () => {
        const ids = ranges.analog.input.map(range => range.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length);
      });

      it('should start with unused input range', () => {
        const firstRange = ranges.analog.input[0];
        expect(firstRange.id).toBe(0);
        expect(firstRange.unit).toBe("");
        expect(firstRange.label).toBe("Unused");
      });

      it('should have temperature ranges', () => {
        const tempRanges = ranges.analog.input.filter(range =>
          range.unit.includes('Deg.C') || range.unit.includes('Deg.F')
        );
        expect(tempRanges.length).toBeGreaterThan(0);
      });

      it('should have electrical ranges', () => {
        const electricalUnits = ['Volts', 'Amps', 'ma'];
        const electricalRanges = ranges.analog.input.filter(range =>
          electricalUnits.includes(range.unit)
        );
        expect(electricalRanges.length).toBeGreaterThan(0);
      });

      it('should have environmental sensor ranges', () => {
        const envUnits = ['PPM', 'PPB', 'Lux', 'dB', '%'];
        const envRanges = ranges.analog.input.filter(range =>
          envUnits.includes(range.unit)
        );
        expect(envRanges.length).toBeGreaterThan(0);
      });
    });

    describe('Output Ranges', () => {
      it('should have valid output range structure', () => {
        expect(Array.isArray(ranges.analog.output)).toBe(true);
        expect(ranges.analog.output.length).toBeGreaterThan(0);

        ranges.analog.output.forEach((range: AnalogRange) => {
          expect(range).toHaveProperty('id');
          expect(range).toHaveProperty('unit');
          expect(range).toHaveProperty('label');

          expect(typeof range.id).toBe('number');
          expect(typeof range.unit).toBe('string');
          expect(typeof range.label).toBe('string');
        });
      });

      it('should have unique output range IDs', () => {
        const ids = ranges.analog.output.map(range => range.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length);
      });

      it('should start with unused output range', () => {
        const firstRange = ranges.analog.output[0];
        expect(firstRange.id).toBe(0);
        expect(firstRange.unit).toBe("");
        expect(firstRange.label).toBe("Unused");
      });

      it('should have control output ranges', () => {
        const controlUnits = ['%Open', '%Cls', '%PWM'];
        const controlRanges = ranges.analog.output.filter(range =>
          controlUnits.includes(range.unit)
        );
        expect(controlRanges.length).toBeGreaterThan(0);
      });
    });

    describe('Variable Ranges', () => {
      it('should have valid variable range structure', () => {
        expect(Array.isArray(ranges.analog.variable)).toBe(true);
        expect(ranges.analog.variable.length).toBeGreaterThan(0);

        ranges.analog.variable.forEach((range: AnalogRange) => {
          expect(range).toHaveProperty('id');
          expect(range).toHaveProperty('unit');
          expect(range).toHaveProperty('label');

          expect(typeof range.id).toBe('number');
          expect(typeof range.unit).toBe('string');
          expect(typeof range.label).toBe('string');
        });
      });

      it('should have unique variable range IDs', () => {
        const ids = ranges.analog.variable.map(range => range.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length);
      });

      it('should start with unused variable range', () => {
        const firstRange = ranges.analog.variable[0];
        expect(firstRange.id).toBe(0);
        expect(firstRange.unit).toBe("Unused");
        expect(firstRange.label).toBe("Unused");
      });

      it('should have HVAC unit ranges', () => {
        const hvacUnits = ['CFM', 'CMH', 'BTU', 'KWH'];
        const hvacRanges = ranges.analog.variable.filter(range =>
          hvacUnits.includes(range.unit)
        );
        expect(hvacRanges.length).toBeGreaterThan(0);
      });

      it('should have time unit ranges', () => {
        const timeUnits = ['Seconds', 'Minutes', 'Hours', 'Days'];
        const timeRanges = ranges.analog.variable.filter(range =>
          timeUnits.includes(range.unit)
        );
        expect(timeRanges.length).toBeGreaterThan(0);
      });

      it('should have fluid measurement ranges', () => {
        const fluidUnits = ['L/Hour', 'GPH', 'GAL', 'CF'];
        const fluidRanges = ranges.analog.variable.filter(range =>
          fluidUnits.includes(range.unit)
        );
        expect(fluidRanges.length).toBeGreaterThan(0);
      });
    });
  });

  describe('T3 Types', () => {
    it('should have valid T3_Types constants', () => {
      expect(typeof T3_Types).toBe('object');

      const expectedTypes = {
        OUTPUT: 0,
        INPUT: 1,
        VARIABLE: 2,
        SCHEDULE: 4,
        HOLIDAY: 5,
        PROGRAM: 6,
        MON: 9
      };

      Object.entries(expectedTypes).forEach(([key, value]) => {
        expect(T3_Types).toHaveProperty(key);
        expect(T3_Types[key as keyof typeof T3_Types]).toBe(value);
      });
    });

    it('should have unique T3_Types values', () => {
      const values = Object.values(T3_Types);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });

    it('should have valid T3Type type', () => {
      // This test validates that T3Type is properly defined
      const testValue: T3Type = T3_Types.INPUT;
      expect(testValue).toBe(1);
    });
  });

  describe('Type Definitions', () => {
    it('should match DigitalRange interface', () => {
      const digitalRange: DigitalRange = {
        id: 1,
        label: 'Test',
        off: 'Off',
        on: 'On',
        direct: null
      };

      expect(digitalRange.id).toBe(1);
      expect(digitalRange.label).toBe('Test');
      expect(digitalRange.off).toBe('Off');
      expect(digitalRange.on).toBe('On');
      expect(digitalRange.direct).toBe(null);
    });

    it('should match AnalogRange interface', () => {
      const analogRange: AnalogRange = {
        id: 1,
        unit: 'Volts',
        label: 'Test Range'
      };

      expect(analogRange.id).toBe(1);
      expect(analogRange.unit).toBe('Volts');
      expect(analogRange.label).toBe('Test Range');
    });

    it('should match RangeDefinitions interface', () => {
      const rangeDefinitions: RangeDefinitions = ranges;

      expect(rangeDefinitions).toHaveProperty('digital');
      expect(rangeDefinitions).toHaveProperty('analog');
      expect(rangeDefinitions.analog).toHaveProperty('input');
      expect(rangeDefinitions.analog).toHaveProperty('output');
      expect(rangeDefinitions.analog).toHaveProperty('variable');
    });
  });

  describe('Data Integrity', () => {
    it('should not have empty or whitespace-only strings', () => {
      ranges.digital.forEach(range => {
        expect(range.label.trim().length).toBeGreaterThan(0);
        expect(range.off.trim().length).toBeGreaterThan(0);
        expect(range.on.trim().length).toBeGreaterThan(0);
      });

      [...ranges.analog.input, ...ranges.analog.output, ...ranges.analog.variable].forEach(range => {
        expect(range.label.trim().length).toBeGreaterThan(0);
        // Unit can be empty for "Unused" entries
        if (range.id !== 0) {
          expect(range.unit.trim().length).toBeGreaterThan(0);
        }
      });
    });

    it('should have reasonable ID ranges', () => {
      ranges.digital.forEach(range => {
        expect(range.id).toBeGreaterThanOrEqual(1);
        expect(range.id).toBeLessThan(100);
      });

      [...ranges.analog.input, ...ranges.analog.output, ...ranges.analog.variable].forEach(range => {
        expect(range.id).toBeGreaterThanOrEqual(0);
        expect(range.id).toBeLessThan(100);
      });
    });

    it('should maintain consistent data format', () => {
      // Check that all entries follow the same pattern
      ranges.digital.forEach(range => {
        expect(Object.keys(range).sort()).toEqual(['direct', 'id', 'label', 'off', 'on']);
      });

      [...ranges.analog.input, ...ranges.analog.output, ...ranges.analog.variable].forEach(range => {
        expect(Object.keys(range).sort()).toEqual(['id', 'label', 'unit']);
      });
    });
  });
});
