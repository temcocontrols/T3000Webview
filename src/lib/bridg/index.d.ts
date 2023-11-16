import { Prisma } from "@prisma/client";
export declare const exec: ({
  model,
  args,
  func,
}: {
  model: string;
  args?: {};
  func: string;
}) => Promise<any>;
type BridgModel<PrismaDelegate> = Omit<PrismaDelegate, "createMany" | "fields">;
declare const bridg: {
  user: BridgModel<
    Prisma.UserDelegate<import("@prisma/client/runtime/library").DefaultArgs>
  >;
  file: BridgModel<
    Prisma.FileDelegate<import("@prisma/client/runtime/library").DefaultArgs>
  >;
  hvacObject: BridgModel<
    Prisma.HvacObjectDelegate<
      import("@prisma/client/runtime/library").DefaultArgs
    >
  >;
};
export default bridg;
