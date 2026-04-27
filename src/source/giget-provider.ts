import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import { downloadTemplate } from "giget";
import type { SourceProvider, SourceResolution } from "./provider.js";

const REMOTE_PREFIX = /^(gh|github|gitlab|bitbucket|sourcehut|git|http|https):/i;

export class GigetSourceProvider implements SourceProvider {
  canResolve(source: string): boolean {
    return REMOTE_PREFIX.test(source) || /^[\w.-]+\/[\w.-]+(#.+)?$/.test(source);
  }

  async resolve(source: string): Promise<SourceResolution> {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "skills-pack-"));
    const result = await downloadTemplate(source, {
      dir: tmp,
      registry: false,
      force: true,
      forceClean: true,
      install: false
    });

    return {
      dir: result.dir,
      source,
      ref: source.includes("#") ? source.split("#").at(-1) : undefined,
      cleanup: async () => {
        await fs.remove(tmp);
      }
    };
  }
}
