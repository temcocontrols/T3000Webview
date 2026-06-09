/**
 * DataGridTest — 13-column resizable test (Inputs page pattern)
 * Verified working with autoFitColumns=false + overflowX auto
 */

import * as React from "react";
import {
  DataGrid,
  DataGridBody,
  DataGridCell,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridRow,
  TableCellLayout,
  createTableColumn,
} from "@fluentui/react-components";

const c = (bg: string) => ({ background: bg, display: "block" as const, width: "100%", padding: "4px 0" });

export const DataGridTest: React.FC = () => {
  return (
    <div style={{ overflowX: "auto" }}>
      <h3 style={{ margin: "0 0 4px 0", fontSize: 14 }}>DataGrid — 13 Columns (Inputs page match)</h3>
      <p style={{ color: "#605e5c", fontSize: 12, margin: "0 0 8px 0" }}>
        <code>autoFitColumns: false</code> + <code>overflowX: auto</code>. No scrollbar by default, appears on resize wider.
      </p>
      <DataGrid
        items={[
          { panel:"P1",input:"I01",fullLabel:"Room Temp",label:"RT",autoManual:"Auto",value:"72.5",units:"°F",range:"0-100",cal_sign:"+",filter:"1s",status:"OK",type:"AI",tags:"hvac" },
          { panel:"P1",input:"I02",fullLabel:"Setpoint",label:"SP",autoManual:"Manual",value:"70.0",units:"°F",range:"0-100",cal_sign:"+",filter:"1s",status:"OK",type:"AI",tags:"setpoint" },
        ]}
        columns={[
          createTableColumn({ columnId:"panel", renderHeaderCell:()=><span style={c("#d6e4f7")}>Panel</span>, renderCell:(item:any)=><TableCellLayout>{item.panel}</TableCellLayout> }),
          createTableColumn({ columnId:"input", renderHeaderCell:()=><span style={c("#c8e6c9")}>Input</span>, renderCell:(item:any)=><TableCellLayout>{item.input}</TableCellLayout> }),
          createTableColumn({ columnId:"fullLabel", renderHeaderCell:()=><span style={c("#ffe0b2")}>Full Label</span>, renderCell:(item:any)=><TableCellLayout>{item.fullLabel}</TableCellLayout> }),
          createTableColumn({ columnId:"label", renderHeaderCell:()=><span style={c("#f8bbd0")}>Label</span>, renderCell:(item:any)=><TableCellLayout>{item.label}</TableCellLayout> }),
          createTableColumn({ columnId:"autoManual", renderHeaderCell:()=><span style={c("#ffcc80")}>Auto/Man</span>, renderCell:(item:any)=><TableCellLayout>{item.autoManual}</TableCellLayout> }),
          createTableColumn({ columnId:"value", renderHeaderCell:()=><span style={c("#b2dfdb")}>Value</span>, renderCell:(item:any)=><TableCellLayout>{item.value}</TableCellLayout> }),
          createTableColumn({ columnId:"units", renderHeaderCell:()=><span style={c("#d1c4e9")}>Units</span>, renderCell:(item:any)=><TableCellLayout>{item.units}</TableCellLayout> }),
          createTableColumn({ columnId:"range", renderHeaderCell:()=><span style={c("#e6ee9c")}>Range</span>, renderCell:(item:any)=><TableCellLayout>{item.range}</TableCellLayout> }),
          createTableColumn({ columnId:"cal_sign", renderHeaderCell:()=><span style={c("#bcaaa4")}>Cal/Sign</span>, renderCell:(item:any)=><TableCellLayout>{item.cal_sign}</TableCellLayout> }),
          createTableColumn({ columnId:"filter", renderHeaderCell:()=><span style={c("#80cbc4")}>Filter</span>, renderCell:(item:any)=><TableCellLayout>{item.filter}</TableCellLayout> }),
          createTableColumn({ columnId:"status", renderHeaderCell:()=><span style={c("#a5d6a7")}>Status</span>, renderCell:(item:any)=><TableCellLayout>{item.status}</TableCellLayout> }),
          createTableColumn({ columnId:"type", renderHeaderCell:()=><span style={c("#90caf9")}>Type</span>, renderCell:(item:any)=><TableCellLayout>{item.type}</TableCellLayout> }),
          createTableColumn({ columnId:"tags", renderHeaderCell:()=><span style={c("#cfd8dc")}>Tags</span>, renderCell:(item:any)=><TableCellLayout>{item.tags}</TableCellLayout> }),
        ]}
        resizableColumns
        resizableColumnsOptions={{ autoFitColumns: false }}
        style={{ width: "100%" }}
        columnSizingOptions={{
          panel: { idealWidth: 50, minWidth: 40 },
          input: { idealWidth: 70, minWidth: 55 },
          fullLabel: { idealWidth: 130, minWidth: 80 },
          label: { idealWidth: 80, minWidth: 55 },
          autoManual: { idealWidth: 60, minWidth: 50 },
          value: { idealWidth: 60, minWidth: 50 },
          units: { idealWidth: 50, minWidth: 40 },
          range: { idealWidth: 80, minWidth: 60 },
          cal_sign: { idealWidth: 60, minWidth: 45 },
          filter: { idealWidth: 50, minWidth: 40 },
          status: { idealWidth: 50, minWidth: 40 },
          type: { idealWidth: 60, minWidth: 50 },
          tags: { idealWidth: 100, minWidth: 70 },
        }}
      >
        <DataGridHeader style={{ backgroundColor: "#e0e0e0" }}>
          <DataGridRow>
            {({ renderHeaderCell }: any) => (
              <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
            )}
          </DataGridRow>
        </DataGridHeader>
        <DataGridBody>
          {({ item, rowId }: any) => (
            <DataGridRow key={rowId}>
              {({ renderCell }: any) => (
                <DataGridCell>{renderCell(item)}</DataGridCell>
              )}
            </DataGridRow>
          )}
        </DataGridBody>
      </DataGrid>
    </div>
  );
};
