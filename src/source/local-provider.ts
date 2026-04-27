import path from "node:path";
import fs from "fs-extra";
import type { SourceDescriptor, SourceProvider, SourceResolution } from "./provider.js";

export class LocalSourceProvider implements SourceProvider {
  async canResolve(input: SourceDescriptor): Promise<boolean> {
    if (input.artifactType) return false;
    return fs.pathExists(path.resolve(input.source));
  }

  async resolve(input: SourceDescriptor): Promise<SourceResolution> {
    return {
      dir: path.resolve(input.source),
      source: path.resolve(input.source),
      manifestPath: input.manifestPath
    };
  }
}
