import pc from "picocolors";

export const color = pc;

export function formatList(values: string[]): string {
  return values.length === 0 ? "none" : values.join(", ");
}
