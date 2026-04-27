import path from "node:path";
import fs from "fs-extra";
import type { SourceProvider, SourceResolution } from "./provider.js";

export class LocalSourceProvider implements SourceProvider {
  async canResolve(source: string): Promise<boolean> {
    return fs.pathExists(path.resolve(source));
  }

  async resolve(source: string): Promise<SourceResolution> {
    return {
      dir: path.resolve(source),
      source: path.resolve(source)
    };
  }
}
