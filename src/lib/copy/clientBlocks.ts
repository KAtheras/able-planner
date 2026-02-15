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
  const copyValue = args.copy as any;
  const clientConfigValue = args.clientConfig as any;
  const lang =
    String(copyValue?.metadata?.language ?? copyValue?.meta?.language ?? "en") as "en" | "es";
  const block: BlockCopyEntry | undefined = copyValue?.blocks?.[args.slot];
  if (!block) return "";

  const clientValue = clientConfigValue?.clientBlocks?.[args.slot]?.[lang];
  if (typeof clientValue === "string" && clientValue.trim()) {
    return clientValue;
  }

  return block.default ?? "";
}
