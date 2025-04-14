

/**
 * Represents a hook with associated identification and connection details.
 *
 * @remarks
 * The Hook class encapsulates properties required to define a hook element in an HVAC or similar system.
 * Each instance includes identifiers (objid, cellid, cellindex), a hook point, and a connection point represented
 * as x and y coordinates.
 *
 * @example
 * Here's an example of how to create an instance of Hook:
 * ```typescript
 * const hook = new Hook(1, 100, 2, 50, { x: 10, y: 20 });
 * console.log(hook.connect); // Output: { x: 10, y: 20 }
 * ```
 *
 * @param objid - Unique identifier for the object. Defaults to 0 if not provided.
 * @param cellid - Identifier for the cell to which the hook is attached. May be null if not provided.
 * @param cellindex - Index of the cell. Defaults to 0 if not provided.
 * @param hookpt - The hook point value. Defaults to 0 if not provided.
 * @param connect - An object containing x and y coordinates for the connection point.
 *                  Each coordinate defaults to 0 if not provided.
 */
class Hook {

  public objid: number;
  public cellid: number;
  public cellindex: number;
  public hookpt: number;
  public connect: { x: number, y: number };

  constructor(objid: number, cellid: number, cellindex: number, hookpt: number, connect: { x: number, y: number }) {
    this.objid = objid || 0;
    this.cellid = cellid || null;
    this.cellindex = cellindex || 0;
    this.hookpt = hookpt || 0;
    this.connect = { x: 0, y: 0 };

    if (connect) {
      this.connect.x = connect.x || 0;
      this.connect.y = connect.y || 0;
    }
  }
}

export default Hook
