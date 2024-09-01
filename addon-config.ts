import type { AddonBuildConfig } from './tools/lib/AddonConfig.js';

export const buildConfig: AddonBuildConfig = {
  browsers: ['Chrome', 'Firefox'],
  bundle: {
    src: [
      'content_scripts/**/*', //
      'popup/**/*',
      'web_accessible_resources/**/*',
      'background.ts',
      'components/*',
      'index.tsx'
    ],
  },
  copy: {
    '/': [
      'LICENSE', //
      'icons/*.png',
      'icons/*.svg',
      'public/*',
    ],
    src: ['**/*'],
  },
  exclude: {
    src: ['lib/**/*'],
  },
};
