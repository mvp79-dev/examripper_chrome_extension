import { normalize as normalizePath } from 'node:path';

import { DeleteDirectory } from '../src/lib/external/Platform/Node/Fs.js';
import { build } from './lib/builds.js';
import { compile } from './lib/compile.js';

// User Values
const buildDir = './build';
const tempDir = './temp';
const scriptExtensions = ['.ts', '.tsx'];

// Compile
const toCopy = await compile(tempDir, scriptExtensions);

// Build
await build(buildDir, toCopy);

// Cleanup
await DeleteDirectory(normalizePath(tempDir));
