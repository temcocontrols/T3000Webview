

/**
 * Represents a collection of textures and their categories.
 *
 * The TextureList class provides a simple container for storing textures and
 * organizing them into categories. This can be used in HVAC visualization
 * components to manage different texture resources.
 *
 * @example
 * ```typescript
 * // Create a new texture list
 * const textureList = new TextureList();
 *
 * // Add textures to the list
 * textureList.Textures.push({ id: 1, name: 'Metal', url: 'textures/metal.png' });
 * textureList.Textures.push({ id: 2, name: 'Wood', url: 'textures/wood.png' });
 *
 * // Add categories
 * textureList.Categories.push({ id: 1, name: 'Materials' });
 * textureList.Categories.push({ id: 2, name: 'Patterns' });
 * ```
 */
class TextureList {

  public Textures: any[];
  public Categories: any[];

  constructor() {
    this.Textures = [];
    this.Categories = [];
  }
}

export default TextureList
