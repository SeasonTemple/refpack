import { loadConfig } from "../config.js";
import { color } from "../ui/theme.js";

export async function runInfo(): Promise<void> {
  const config = await loadConfig();
  console.log(color.bold("skills installer"));
  console.log(`target: ${config.target ?? "(not configured)"}`);
  console.log(`registry: ${config.registry ?? "(not configured)"}`);
}
