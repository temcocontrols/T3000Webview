

// /**
//  * Represents a recent symbol used in the HVAC module to encapsulate properties such as an item identifier,
//  * title, associated tooltip text, symbol image URL, and a flag indicating whether a menu is disabled.
//  *
//  * @remarks
//  * When a title is provided, the constructor initializes the ContentTitle property with the given title,
//  * builds the ContentImageUrl based on a fixed directory ("symbols/BTN/") concatenated with the ItemId and a ".png" extension,
//  * and constructs the ContentTT (tooltip text) by replacing double quotes (") with HTML entity "&quot;" in the title.
//  *
//  * @example
//  * Here's how you can create an instance of RecentSymbol:
//  *
//  * ```typescript
//  * // Create a recent symbol with item id 100, a title "Sensor" and no menu flag set to false.
//  * const recentSymbol = new RecentSymbol(100, "Sensor", false);
//  *
//  * console.log(recentSymbol.ContentTitle);      // "Sensor"
//  * console.log(recentSymbol.ContentImageUrl);     // "symbols/BTN/100.png"
//  * console.log(recentSymbol.ContentTT);           // "Sensor" (with double quotes replaced if present)
//  * console.log(recentSymbol.NoMenu);              // false
//  * ```
//  *
//  * @public
//  */
// class RecentSymbol {

//   public ItemId: number;
//   public ContentTitle: string;
//   public ContentTT: string;
//   public ContentImageUrl: string;
//   public NoMenu: boolean;

//   constructor(itemId: number, title: string, noMenu: boolean) {

//     this.ItemId = itemId;
//     this.ContentTitle = '';
//     this.ContentTT = '';
//     this.ContentImageUrl = '';
//     this.NoMenu = !!noMenu;

//     if (title) {
//       this.ContentTitle = title;
//       this.ContentImageUrl = 'symbols/BTN/' + this.ItemId + '.png';
//       this.ContentTT = this.ContentTitle.replace(/"/g, '&quot;');
//     }

//   }
// }

// export default RecentSymbol

