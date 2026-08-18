/**
 * Device point-type capability helpers.
 *
 * Used by the Inputs / Outputs / Variables pages to detect "old" and
 * sub-devices that don't support a given point type, so the pages can show a
 * clear "Not Supported" message instead of an empty grid.
 */
import type { DeviceInfo } from '../../../shared/types/device';

export type PointType = 'input' | 'output' | 'variable';

/**
 * A sub-device has a non-zero parent serial. Sub-devices are I/O modules on
 * their parent's subnet — their points are managed through the parent, so the
 * Input/Output/Variable pages are not supported on the sub-device itself.
 */
export const isSubDevice = (d: DeviceInfo | null | undefined): boolean =>
  !!d && Number(d.parentSerialNumber ?? d.noteParentSerialNumber ?? 0) > 0;

/**
 * Point-count threshold below which a point type is treated as unsupported.
 * Old devices report fewer than the full 64-slot I/O capacity for the types
 * they lack (they may report 0, or a handful, of points).
 */
export const MIN_POINT_SUPPORT = 64;

/** Number of points the device currently has of the given type (from device list). */
export function getPointCount(device: DeviceInfo | null | undefined, type: PointType): number {
  if (!device) return 0;
  if (type === 'input') return device.inputCount ?? 0;
  if (type === 'output') return device.outputCount ?? 0;
  return device.variableCount ?? 0;
}

/**
 * Whether the device is *expected* to support a point type, based on its
 * current point counts. Sub-devices are always unsupported.
 */
export function deviceSupportsPointType(
  device: DeviceInfo | null | undefined,
  type: PointType
): boolean {
  if (!device) return false;
  if (isSubDevice(device)) return false;
  return getPointCount(device, type) >= MIN_POINT_SUPPORT;
}
