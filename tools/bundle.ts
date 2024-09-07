import { buildConfig } from '../addon-config.js';
import { ToSnakeCase } from '../src/lib/external/Algorithm/String/Convert/Case.js';
import { Config, GetSemanticVersion, type POJO } from '../src/lib/external/Platform/Browser/Extension/Config.js';
import { CopyFile } from '../src/lib/external/Platform/Bun/Fs.js';
import { DeleteDirectory } from '../src/lib/external/Platform/Node/Fs.js';
import { NormalizePath } from '../src/lib/external/Platform/Node/Path.js';
import { JobQueue } from '../src/lib/external/Utility/JobQueue.js';
import { build } from './lib/builds.js';
import { compile } from './lib/compile.js';

// Command Line Arguments
const [, , ...args] = Bun.argv;

// User Values
const buildDir = './build';
const bundleDir = './release';
const tempDir = './temp';
const scriptExtensions = ['.ts', '.tsx'];

// Compile
const toCopy = await compile(tempDir, scriptExtensions, 'none', false);

// Build
await build(buildDir, toCopy);

// Copy
const manifest = {
  core: await Config.readConfig(NormalizePath('./manifest.json')),
  build: await Config.readConfig(NormalizePath('./manifest-build.json')),
  bundle: args.includes('--dry') ? new Config({}) : await Config.readConfig(NormalizePath('./manifest-bundle.json')),
};
manifest.core.set('version', await GetSemanticVersion(NormalizePath('./version.json')));

const jobQueue = new JobQueue<void, string>(0);
for (const browser of buildConfig.browsers) {
  jobQueue.add(async function () {
    // Init
    const buildManifest = Config.mergeConfigs(manifest.core, new Config(manifest.build.get(browser) as POJO));
    const bundleManifest = Config.mergeConfigs(buildManifest, new Config(manifest.bundle.get(browser) as POJO));
    await Bun.write(NormalizePath(`./${buildDir}/${browser}/manifest.json`), bundleManifest.toJSON());
    // Archive
    const archiveName = SanitizeFilePath(`${ToSnakeCase(bundleManifest.get('name') as string)}-v${bundleManifest.get('version')}.zip`);
    const archivePath = NormalizePath(`./${tempDir}/${browser}/${archiveName}`);
    const globPattern = NormalizePath(`./${buildDir}/${browser}/*`);
    Bun.spawnSync(['7z', 'a', '-tzip', './' + archivePath, './' + globPattern]); // the ./ is needed here. something to do with how 7z determins pathing
    await CopyFile({ from: archivePath, to: NormalizePath(`./${bundleDir}/${browser}/${archiveName}`) });
    // Cleanup
    await Bun.write(NormalizePath(`./${buildDir}/${browser}/manifest.json`), buildManifest.toJSON());
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

// Cleanup
await DeleteDirectory(NormalizePath(tempDir));

function SanitizeFilePath(path: string) {
  return path.replace(/[^a-z0-9\.\_\-]/gi, '_').toLowerCase();
}
