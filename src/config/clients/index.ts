import defaultClient from "./default.json";
import ilClient from "./il.json";
import txClient from "./tx.json";
import utClient from "./ut.json";

export const CLIENTS = {
  default: defaultClient,
  ut: utClient,
  il: ilClient,
  tx: txClient,
} as const;

export type ClientId = keyof typeof CLIENTS;
export type ClientConfig = (typeof CLIENTS)["default"];

export function normalizeClientId(raw?: string | null): ClientId {
  const value = (raw ?? "").trim().toLowerCase();
  if (value in CLIENTS) return value as ClientId;
  return "default";
}

export function getClientConfig(raw?: string | null): ClientConfig {
  return CLIENTS[normalizeClientId(raw)];
}