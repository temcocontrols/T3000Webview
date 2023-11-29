import { Prisma } from "@prisma/client";
export declare const exec: (
  request: {
    model: string;
    args?: {};
    func: string;
  },
  subscriptionCallback?: (e: any) => void
) => Promise<any> | (() => Promise<void>);
declare const bridg: {
  user: Omit<
    Prisma.UserDelegate<import("@prisma/client/runtime/library").DefaultArgs>,
    "createMany" | "fields"
  >;
  file: Omit<
    Prisma.FileDelegate<import("@prisma/client/runtime/library").DefaultArgs>,
    "createMany" | "fields"
  >;
  hvacTool: Omit<
    Prisma.HvacToolDelegate<
      import("@prisma/client/runtime/library").DefaultArgs
    >,
    "createMany" | "fields"
  >;
  hvacObject: Omit<
    Prisma.HvacObjectDelegate<
      import("@prisma/client/runtime/library").DefaultArgs
    >,
    "createMany" | "fields"
  >;
  hvacObjectLib: Omit<
    Prisma.HvacObjectLibDelegate<
      import("@prisma/client/runtime/library").DefaultArgs
    >,
    "createMany" | "fields"
  >;
  t3App: Omit<
    Prisma.T3AppDelegate<import("@prisma/client/runtime/library").DefaultArgs>,
    "createMany" | "fields"
  >;
  input: Omit<
    Prisma.InputDelegate<import("@prisma/client/runtime/library").DefaultArgs>,
    "createMany" | "fields"
  >;
  output: Omit<
    Prisma.OutputDelegate<import("@prisma/client/runtime/library").DefaultArgs>,
    "createMany" | "fields"
  >;
  variable: Omit<
    Prisma.VariableDelegate<
      import("@prisma/client/runtime/library").DefaultArgs
    >,
    "createMany" | "fields"
  >;
  program: Omit<
    Prisma.ProgramDelegate<
      import("@prisma/client/runtime/library").DefaultArgs
    >,
    "createMany" | "fields"
  >;
  pid: Omit<
    Prisma.PidDelegate<import("@prisma/client/runtime/library").DefaultArgs>,
    "createMany" | "fields"
  >;
  graphic: Omit<
    Prisma.GraphicDelegate<
      import("@prisma/client/runtime/library").DefaultArgs
    >,
    "createMany" | "fields"
  >;
  schedule: Omit<
    Prisma.ScheduleDelegate<
      import("@prisma/client/runtime/library").DefaultArgs
    >,
    "createMany" | "fields"
  >;
  holiday: Omit<
    Prisma.HolidayDelegate<
      import("@prisma/client/runtime/library").DefaultArgs
    >,
    "createMany" | "fields"
  >;
};
export default bridg;
