import { buildConfig } from '../../addon-config.js';
import { DeleteDirectory } from '../../src/lib/external/Platform/Node/Fs.js';
import { NormalizePath, ParsePath } from '../../src/lib/external/Platform/Node/Path.js';
import { getBaseToPathsMap } from './AddonConfig.js';

function addReplaceExtension(path: string, matchExtList: string[], newExt: string) {
  const { ext } = ParsePath(path);
  if (ext === '' || matchExtList.includes(ParsePath(path).ext) === true) {
    return path.slice(0, path.length - ext.length) + newExt;
  }
}

export async function compile(tempDir: string = './temp', scriptExtensions = ['.ts'], sourcemap: Parameters<typeof Bun.build>[0]['sourcemap'] = 'inline', debug = true) {
  // Process
  const toBundle = getBaseToPathsMap(buildConfig.bundle, {
    transformPattern: (pattern) => {
      return addReplaceExtension(pattern, scriptExtensions, `{${scriptExtensions.join(',')}}`);
    },
  });
  const toCopy = getBaseToPathsMap(buildConfig.copy, {
    transformPath: (_, path) => {
      if (scriptExtensions.includes(ParsePath(path).ext) === false) {
        return path;
      }
    },
  });
  const toExclude = getBaseToPathsMap(buildConfig.exclude);
  for (const [base, pathSet] of toExclude) {
    for (const path of pathSet) {
      toCopy.get(base)?.delete(path);
    }
  }

  // Init
  await DeleteDirectory(tempDir);

  // Compile
  for (const [base, pathSet] of toBundle) {
    if (base !== '' && pathSet.size > 0) {
      const tempBase = NormalizePath(`./${tempDir}/${base}`);
      const tempPathSet = new Set<string>();
      for (const path of pathSet) {
        const tempPath = addReplaceExtension(path, scriptExtensions, '.js');
        if (tempPath) {
          tempPathSet.add(tempPath);
          const { outputs, success, logs } = await Bun.build({
            entrypoints: [NormalizePath(`./${base}/${path}`)],
            minify: false,
            sourcemap,
            splitting: false,
            target: 'browser',
            define: { 'Bun.env.DEBUG': JSON.stringify(debug ? 'true' : 'false') },
          });
          if (success) {
            await Bun.write(NormalizePath(`./${tempBase}/${tempPath}`), `(function () {\n${await outputs[0].text()}})();`);
          } else {
            console.log();
            console.error(`Compiler error in "${NormalizePath(`./${base}/${path}`)}"`);
            console.log('Details below.\n');
            for (const message of logs) {
              console.error(message);
            }
          }
        }
      }
      toCopy.set(tempBase, tempPathSet);
    }
  }
  return toCopy;
}
