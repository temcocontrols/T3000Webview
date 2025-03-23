

/**
 * Represents a list of libraries used in HVAC models.
 *
 * This class manages a collection of library objects and maintains an index indicating
 * which library is currently selected. By default, the selected index is initialized to 0,
 * and the library array is empty.
 *
 * @example
 * // Instantiate the LibList class.
 * const libList = new LibList();
 *
 * // Add a new library object.
 * libList.lib.push({ name: 'HVAC Library', version: '1.0.0' });
 *
 * // Set the first library as the selected one.
 * libList.selected = 0;
 *
 * @remarks
 * The LibList class is intended to be a simple container for managing libraries in HVAC-related
 * control systems. It can be expanded or integrated into broader systems where library management
 * is required.
 */
class LibList {

  public selected: number;
  public lib: any[];

  constructor() {
    this.selected = 0;
    this.lib = [];
  }
}

export default LibList
