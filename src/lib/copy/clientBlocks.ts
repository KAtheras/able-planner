export type BlockSlot =
  | "landingWelcome"
  | "disclosuresAssumptions"
  | "rightCardPrimary"
  | "rightCardSecondary";

export type BlockCopyEntry = {
  default: string;
  byState?: Record<string, string>;
  byClient?: Record<string, string>;
};

export function getClientBlockText(args: {
  slot: BlockSlot;
  copy: unknown;
  clientConfig: unknown;
  planState: string;
}): string {
  const lang =
    String(args.copy?.metadata?.language ?? args.copy?.meta?.language ?? "en") as "en" | "es";
  const block: BlockCopyEntry | undefined = args.copy?.blocks?.[args.slot];
  if (!block) return "";

  const clientValue = args.clientConfig?.clientBlocks?.[args.slot]?.[lang];
  if (typeof clientValue === "string" && clientValue.trim()) {
    return clientValue;
  }

  return block.default ?? "";
}
