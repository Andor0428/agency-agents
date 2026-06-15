import 'dotenv/config';
import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Stock Take',
  slug: 'stock-take-app',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  scheme: 'stocktake',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.stocktake.app',
    infoPlist: {
      NSMicrophoneUsageDescription:
        'Stock Take needs microphone access for voice-driven inventory counting.',
      NSCameraUsageDescription:
        'Stock Take needs camera access to scan product barcodes and SKUs.',
    },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#0D1117',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    package: 'com.stocktake.app',
    permissions: ['RECORD_AUDIO', 'CAMERA'],
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: './assets/favicon.png',
    bundler: 'metro',
  },
  plugins: [
    'expo-router',
    'expo-sqlite',
    'expo-audio',
    'expo-secure-store',
    'expo-document-picker',
    [
      'expo-camera',
      {
        cameraPermission: 'Allow Stock Take to scan barcodes for inventory lookup.',
        microphonePermission: false,
        recordAudioAndroid: false,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    groqApiKey: process.env.GROQ_API_KEY ?? '',
    openaiApiKey: process.env.OPENAI_API_KEY ?? '',
    googleSheetsApiKey: process.env.GOOGLE_SHEETS_API_KEY ?? '',
    googleSheetsSpreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID ?? '',
    googleSheetsSheetName: process.env.GOOGLE_SHEETS_SHEET_NAME ?? 'Inventory',
    microsoftGraphClientId: process.env.MICROSOFT_GRAPH_CLIENT_ID ?? '',
    confidenceThreshold: Number(process.env.CONFIDENCE_THRESHOLD ?? '80'),
    supportApiUrl: process.env.SUPPORT_API_URL ?? '',
    googleOAuthWebClientId: process.env.GOOGLE_OAUTH_WEB_CLIENT_ID ?? '',
    googleOAuthIosClientId: process.env.GOOGLE_OAUTH_IOS_CLIENT_ID ?? '',
    googleOAuthAndroidClientId: process.env.GOOGLE_OAUTH_ANDROID_CLIENT_ID ?? '',
    eas: {
      projectId: process.env.EAS_PROJECT_ID,
    },
  },
});
