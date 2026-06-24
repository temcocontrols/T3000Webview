
import {
    findBitmap,
    findLvglStyle,
    findPage,
    Project,
    ProjectType
} from "project-editor/project/project";

type LvglActionPropertyType =
    | "boolean"
    | "integer"
    | "string"
    | `enum:${string}`
    | "screen"
    | "widget"
    | `widget:${string}`
    | "group"
    | "style"
    | "image"
    | "style-property"
    | "style-value";

export interface IActionPropertyDefinition {
    name: string;
    type: LvglActionPropertyType;
    isAssignable?: boolean;
    helpText: string;
}

export interface IActionDefinition {
    id: number;
    name: string;
    displayName?: string;
    group: string;
    properties: IActionPropertyDefinition[];
    defaults: any;
    label?: (
        propertyValues: string[],
        propertyNames: string[]
    ) => React.ReactNode;
    helpText: string;
    disabled?: (project: Project) => string | false;
}

export const actionDefinitions: IActionDefinition[] = [];