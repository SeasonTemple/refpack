import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import { downloadTemplate } from "giget";
import type { SourceDescriptor, SourceProvider, SourceResolution } from "./provider.js";

const REMOTE_PREFIX = /^(gh|github|gitlab|bitbucket|sourcehut|git|http|https):/i;

export class GigetSourceProvider implements SourceProvider {
  canResolve(input: SourceDescriptor): boolean {
    if (input.artifactType) return false;
    return REMOTE_PREFIX.test(input.source) || /^[\w.-]+\/[\w.-]+(#.+)?$/.test(input.source);
  }

  async resolve(input: SourceDescriptor): Promise<SourceResolution> {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "skills-pack-"));
    const result = await downloadTemplate(input.source, {
      dir: tmp,
      registry: false,
      force: true,
      forceClean: true,
      install: false
    });

    return {
      dir: result.dir,
      source: input.source,
      manifestPath: input.manifestPath,
      ref: input.source.includes("#") ? input.source.split("#").at(-1) : undefined,
      cleanup: async () => {
        await fs.remove(tmp);
      }
    };
  }
}
