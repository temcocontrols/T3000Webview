/**
 * Device capability helper.
 *
 * Used by the Inputs / Outputs / Variables pages to detect sub-devices that
 * don't support a given point type, so the pages can show a clear
 * "Not Supported" notice instead of an empty grid.
 */
import type { DeviceInfo } from '../../../shared/types/device';

/**
 * A sub-device has a non-zero parent serial. Sub-devices are I/O modules on
 * their parent's subnet — their points are managed through the parent, so the
 * Input/Output/Variable pages are not supported on the sub-device itself.
 */
export const isSubDevice = (d: DeviceInfo | null | undefined): boolean =>
  !!d && Number(d.parentSerialNumber ?? d.noteParentSerialNumber ?? 0) > 0;
