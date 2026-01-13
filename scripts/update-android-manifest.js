const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, '../android/app/src/main/AndroidManifest.xml');

if (!fs.existsSync(manifestPath)) {
  console.error('Error: AndroidManifest.xml not found. Run "npx cap add android" first.');
  process.exit(1);
}

let content = fs.readFileSync(manifestPath, 'utf8');

// List of all permissions this app needs
const permissionsToAdd = [
  // Audio
  '<uses-permission android:name="android.permission.RECORD_AUDIO" />',
  '<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />',
  '<uses-permission android:name="android.permission.READ_MEDIA_AUDIO" />',
  // Storage
  '<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />',
  '<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />',
  // Bluetooth / Location (Required for BLE MIDI)
  '<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />',
  '<uses-permission android:name="android.permission.BLUETOOTH_SCAN" android:usesPermissionFlags="neverForLocation" />',
  '<uses-permission android:name="android.permission.BLUETOOTH" />',
  '<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />',
  '<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />',
  '<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />',
  // Features
  '<uses-feature android:name="android.software.midi" android:required="true"/>',
  // Internet (Usually default, but good to ensure)
  '<uses-permission android:name="android.permission.INTERNET" />'
];

// Filter out permissions that already exist in the file
const missingPermissions = permissionsToAdd.filter(p => {
    // Extract the name attribute (e.g. "android.permission.RECORD_AUDIO")
    const match = p.match(/android:name="([^"]+)"/);
    if (match && match[1]) {
        return !content.includes(match[1]);
    }
    // For features or other tags without android:name in the same way (fallback)
    return !content.includes(p);
});

if (missingPermissions.length === 0) {
    console.log('✅ AndroidManifest.xml is already up to date.');
} else {
    const injectionBlock = `
    <!-- INJECTED PERMISSIONS -->
    ${missingPermissions.join('\n    ')}
    `;
    
    // Inject before <application> tag
    if (content.includes('<application')) {
        content = content.replace('<application', `${injectionBlock}\n    <application`);
        fs.writeFileSync(manifestPath, content, 'utf8');
        console.log(`✅ Injected ${missingPermissions.length} missing permissions into AndroidManifest.xml`);
    } else {
        console.error('❌ Could not find <application> tag to inject permissions.');
    }
}