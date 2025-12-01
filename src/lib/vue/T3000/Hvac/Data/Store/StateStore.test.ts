/**
 * Unit Tests for StateStore
 * Tests for the centralized state management module
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { stateStore, type StateStore } from '../Store/StateStore';
import type GlobalMsgModel from  '../../Model/GlobalMsgModel'

describe('StateStore', () => {
  beforeEach(() => {
    // Reset store before each test
    stateStore.destroy();
  });

  describe('Project Management', () => {
    it('should initialize with empty project', () => {
      expect(stateStore.appState.value.items).toEqual([]);
      expect(stateStore.appState.value.itemsCount).toBe(0);
      expect(stateStore.appState.value.activeItemIndex).toBe(null);
    });

    it('should reset project to empty state', () => {
      // Add some items first
      stateStore.addItem({ id: 1, name: 'test' });
      stateStore.setActiveItem(0);

      expect(stateStore.appState.value.items.length).toBe(1);
      expect(stateStore.appState.value.activeItemIndex).toBe(0);

      // Reset and verify
      stateStore.resetProject();
      expect(stateStore.appState.value.items).toEqual([]);
      expect(stateStore.appState.value.itemsCount).toBe(0);
      expect(stateStore.appState.value.activeItemIndex).toBe(null);
    });

    it('should update viewport transform', () => {
      const transform = { x: 100, y: 200, scale: 1.5 };
      stateStore.updateViewportTransform(transform);

      expect(stateStore.appState.value.viewportTransform).toEqual(transform);
    });

    it('should partially update viewport transform', () => {
      stateStore.updateViewportTransform({ x: 50, y: 75 });
      stateStore.updateViewportTransform({ scale: 2 });

      expect(stateStore.appState.value.viewportTransform).toEqual({
        x: 50,
        y: 75,
        scale: 2
      });
    });
  });

  describe('Item Management', () => {
    it('should add items and update count', () => {
      const item1 = { id: 1, name: 'Item 1' };
      const item2 = { id: 2, name: 'Item 2' };

      stateStore.addItem(item1);
      expect(stateStore.appState.value.items).toContain(item1);
      expect(stateStore.appState.value.itemsCount).toBe(1);

      stateStore.addItem(item2);
      expect(stateStore.appState.value.items).toContain(item2);
      expect(stateStore.appState.value.itemsCount).toBe(2);
    });

    it('should remove items and update count', () => {
      stateStore.addItem({ id: 1, name: 'Item 1' });
      stateStore.addItem({ id: 2, name: 'Item 2' });

      expect(stateStore.appState.value.itemsCount).toBe(2);

      stateStore.removeItem(0);
      expect(stateStore.appState.value.itemsCount).toBe(1);
      expect(stateStore.appState.value.items[0].id).toBe(2);
    });

    it('should handle invalid remove index gracefully', () => {
      stateStore.addItem({ id: 1, name: 'Item 1' });

      // Try to remove invalid indices
      stateStore.removeItem(-1);
      stateStore.removeItem(10);

      // Item should still be there
      expect(stateStore.appState.value.itemsCount).toBe(1);
    });

    it('should update items correctly', () => {
      const originalItem = { id: 1, name: 'Original' };
      const updatedItem = { id: 1, name: 'Updated' };

      stateStore.addItem(originalItem);
      stateStore.updateItem(0, updatedItem);

      expect(stateStore.appState.value.items[0]).toEqual(updatedItem);
    });

    it('should set active item index', () => {
      stateStore.addItem({ id: 1, name: 'Item 1' });
      stateStore.addItem({ id: 2, name: 'Item 2' });

      stateStore.setActiveItem(1);
      expect(stateStore.appState.value.activeItemIndex).toBe(1);

      stateStore.setActiveItem(null);
      expect(stateStore.appState.value.activeItemIndex).toBe(null);
    });
  });

  describe('Selection Management', () => {
    it('should manage selected targets', () => {
      const target1 = { id: 1, type: 'element' };
      const target2 = { id: 2, type: 'element' };

      stateStore.addSelectedTarget(target1);
      stateStore.addSelectedTarget(target2);

      expect(stateStore.appState.value.selectedTargets).toContain(target1);
      expect(stateStore.appState.value.selectedTargets).toContain(target2);
      expect(stateStore.appState.value.selectedTargets.length).toBe(2);
    });

    it('should clear selected targets', () => {
      stateStore.addSelectedTarget({ id: 1, type: 'element' });
      stateStore.addSelectedTarget({ id: 2, type: 'element' });

      stateStore.clearSelectedTargets();
      expect(stateStore.appState.value.selectedTargets).toEqual([]);
    });

    it('should set selected targets array', () => {
      const targets = [
        { id: 1, type: 'element' },
        { id: 2, type: 'element' }
      ];

      stateStore.setSelectedTargets(targets);
      expect(stateStore.appState.value.selectedTargets).toEqual(targets);
    });
  });

  describe('History Management', () => {
    it('should manage undo history with size limit', () => {
      // Add items to history
      for (let i = 0; i < 55; i++) {
        stateStore.addToUndoHistory({ state: `state${i}` });
      }

      // Should be limited to 50 items
      expect(stateStore.undoHistory.value.length).toBe(50);
      // Should have removed the oldest items
      expect(stateStore.undoHistory.value[0]).toEqual({ state: 'state5' });
    });

    it('should manage redo history with size limit', () => {
      // Add items to redo history
      for (let i = 0; i < 55; i++) {
        stateStore.addToRedoHistory({ state: `state${i}` });
      }

      // Should be limited to 50 items
      expect(stateStore.redoHistory.value.length).toBe(50);
      expect(stateStore.redoHistory.value[0]).toEqual({ state: 'state5' });
    });

    it('should clear redo history', () => {
      stateStore.addToRedoHistory({ state: 'test' });
      expect(stateStore.redoHistory.value.length).toBe(1);

      stateStore.clearRedoHistory();
      expect(stateStore.redoHistory.value.length).toBe(0);
    });
  });

  describe('Global Messages', () => {
    it('should manage global messages', () => {
      const message1: GlobalMsgModel = {
        type: 'info',
        message: 'Test message 1',
        isShow: true,
        msgType: 'system',
        extral: undefined
      };

      const message2: GlobalMsgModel = {
        type: 'error',
        message: 'Test message 2',
        isShow: true,
        msgType: 'validation',
        extral: undefined
      };

      stateStore.addGlobalMessage(message1);
      stateStore.addGlobalMessage(message2);

      expect(stateStore.globalMsg.value).toContain(message1);
      expect(stateStore.globalMsg.value).toContain(message2);
      expect(stateStore.globalMsg.value.length).toBe(2);
    });

    it('should remove specific global message', () => {
      const message1: GlobalMsgModel = {
        type: 'info',
        message: 'Test message 1',
        isShow: true,
        msgType: 'system',
        extral: undefined
      };

      const message2: GlobalMsgModel = {
        type: 'error',
        message: 'Test message 2',
        isShow: true,
        msgType: 'validation',
        extral: undefined
      };

      stateStore.addGlobalMessage(message1);
      stateStore.addGlobalMessage(message2);

      stateStore.removeGlobalMessage(0);
      expect(stateStore.globalMsg.value).not.toContain(message1);
      expect(stateStore.globalMsg.value).toContain(message2);
      expect(stateStore.globalMsg.value.length).toBe(1);
    });

    it('should handle invalid message removal gracefully', () => {
      const message: GlobalMsgModel = {
        type: 'info',
        message: 'Test message',
        isShow: true,
        msgType: 'system',
        extral: undefined
      };

      stateStore.addGlobalMessage(message);

      // Try invalid indices
      stateStore.removeGlobalMessage(-1);
      stateStore.removeGlobalMessage(10);

      // Message should still be there
      expect(stateStore.globalMsg.value.length).toBe(1);
    });

    it('should clear all global messages', () => {
      stateStore.addGlobalMessage({
        type: 'info',
        message: 'Test message 1',
        isShow: true,
        msgType: 'system',
        extral: undefined
      });

      stateStore.addGlobalMessage({
        type: 'error',
        message: 'Test message 2',
        isShow: true,
        msgType: 'validation',
        extral: undefined
      });

      stateStore.clearGlobalMessages();
      expect(stateStore.globalMsg.value).toEqual([]);
    });
  });

  describe('Device Model', () => {
    it('should update device model', () => {
      const deviceData = {
        active: true,
        data: { id: 1, name: 'Test Device' }
      };

      stateStore.updateDeviceModel(deviceData);

      expect(stateStore.deviceModel.value.active).toBe(true);
      expect(stateStore.deviceModel.value.data).toEqual({ id: 1, name: 'Test Device' });
    });

    it('should partially update device model', () => {
      stateStore.updateDeviceModel({ active: true });
      stateStore.updateDeviceModel({ data: { id: 2, name: 'Updated Device' } });

      expect(stateStore.deviceModel.value.active).toBe(true);
      expect(stateStore.deviceModel.value.data).toEqual({ id: 2, name: 'Updated Device' });
    });
  });

  describe('Computed Properties', () => {
    it('should calculate viewport margins correctly for built-in edge', () => {
      stateStore.isBuiltInEdge.value = true;

      expect(stateStore.viewportMargins.value.top).toBe(36);
      expect(stateStore.viewportMargins.value.left).toBe(128);
    });

    it('should calculate viewport margins correctly for regular browser', () => {
      stateStore.isBuiltInEdge.value = false;

      expect(stateStore.viewportMargins.value.top).toBe(117);
      expect(stateStore.viewportMargins.value.left).toBe(128);
    });

    it('should return correct panel options', () => {
      const panelsData = [
        { id: 1, name: 'Panel 1' },
        { id: 2, name: 'Panel 2' }
      ];

      stateStore.T3000_Data.value.panelsData = panelsData;

      expect(stateStore.selectPanelOptions.value).toEqual(panelsData);
    });
  });

  describe('Destroy Method', () => {
    it('should clean up all state when destroyed', () => {
      // Set up some state
      stateStore.addItem({ id: 1, name: 'Test' });
      stateStore.addSelectedTarget({ id: 1, type: 'element' });
      stateStore.addToUndoHistory({ state: 'test' });
      stateStore.addToRedoHistory({ state: 'test' });
      stateStore.addGlobalMessage({
        type: 'info',
        message: 'Test',
        isShow: true,
        msgType: 'system',
        extral: undefined
      });

      // Destroy
      stateStore.destroy();

      // Verify cleanup
      expect(stateStore.appState.value.items).toEqual([]);
      expect(stateStore.appState.value.selectedTargets).toEqual([]);
      expect(stateStore.undoHistory.value).toEqual([]);
      expect(stateStore.redoHistory.value).toEqual([]);
      expect(stateStore.globalMsg.value).toEqual([]);
      expect(stateStore.grpNav.value).toEqual([]);
      expect(stateStore.deviceAppState.value).toEqual([]);
      expect(stateStore.T3Data.deviceList.value).toEqual([]);
      expect(stateStore.T3Data.graphicList.value).toEqual([]);
    });
  });
});

// Mock GlobalMsgModel for testing
declare global {
  namespace Vi {
    interface JestAssertion<T = any> extends CustomMatchers<T> {}
  }
}

interface CustomMatchers<R = unknown> {
  toBeTypeOf(expected: string): R;
}
