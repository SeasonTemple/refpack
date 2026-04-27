import { UserError } from "../errors/user-error.js";

export interface SourceResolution {
  dir: string;
  source: string;
  ref?: string;
  manifestPath?: string;
  cleanup?: () => Promise<void>;
}

export interface SourceDescriptor {
  source: string;
  manifestPath?: string;
  artifactType?: "tgz";
  integrity?: string;
  sizeBytes?: number;
}

export interface SourceProvider {
  canResolve(source: SourceDescriptor): Promise<boolean> | boolean;
  resolve(source: SourceDescriptor): Promise<SourceResolution>;
}

export class SourceResolver {
  constructor(private readonly providers: SourceProvider[]) {}

  async resolve(input: string | SourceDescriptor): Promise<SourceResolution> {
    const source = toSourceDescriptor(input);
    for (const provider of this.providers) {
      if (await provider.canResolve(source)) {
        return provider.resolve(source);
      }
    }

    throw new UserError(`Unsupported source: ${source.source}`, "UNSUPPORTED_SOURCE");
  }
}

export function toSourceDescriptor(input: string | SourceDescriptor): SourceDescriptor {
  return typeof input === "string" ? { source: input } : input;
}
