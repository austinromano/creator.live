import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.osho.app',
  appName: 'OSHO',
  webDir: 'out',
  server: {
    url: 'https://creator-daf98zaqo-austinromanos-projects.vercel.app',
    cleartext: true
  }
};

export default config;
