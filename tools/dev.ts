import { normalize as normalizePath } from 'node:path';

import { buildConfig } from '../addon-config.js';
import { Debounce } from '../src/lib/external/Algorithm/Debounce.js';
import { Watch } from '../src/lib/external/Platform/Cxx/Watch.js';
import { getBaseToPathsMap } from './lib/AddonConfig.js';

const toCopy = getBaseToPathsMap(buildConfig.copy);
const watchSet = new Set<string>();
for (const [base, paths] of toCopy) {
  for (const path of paths) {
    watchSet.add(normalizePath(`./${base}/${path}`));
  }
}

const runBuild = Debounce(async () => {
  const cmd = 'bun run build';
  console.log(`[${new Date().toLocaleTimeString()}] > ${cmd}`);
  Bun.spawnSync(cmd.split(' '));
}, 250);

try {
  await Watch({
    path: '.',
    debounce_interval: 250,
    change_cb: (changes) => {
      for (const change of changes) {
        if (change[0] === 'S' || watchSet.has(change.slice(2))) {
          runBuild();
        }
      }
    },
    error_cb: (error) => {
      console.error('ERROR:', error);
    },
  });
} catch (error) {
  console.error(error);
}
