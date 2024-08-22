import { normalize as normalizePath } from 'node:path';

import { buildConfig } from '../../addon-config.js';
import { Config, GetSemanticVersion, type POJO } from '../../src/lib/ericchase/Platform/Browser/Extension/Config.js';
import { CopyFile } from '../../src/lib/ericchase/Platform/Bun/Fs.js';
import { DeleteDirectory } from '../../src/lib/ericchase/Platform/Node/Fs.js';
import { JobQueue } from '../../src/lib/ericchase/Utility/JobQueue.js';

export async function build(buildDir: string = './build', toCopy: Map<string, Set<string>>) {
  // Init
  await DeleteDirectory(normalizePath(buildDir));

  // Build
  const manifest = {
    core: await Config.readConfig(normalizePath('./manifest.json')),
    build: await Config.readConfig(normalizePath('./manifest-build.json')),
  };
  manifest.core.set('version', await GetSemanticVersion(normalizePath('./version.json')));
  const failedCopies = new Set<string>();
  const jobQueue = new JobQueue<void, string>(0);
  for (const browser of buildConfig.browsers) {
    jobQueue.add(async function () {
      // Init
      const buildManifest = Config.mergeConfigs(manifest.core, new Config(manifest.build.get(browser) as POJO));
      await Bun.write(normalizePath(`./${buildDir}/${browser}/manifest.json`), buildManifest.toJSON());
      // Copy
      for (const [base, pathSet] of toCopy) {
        for (const path of pathSet) {
          try {
            await CopyFile({
              from: normalizePath(`./${base}/${path}`),
              to: normalizePath(`./${buildDir}/${browser}/${path}`),
            });
          } catch (error) {
            failedCopies.add(path);
          }
        }
      }
    }, browser);
  }
  await new Promise<void>((resolve) => {
    jobQueue.subscribe((_, error, tag) => {
      if (error) {
        console.error();
        console.error('ERROR');
        console.error('Browser:', tag);
        console.error(error);
      }
      if (jobQueue.done) resolve();
    });
  });
  for (const path of failedCopies) {
    console.error(`missing: ${path}`);
  }
}
