/**
 * Device Tree Type Definitions
 * Based on C++ tree_product structure
 *
 * C++ to React Mapping Reference:
 * ================================
 * C++ (tree_product)                    → React (DeviceInfo)
 * ------------------------------------------------
 * serial_number                         → serialNumber
 * product_class_id                      → productClassId
 * status + status_last_time[5]          → status + statusHistory[]
 * NameShowOnTree                        → nameShowOnTree
 * expand (1=expanded, 2=collapsed)      → expand / expandedNodes Set
 * note_parent_serial_number             → noteParentSerialNumber
 * HTREEITEM product_item                → React component key/id
 * strImgPathName                        → imgPathName (icon mapping)
 * BuildingInfo                          → buildingName, mainBuildingName
 *
 * See LEFT_PANEL_CPP_DESIGN.md Section 1 for complete field details
 */

export type DeviceStatus = 'online' | 'offline' | 'unknown';
export type DeviceProtocol = 'BACnet' | 'Modbus' | 'Native';
export type NodeType = 'building' | 'subnet' | 'device' | 'sub-device';

/**
 * Main device information structure
 * Maps to C++ tree_product and database devices table
 */
export interface DeviceInfo {
  // Primary identification
  serialNumber: number;              // Serial_Number (PRIMARY KEY)
  panelId?: number;                  // Panel_ID

  // Hierarchy
  mainBuildingName?: string;         // MainBuilding_Name
  buildingName?: string;             // Building_Name
  floorName?: string;                // Floor_Name
  roomName?: string;                 // Room_Name

  // Device information
  productName: string;               // Product_Name
  productClassId: number;            // Product_Class_ID (1=Tstat, 2=LED, etc.)
  productId: number;                 // Product_ID

  // Network configuration
  protocol: DeviceProtocol;
  ipAddress?: string;                // IP_Address
  port?: number;                     // Port
  bacnetMstpMacId?: number;          // BACnet_MSTP_MAC_ID
  modbusAddress?: number;            // Modbus_Address
  pcIpAddress?: string;              // PC_IP_Address
  modbusPort?: number;               // Modbus_Port
  bacnetIpPort?: number;             // BACnet_IP_Port
  baudrate?: string;                 // Bautrate
  comPort?: number;                  // Com_Port
  connectionType?: string;           // Connection_Type

  // Device status
  status: DeviceStatus;
  statusHistory: boolean[];          // Last 5 connection attempts

  // Device details
  hardwareVersion?: number;
  softwareVersion?: number;
  objectInstance?: number;           // BACnet object instance

  // Display
  nameShowOnTree: string;            // Show_Label_Name or Product_Name
  custom?: string;                   // Custom label
  description?: string;              // Description
  imgPathName?: string;              // Icon path

  // Hierarchy relationships
  noteParentSerialNumber?: number;   // Parent device serial number
  panelNumber?: number;              // Panel number
  subnetPort?: number;               // 1=Main, 2=Zigbee, 3=Sub
  subnetBaudrate?: number;           // Subnet baudrate
  expand?: number;                   // 1=expanded, 2=collapsed
}

/**
 * Tree node structure for UI rendering
 */
export interface TreeNode {
  id: string;                        // Unique node ID
  type: NodeType;
  label: string;
  icon?: string;
  children?: TreeNode[];
  data?: DeviceInfo;                 // Actual device data (for device nodes)
  expanded?: boolean;
  selected?: boolean;
  status?: DeviceStatus;
  level?: number;                    // Tree depth level
}

/**
 * Building/Subnet grouping
 */
export interface BuildingInfo {
  id: string;
  name: string;
  protocol: string;                  // "BACnet IP", "Modbus TCP", "Modbus RTU"
  ipAddress?: string;
  port?: string;
  comPort?: string;
  baudrate?: string;
  deviceCount: number;
}

/**
 * API response with device statistics
 */
export interface DeviceWithStats extends DeviceInfo {
  inputCount: number;
  outputCount: number;
  variableCount: number;
  totalPoints: number;
}

/**
 * API response structure for GET /api/devices
 */
export interface DevicesResponse {
  devices: DeviceWithStats[];
  total: number;
  message: string;
}

/**
 * Scan options for device discovery
 */
export interface ScanOptions {
  protocol?: 'BACnet' | 'Modbus' | 'All';
  ipRange?: string;
  comPort?: number;
  timeout?: number;
}
