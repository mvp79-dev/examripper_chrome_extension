import { normalize as normalizePath } from 'node:path';

export interface AddonBuildConfig {
  browsers: string[];
  bundle: Record<string, string[]>;
  copy: Record<string, string[]>;
  exclude: Record<string, string[]>;
}

export function getBaseToPathsMap(
  baseToPatternsMap: Record<string, string[]>,
  transformers?: {
    transformPattern?: (pattern: string) => string | undefined | void;
    transformPath?: (base: string, path: string) => string | undefined | void;
  },
) {
  const baseMap = new Map<string, Set<string>>();
  for (const [base, patterns] of Object.entries(baseToPatternsMap)) {
    const normalized_base = normalizePath('./' + base);
    const pathSet = new Set<string>();
    for (const pattern of patterns //
      .map((_) => (transformers?.transformPattern ? transformers?.transformPattern(_) : _))
      .filter((_) => _ !== undefined)) {
      for (const path of Array.from(new Bun.Glob(pattern).scanSync(normalized_base)) //
        .map((_) => (transformers?.transformPath ? transformers?.transformPath(base, _) : _))
        .filter((_) => _ !== undefined)) {
        pathSet.add(path);
      }
    }
    baseMap.set(base, pathSet);
  }
  return baseMap;
}
