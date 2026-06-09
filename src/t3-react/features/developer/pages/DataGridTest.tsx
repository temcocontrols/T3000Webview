/**
 * DataGridTest — Minimal FluentUI v9 resizable columns test
 * Matches the Cypress component test from the FluentUI repo.
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
import type { TableColumnDefinition } from "@fluentui/react-components";

interface Item {
  first: string;
  second: string;
  third: string;
}

const testItems: Item[] = [
  { first: "abc", second: "def", third: "ghi" },
  { first: "jkl", second: "mno", third: "pqr" },
];

const testColumns: TableColumnDefinition<Item>[] = [
  createTableColumn<Item>({
    columnId: "first",
    renderHeaderCell: () => (
      <span style={{ background: "#d6e4f7", display: "block", width: "100%", padding: "4px 0" }}>First</span>
    ),
    renderCell: (item) => <TableCellLayout>{item.first}</TableCellLayout>,
  }),
  createTableColumn<Item>({
    columnId: "second",
    renderHeaderCell: () => (
      <span style={{ background: "#c8e6c9", display: "block", width: "100%", padding: "4px 0" }}>Second</span>
    ),
    renderCell: (item) => <TableCellLayout>{item.second}</TableCellLayout>,
  }),
  createTableColumn<Item>({
    columnId: "third",
    renderHeaderCell: () => (
      <span style={{ background: "#ffe0b2", display: "block", width: "100%", padding: "4px 0" }}>Third</span>
    ),
    renderCell: (item) => <TableCellLayout>{item.third}</TableCellLayout>,
  }),
];

const columnSizingOptions = {
  first: { idealWidth: 160, minWidth: 80 },
  second: { idealWidth: 160, minWidth: 80 },
  third: { idealWidth: 170, minWidth: 90 },
};

export const DataGridTest: React.FC = () => {
  return (
    <div style={{ padding: 16 }}>
      <h3>DataGrid — Minimal Resizable Test (Cypress match)</h3>
      <p style={{ color: "#605e5c", fontSize: 13, marginBottom: 12 }}>
        Bare minimum: <code>resizableColumns</code> + <code>columnSizingOptions</code>.
        No Menu, no selectionMode, no getRowId, no custom CSS at all.
      </p>
      <DataGrid
        items={testItems}
        columns={testColumns}
        resizableColumns
        columnSizingOptions={columnSizingOptions}
      >
        <DataGridHeader style={{ backgroundColor: "#e0e0e0" }}>
          <DataGridRow<Item>>
            {({ renderHeaderCell }) => (
              <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
            )}
          </DataGridRow>
        </DataGridHeader>
        <DataGridBody<Item>>
          {({ item }) => (
            <DataGridRow<Item>>
              {({ renderCell }) => (
                <DataGridCell>{renderCell(item)}</DataGridCell>
              )}
            </DataGridRow>
          )}
        </DataGridBody>
      </DataGrid>
    </div>
  );
};
