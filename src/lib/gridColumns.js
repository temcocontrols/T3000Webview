import { ranges } from "src/lib/common";

const requiredClassRules = {
  "bg-red-800": (params) => !params.value,
};
export default {
  inputs: [
    {
      colId: 0,
      headerName: "",
      sortable: false,
      editable: false,
      // filter: false,
      field: "id",
      checkboxSelection: true,
      headerCheckboxSelection: true,
      width: 50,
      valueFormatter: () => {
        return "";
      },
    },
    {
      colId: 1,
      headerName: "Index",
      // filter: "agNumberColumnFilter",
      cellEditor: "NumericEditor",
      sortable: true,
      field: "index",
      cellClassRules: requiredClassRules,
    },
    {
      colId: 1,
      headerName: "Panel",
      sortable: true,
      field: "panel",
      editable: false,
      valueGetter: (params) => {
        return params.context.appData.panelId;
      },
      // filter: "agNumberColumnFilter",
      cellEditor: "NumericEditor",
    },
    {
      colId: 2,
      headerName: "Label",
      sortable: true,
      field: "label",
    },
    {
      colId: 3,
      headerName: "Full Label",
      sortable: true,
      field: "fullLabel",
    },
    {
      colId: 10,
      headerName: "Auto Manual",
      sortable: true,
      field: "auto_manual",
      cellEditor: "agSelectCellEditor",
      cellEditorParams: {
        values: [0, 1],
      },
      cellClassRules: requiredClassRules,
    },
    {
      colId: 12,
      headerName: "Value",
      sortable: true,
      editable(params) {
        if (params.data?.auto_manual === 0) return false;
        return true;
      },
      field: "value",
    },
    {
      colId: 5,
      headerName: "Units",
      sortable: true,
      editable: false,
      field: "units",
    },
    {
      colId: 6,
      headerName: "Range",
      sortable: true,
      field: "range",
      cellEditorPopup: true,
      cellEditor: "RangeEditor",
    },
    {
      colId: 7,
      headerName: "Filter",
      sortable: true,
      field: "filter",
      // filter: "agNumberColumnFilter",
      cellEditor: "NumericEditor",
    },
    {
      colId: 4,
      headerName: "Status",
      sortable: true,
      editable: false,
      field: "status",
    },
    {
      colId: 8,
      headerName: "Signal Type",
      sortable: true,
      field: "signalType",
      cellEditor: "agSelectCellEditor",
      cellEditorParams: {
        values: [
          "Thermistor Dry Contact",
          "4-20 ma",
          "0-5 V",
          "0-10 V",
          "PT 1K",
        ],
      },
    },
    {
      colId: 14,
      headerName: "Type",
      sortable: true,
      editable: false,
      field: "type",
      cellEditor: "agSelectCellEditor",
      cellEditorParams: {
        values: ["Analog", "Digital"],
      },
    },
  ],
};
