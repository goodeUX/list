const fs = require('fs');
const path = require('path');

function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    return;
  }

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separator = trimmed.indexOf('=');
    if (separator === -1) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnvFile();

function getWebHost() {
  const configured = process.env.EXPO_PUBLIC_APP_WEB_URL?.trim();
  if (configured) {
    try {
      return new URL(configured).hostname;
    } catch {
      // fall through
    }
  }

  const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  if (projectId) {
    return `${projectId}.web.app`;
  }

  return null;
}

const host = getWebHost();
const iosTeamId = process.env.EXPO_PUBLIC_IOS_TEAM_ID?.trim();
const iosBundleId = process.env.EXPO_PUBLIC_IOS_BUNDLE_ID?.trim() || 'com.geo_goo.list';
const androidPackage =
  process.env.EXPO_PUBLIC_ANDROID_PACKAGE?.trim() || 'com.goode_company.listkitty';
const androidSha256 = process.env.EXPO_PUBLIC_ANDROID_SHA256_CERT?.trim();

const outputDir = path.join(__dirname, '..', 'public', '.well-known');
fs.mkdirSync(outputDir, { recursive: true });

if (host && iosTeamId) {
  const aasa = {
    applinks: {
      apps: [],
      details: [
        {
          appIDs: [`${iosTeamId}.${iosBundleId}`],
          components: [{ '/': '/join/*' }],
        },
      ],
    },
  };

  fs.writeFileSync(
    path.join(outputDir, 'apple-app-site-association'),
    JSON.stringify(aasa),
  );
  console.log(`Wrote apple-app-site-association for ${host}`);
} else {
  console.warn(
    'Skipping apple-app-site-association (set EXPO_PUBLIC_IOS_TEAM_ID and web host env vars).',
  );
}

if (host && androidSha256) {
  const assetlinks = [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: androidPackage,
        sha256_cert_fingerprints: [androidSha256],
      },
    },
  ];

  fs.writeFileSync(path.join(outputDir, 'assetlinks.json'), JSON.stringify(assetlinks));
  console.log(`Wrote assetlinks.json for ${host}`);
} else {
  console.warn(
    'Skipping assetlinks.json (set EXPO_PUBLIC_ANDROID_SHA256_CERT and web host env vars).',
  );
}
