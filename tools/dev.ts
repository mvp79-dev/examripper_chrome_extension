import { buildConfig } from '../addon-config.js';

import { Debounce } from '../src/lib/external/Algorithm/Debounce.js';
import { GlobManager } from '../src/lib/external/Platform/Bun/Path.js';
import { Run } from '../src/lib/external/Platform/Bun/Process.js';
import { Watcher } from '../src/lib/external/Platform/Node/Watch.js';

const toCopy = new GlobManager();
for (const [basedir, patterns] of Object.entries(buildConfig.copy)) {
  for (const pattern of patterns) {
    toCopy.scan(basedir, pattern);
  }
}
const watchSet = new Set(toCopy.paths);

const runBuild = Debounce(async () => {
  await Run('bun run build');
}, 250);

runBuild();

try {
  const watcher = new Watcher('./', 250);
  watcher.observe((events) => {
    for (const event of events) {
      if (event.filename && watchSet.has(event.filename)) {
        runBuild();
        break;
      }
    }
  });
  await watcher.done;
} catch (error) {
  console.log(error);
}
