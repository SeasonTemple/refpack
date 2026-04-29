import { findRegistryEntry, readRegistry } from "../registry/client.js";
import type { InstalledSkill } from "../state/types.js";

export type OutdatedStatus = "current" | "outdated" | "unknown-version" | "missing-source" | "unmanaged";

export interface OutdatedResult {
  id: string;
  status: OutdatedStatus;
  installedVersion?: string;
  latestVersion?: string;
  source?: string;
}

export async function checkOutdated(installed: InstalledSkill[], registryRef: string): Promise<OutdatedResult[]> {
  const registry = await readRegistry(registryRef);

  return installed.map((skill) => {
    const registryId = skill.registryId ?? skill.id;
    try {
      const latest = findRegistryEntry(registry, registryId);
      if (!skill.version || !latest.version) {
        return {
          id: skill.id,
          status: "unknown-version",
          installedVersion: skill.version,
          latestVersion: latest.version,
          source: latest.source
        };
      }
      return {
        id: skill.id,
        status: skill.version === latest.version ? "current" : "outdated",
        installedVersion: skill.version,
        latestVersion: latest.version,
        source: latest.source
      };
    } catch {
      return {
        id: skill.id,
        status: "missing-source",
        installedVersion: skill.version
      };
    }
  });
}

