/**
 * BACnet Store - Manages BACnet data cache
 *
 * Responsibilities:
 * - Cache BACnet points (inputs, outputs, variables)
 * - Cache programs, controllers, schedules, trends, alarms
 * - CRUD operations for all BACnet objects
 * - Data synchronization with API
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  InputPoint,
  OutputPoint,
  VariablePoint,
  ProgramData,
  ControllerData,
  ScheduleData,
  TrendLogData,
  AlarmData,
  GraphicData
} from '@common/types/bacnet';
import {
  bacnetInputsApi,
  bacnetOutputsApi,
  bacnetVariablesApi,
  bacnetProgramsApi,
  bacnetControllersApi,
  bacnetSchedulesApi,
  bacnetTrendsApi,
  bacnetAlarmsApi,
  bacnetGraphicsApi
} from '@common/api';

interface BacnetState {
  // Data cache
  inputs: InputPoint[];
  outputs: OutputPoint[];
  variables: VariablePoint[];
  programs: ProgramData[];
  controllers: ControllerData[];
  schedules: ScheduleData[];
  trendLogs: TrendLogData[];
  alarms: AlarmData[];
  graphics: GraphicData[];

  // Loading states
  isLoadingInputs: boolean;
  isLoadingOutputs: boolean;
  isLoadingVariables: boolean;
  isLoadingPrograms: boolean;
  isLoadingControllers: boolean;

  // Errors
  error: string | null;

  // Inputs
  loadInputs: (deviceId: number) => Promise<void>;
  updateInput: (deviceId: number, inputId: number, data: Partial<InputPoint>) => Promise<void>;
  refreshInput: (deviceId: number, inputId: number) => Promise<void>;

  // Outputs
  loadOutputs: (deviceId: number) => Promise<void>;
  updateOutput: (deviceId: number, outputId: number, data: Partial<OutputPoint>) => Promise<void>;
  refreshOutput: (deviceId: number, outputId: number) => Promise<void>;

  // Variables
  loadVariables: (deviceId: number) => Promise<void>;
  updateVariable: (deviceId: number, variableId: number, data: Partial<VariablePoint>) => Promise<void>;
  refreshVariable: (deviceId: number, variableId: number) => Promise<void>;

  // Programs
  loadPrograms: (deviceId: number) => Promise<void>;
  updateProgram: (deviceId: number, programId: number, code: string) => Promise<void>;

  // Controllers
  loadControllers: (deviceId: number) => Promise<void>;
  updateController: (deviceId: number, controllerId: number, data: Partial<ControllerData>) => Promise<void>;

  // Schedules
  loadSchedules: (deviceId: number) => Promise<void>;

  // Trend Logs
  loadTrendLogs: (deviceId: number) => Promise<void>;

  // Alarms
  loadAlarms: (deviceId: number) => Promise<void>;

  // Graphics
  loadGraphics: (deviceId: number) => Promise<void>;

  // Utilities
  clearCache: () => void;
  reset: () => void;
}

const initialState = {
  inputs: [],
  outputs: [],
  variables: [],
  programs: [],
  controllers: [],
  schedules: [],
  trendLogs: [],
  alarms: [],
  graphics: [],
  isLoadingInputs: false,
  isLoadingOutputs: false,
  isLoadingVariables: false,
  isLoadingPrograms: false,
  isLoadingControllers: false,
  error: null,
};

export const useBacnetStore = create<BacnetState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // Inputs
      loadInputs: async (deviceId) => {
        set({ isLoadingInputs: true, error: null });
        try {
          const response = await bacnetInputsApi.getInputs(deviceId);
          set({
            inputs: response.data,
            isLoadingInputs: false
          });
        } catch (error) {
          set({
            isLoadingInputs: false,
            error: error instanceof Error ? error.message : 'Failed to load inputs'
          });
        }
      },

      updateInput: async (deviceId, inputId, data) => {
        try {
          await bacnetInputsApi.updateInput(deviceId, inputId, data);
          set((state) => ({
            inputs: state.inputs.map((input) =>
              input.id === inputId ? { ...input, ...data } : input
            ),
          }));
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to update input'
          });
        }
      },

      refreshInput: async (deviceId, inputId) => {
        try {
          const response = await bacnetInputsApi.getInput(deviceId, inputId);
          set((state) => ({
            inputs: state.inputs.map((input) =>
              input.id === inputId ? response.data : input
            ),
          }));
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to refresh input'
          });
        }
      },

      // Outputs
      loadOutputs: async (deviceId) => {
        set({ isLoadingOutputs: true, error: null });
        try {
          const response = await bacnetOutputsApi.getOutputs(deviceId);
          set({
            outputs: response.data,
            isLoadingOutputs: false
          });
        } catch (error) {
          set({
            isLoadingOutputs: false,
            error: error instanceof Error ? error.message : 'Failed to load outputs'
          });
        }
      },

      updateOutput: async (deviceId, outputId, data) => {
        try {
          await bacnetOutputsApi.updateOutput(deviceId, outputId, data);
          set((state) => ({
            outputs: state.outputs.map((output) =>
              output.id === outputId ? { ...output, ...data } : output
            ),
          }));
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to update output'
          });
        }
      },

      refreshOutput: async (deviceId, outputId) => {
        try {
          const response = await bacnetOutputsApi.getOutput(deviceId, outputId);
          set((state) => ({
            outputs: state.outputs.map((output) =>
              output.id === outputId ? response.data : output
            ),
          }));
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to refresh output'
          });
        }
      },

      // Variables
      loadVariables: async (deviceId) => {
        set({ isLoadingVariables: true, error: null });
        try {
          const response = await bacnetVariablesApi.getVariables(deviceId);
          set({
            variables: response.data,
            isLoadingVariables: false
          });
        } catch (error) {
          set({
            isLoadingVariables: false,
            error: error instanceof Error ? error.message : 'Failed to load variables'
          });
        }
      },

      updateVariable: async (deviceId, variableId, data) => {
        try {
          await bacnetVariablesApi.updateVariable(deviceId, variableId, data);
          set((state) => ({
            variables: state.variables.map((variable) =>
              variable.id === variableId ? { ...variable, ...data } : variable
            ),
          }));
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to update variable'
          });
        }
      },

      refreshVariable: async (deviceId, variableId) => {
        try {
          const response = await bacnetVariablesApi.getVariable(deviceId, variableId);
          set((state) => ({
            variables: state.variables.map((variable) =>
              variable.id === variableId ? response.data : variable
            ),
          }));
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to refresh variable'
          });
        }
      },

      // Programs
      loadPrograms: async (deviceId) => {
        set({ isLoadingPrograms: true, error: null });
        try {
          const response = await bacnetProgramsApi.getPrograms(deviceId);
          set({
            programs: response.data,
            isLoadingPrograms: false
          });
        } catch (error) {
          set({
            isLoadingPrograms: false,
            error: error instanceof Error ? error.message : 'Failed to load programs'
          });
        }
      },

      updateProgram: async (deviceId, programId, code) => {
        try {
          await bacnetProgramsApi.updateProgram(deviceId, programId, { code });
          set((state) => ({
            programs: state.programs.map((program) =>
              program.id === programId ? { ...program, code } : program
            ),
          }));
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to update program'
          });
        }
      },

      // Controllers
      loadControllers: async (deviceId) => {
        set({ isLoadingControllers: true, error: null });
        try {
          const response = await bacnetControllersApi.getControllers(deviceId);
          set({
            controllers: response.data,
            isLoadingControllers: false
          });
        } catch (error) {
          set({
            isLoadingControllers: false,
            error: error instanceof Error ? error.message : 'Failed to load controllers'
          });
        }
      },

      updateController: async (deviceId, controllerId, data) => {
        try {
          await bacnetControllersApi.updateController(deviceId, controllerId, data);
          set((state) => ({
            controllers: state.controllers.map((controller) =>
              controller.id === controllerId ? { ...controller, ...data } : controller
            ),
          }));
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to update controller'
          });
        }
      },

      // Schedules
      loadSchedules: async (deviceId) => {
        try {
          const response = await bacnetSchedulesApi.getSchedules(deviceId);
          set({ schedules: response.data });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to load schedules'
          });
        }
      },

      // Trend Logs
      loadTrendLogs: async (deviceId) => {
        try {
          const response = await bacnetTrendsApi.getTrendLogs(deviceId);
          set({ trendLogs: response.data });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to load trend logs'
          });
        }
      },

      // Alarms
      loadAlarms: async (deviceId) => {
        try {
          const response = await bacnetAlarmsApi.getAlarms(deviceId);
          set({ alarms: response.data });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to load alarms'
          });
        }
      },

      // Graphics
      loadGraphics: async (deviceId) => {
        try {
          const response = await bacnetGraphicsApi.getGraphics(deviceId);
          set({ graphics: response.data });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to load graphics'
          });
        }
      },

      // Utilities
      clearCache: () => {
        set({
          inputs: [],
          outputs: [],
          variables: [],
          programs: [],
          controllers: [],
          schedules: [],
          trendLogs: [],
          alarms: [],
          graphics: [],
        });
      },

      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'BacnetStore',
    }
  )
);

// Selectors
export const bacnetSelectors = {
  inputs: (state: BacnetState) => state.inputs,
  outputs: (state: BacnetState) => state.outputs,
  variables: (state: BacnetState) => state.variables,
  programs: (state: BacnetState) => state.programs,
  controllers: (state: BacnetState) => state.controllers,
  isLoading: (state: BacnetState) =>
    state.isLoadingInputs ||
    state.isLoadingOutputs ||
    state.isLoadingVariables ||
    state.isLoadingPrograms ||
    state.isLoadingControllers,
};
