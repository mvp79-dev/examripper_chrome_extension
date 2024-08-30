import { DeleteDirectory } from '../src/lib/external/Platform/Node/Fs.js';
import { NormalizePath } from '../src/lib/external/Platform/Node/Path.js';
import { build } from './lib/builds.js';
import { compile } from './lib/compile.js';

// User Values
const buildDir = './build';
const tempDir = './temp';
const scriptExtensions = ['.ts'];

// Compile
const toCopy = await compile(tempDir, scriptExtensions);

// Build
await build(buildDir, toCopy);

// Cleanup
await DeleteDirectory(NormalizePath(tempDir));
