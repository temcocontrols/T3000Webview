/**
 * useBacnetApi Hook
 *
 * Provides convenient access to BACnet operations
 * Wraps bacnetStore and API calls with loading states
 */

import { useCallback } from 'react';
import { useBacnetStore, bacnetSelectors } from '@t3-react/store';
import type {
  InputPoint,
  OutputPoint,
  VariablePoint,
  ProgramData,
  ControllerData
} from '@common/react/types/bacnet';

export function useBacnetApi() {
  // State selectors
  const inputs = useBacnetStore(bacnetSelectors.inputs);
  const outputs = useBacnetStore(bacnetSelectors.outputs);
  const variables = useBacnetStore(bacnetSelectors.variables);
  const programs = useBacnetStore(bacnetSelectors.programs);
  const controllers = useBacnetStore(bacnetSelectors.controllers);
  const isLoading = useBacnetStore(bacnetSelectors.isLoading);

  // Individual loading states
  const isLoadingInputs = useBacnetStore((state) => state.isLoadingInputs);
  const isLoadingOutputs = useBacnetStore((state) => state.isLoadingOutputs);
  const isLoadingVariables = useBacnetStore((state) => state.isLoadingVariables);
  const isLoadingPrograms = useBacnetStore((state) => state.isLoadingPrograms);
  const isLoadingControllers = useBacnetStore((state) => state.isLoadingControllers);

  const schedules = useBacnetStore((state) => state.schedules);
  const trendLogs = useBacnetStore((state) => state.trendLogs);
  const alarms = useBacnetStore((state) => state.alarms);
  const graphics = useBacnetStore((state) => state.graphics);
  const error = useBacnetStore((state) => state.error);

  // Actions - Inputs
  const loadInputs = useBacnetStore((state) => state.loadInputs);
  const updateInput = useBacnetStore((state) => state.updateInput);
  const refreshInput = useBacnetStore((state) => state.refreshInput);

  // Actions - Outputs
  const loadOutputs = useBacnetStore((state) => state.loadOutputs);
  const updateOutput = useBacnetStore((state) => state.updateOutput);
  const refreshOutput = useBacnetStore((state) => state.refreshOutput);

  // Actions - Variables
  const loadVariables = useBacnetStore((state) => state.loadVariables);
  const updateVariable = useBacnetStore((state) => state.updateVariable);
  const refreshVariable = useBacnetStore((state) => state.refreshVariable);

  // Actions - Programs
  const loadPrograms = useBacnetStore((state) => state.loadPrograms);
  const updateProgram = useBacnetStore((state) => state.updateProgram);

  // Actions - Controllers
  const loadControllers = useBacnetStore((state) => state.loadControllers);
  const updateController = useBacnetStore((state) => state.updateController);

  // Actions - Other
  const loadSchedules = useBacnetStore((state) => state.loadSchedules);
  const loadTrendLogs = useBacnetStore((state) => state.loadTrendLogs);
  const loadAlarms = useBacnetStore((state) => state.loadAlarms);
  const loadGraphics = useBacnetStore((state) => state.loadGraphics);

  const clearCache = useBacnetStore((state) => state.clearCache);

  // Helper functions
  const loadAllPoints = useCallback(
    async (deviceId: number) => {
      await Promise.all([
        loadInputs(deviceId),
        loadOutputs(deviceId),
        loadVariables(deviceId),
      ]);
    },
    [loadInputs, loadOutputs, loadVariables]
  );

  const loadAllData = useCallback(
    async (deviceId: number) => {
      await Promise.all([
        loadInputs(deviceId),
        loadOutputs(deviceId),
        loadVariables(deviceId),
        loadPrograms(deviceId),
        loadControllers(deviceId),
        loadSchedules(deviceId),
        loadTrendLogs(deviceId),
        loadAlarms(deviceId),
        loadGraphics(deviceId),
      ]);
    },
    [
      loadInputs,
      loadOutputs,
      loadVariables,
      loadPrograms,
      loadControllers,
      loadSchedules,
      loadTrendLogs,
      loadAlarms,
      loadGraphics,
    ]
  );

  const getInputById = useCallback(
    (inputId: number): InputPoint | undefined => {
      return inputs.find((input) => input.id === inputId);
    },
    [inputs]
  );

  const getOutputById = useCallback(
    (outputId: number): OutputPoint | undefined => {
      return outputs.find((output) => output.id === outputId);
    },
    [outputs]
  );

  const getVariableById = useCallback(
    (variableId: number): VariablePoint | undefined => {
      return variables.find((variable) => variable.id === variableId);
    },
    [variables]
  );

  const getProgramById = useCallback(
    (programId: number): ProgramData | undefined => {
      return programs.find((program) => program.id === programId);
    },
    [programs]
  );

  const getControllerById = useCallback(
    (controllerId: number): ControllerData | undefined => {
      return controllers.find((controller) => controller.id === controllerId);
    },
    [controllers]
  );

  return {
    // State - Points
    inputs,
    outputs,
    variables,
    programs,
    controllers,

    // State - Other
    schedules,
    trendLogs,
    alarms,
    graphics,

    // Loading states
    isLoading,
    isLoadingInputs,
    isLoadingOutputs,
    isLoadingVariables,
    isLoadingPrograms,
    isLoadingControllers,
    error,

    // Actions - Inputs
    loadInputs,
    updateInput,
    refreshInput,

    // Actions - Outputs
    loadOutputs,
    updateOutput,
    refreshOutput,

    // Actions - Variables
    loadVariables,
    updateVariable,
    refreshVariable,

    // Actions - Programs
    loadPrograms,
    updateProgram,

    // Actions - Controllers
    loadControllers,
    updateController,

    // Actions - Other
    loadSchedules,
    loadTrendLogs,
    loadAlarms,
    loadGraphics,

    // Utilities
    loadAllPoints,
    loadAllData,
    getInputById,
    getOutputById,
    getVariableById,
    getProgramById,
    getControllerById,
    clearCache,
  };
}
