export type SkillHubArtifactType = "tgz";

export interface SkillHubCatalogVersion {
  version: string;
  artifactPath: string;
  artifactType: SkillHubArtifactType;
  integrity: string;
  sizeBytes: number;
  manifestPath?: string;
  reviewStatus?: "unreviewed" | "verified" | "rejected";
  publishedAt?: string;
}

export interface SkillHubCatalogSkill {
  id: string;
  name: string;
  description: string;
  latestVersion: string;
  versions: SkillHubCatalogVersion[];
  tags?: string[];
  adapters?: string[];
}

export interface SkillHubCatalog {
  schemaVersion: string;
  name: string;
  skills: SkillHubCatalogSkill[];
}
