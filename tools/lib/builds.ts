import { buildConfig } from '../../addon-config.js';
import { Config, GetSemanticVersion, type POJO } from '../../src/lib/external/Platform/Browser/Extension/Config.js';
import { CopyFile } from '../../src/lib/external/Platform/Bun/Fs.js';
import { DeleteDirectory } from '../../src/lib/external/Platform/Node/Fs.js';
import { NormalizePath } from '../../src/lib/external/Platform/Node/Path.js';
import { JobQueue } from '../../src/lib/external/Utility/JobQueue.js';

export async function build(buildDir: string = './build', toCopy: Map<string, Set<string>>) {
  // Init
  await DeleteDirectory(NormalizePath(buildDir));

  // Build
  const manifest = {
    core: await Config.readConfig(NormalizePath('./manifest.json')),
    build: await Config.readConfig(NormalizePath('./manifest-build.json')),
  };
  manifest.core.set('version', await GetSemanticVersion(NormalizePath('./version.json')));
  const failedCopies = new Set<string>();
  const jobQueue = new JobQueue<void, string>(0);
  for (const browser of buildConfig.browsers) {
    jobQueue.add(async function () {
      // Init
      const buildManifest = Config.mergeConfigs(manifest.core, new Config(manifest.build.get(browser) as POJO));
      await Bun.write(NormalizePath(`./${buildDir}/${browser}/manifest.json`), buildManifest.toJSON());
      // Copy
      for (const [base, pathSet] of toCopy) {
        for (const path of pathSet) {
          try {
            await CopyFile({
              from: NormalizePath(`./${base}/${path}`),
              to: NormalizePath(`./${buildDir}/${browser}/${path}`),
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
  if (failedCopies.size > 0) {
    console.log();
    console.error('Missing Files');
    for (const path of failedCopies) {
      console.log(path);
    }
  }
}
