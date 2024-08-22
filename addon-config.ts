import type { AddonBuildConfig } from './tools/lib/AddonConfig.js';

export const buildConfig: AddonBuildConfig = {
  browsers: ['Chrome', 'Firefox'],
  bundle: {
    src: [
      'content_scripts/**/*', //
      'popup/**/*',
      'web_accessible_resources/**/*',
      'background.ts',
    ],
  },
  copy: {
    '/': [
      'LICENSE', //
      'icons/*.png',
      'icons/*.svg',
    ],
    src: ['**/*'],
  },
  exclude: {
    src: ['lib/**/*'],
  },
};
