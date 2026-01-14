/**
 * Graphics Type Definitions
 * Graphics screens, labels, and multi-state values
 */

// GRAPHICS Table
export interface Graphic {
  GraphicId?: number;
  serialNumber: number;
  graphicId: string;           // API returns graphicId (camelCase)
  switchNode: string;           // API returns switchNode
  graphicLabel: string;         // API returns graphicLabel (short label)
  graphicFullLabel: string;     // API returns graphicFullLabel (full description)
  graphicPictureFile: string;   // API returns graphicPictureFile
  graphicTotalPoint: string;    // API returns graphicTotalPoint (element count)
  
  // Deprecated field names (kept for backward compatibility)
  Graphic_ID?: string;
  Panel?: string;
  Label?: string;
  Full_Label?: string;
  Picture_File?: string;
  Element_Count?: number;
  Status?: string;
}

// GRAPHIC_LABELS Table
export interface GraphicLabel {
  LabelId?: number;
  SerialNumber: number;
  Label_ID: string;
  Label_Index: number;
  Panel: string;
  Label_Status: number;
  Screen_Index: number;
  Main_Panel: number;
  Sub_Panel: number;
  Point_Type: number;
  Point_Number: number;
  Point_X: number;
  Point_Y: number;
  Text_Color: number;             // Color as integer
  Display_Type: number;
  Icon_Size: number;
  Icon_Place: number;
  Icon_Name_1: string;            // 20 bytes
  Icon_Name_2: string;            // 20 bytes
  Network: number;
  Status: string;
}

// MSV_DATA Table (Multi-State Values)
export interface Msv {
  MsvId?: number;
  SerialNumber: number;
  MSV_ID: string;
  MSV_Index: number;              // 0-7
  Panel: string;
  Status_Field: number;
  MSV_Name: string;               // 20 bytes
  MSV_Value: number;
  Status: string;
}
