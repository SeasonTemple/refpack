export interface InstalledFile {
  path: string;
  sha256: string;
  sizeBytes: number;
}

export interface InstalledArtifact {
  type?: "tgz";
  integrity?: string;
  sizeBytes?: number;
}

export interface InstalledSkill {
  id: string;
  target: string;
  source: string;
  registryId?: string;
  version?: string;
  manifestPath?: string;
  agent?: string;
  installedAt: string;
  artifact?: InstalledArtifact;
  files: InstalledFile[];
}

export interface InstalledState {
  schemaVersion: "1.0";
  installed: InstalledSkill[];
}

