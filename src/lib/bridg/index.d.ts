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
};
export default bridg;
