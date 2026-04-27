export interface RegistryEntry {
  id: string;
  name: string;
  description: string;
  source: string;
  manifestPath?: string;
  tags?: string[];
  adapters?: string[];
  version?: string;
  artifactType?: "tgz";
  integrity?: string;
  sizeBytes?: number;
}

export interface SkillsRegistry {
  schemaVersion: string;
  name: string;
  skills: RegistryEntry[];
}
