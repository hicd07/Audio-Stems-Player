const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Helper for delays
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
    // Paths
    const projectRoot = path.resolve(__dirname, '..');
    const androidDir = path.join(projectRoot, 'android');
    const isWindows = os.platform() === 'win32';
    const wrapperName = isWindows ? 'gradlew.bat' : 'gradlew';
    const wrapperPath = path.join(androidDir, wrapperName);

    console.log('🚀 Starting APK Build Process...');

    try {
        // 1. Build Web Assets
        console.log('\n📦 [1/4] Building Web Assets (Vite)...');
        execSync('npm run build', { stdio: 'inherit', cwd: projectRoot });

        // 2. Validate & Sync Android
        console.log('\n🔄 [2/4] Syncing Capacitor with Android...');

        let androidExists = fs.existsSync(androidDir);

        // Check for "Zombie" state (folder exists but missing gradlew)
        if (androidExists && !fs.existsSync(wrapperPath)) {
            console.log('⚠️  Detected corrupted Android folder (missing ' + wrapperName + ').');
            console.log('   Attempting to repair by deleting and recreating...');

            try {
                // Force delete the corrupt folder
                fs.rmSync(androidDir, { recursive: true, force: true });
                console.log('   Deleted corrupt folder.');
                
                // Crucial delay for Windows file system to catch up
                await wait(2000); 
                androidExists = false;
            } catch (e) {
                console.error('❌ Could not auto-delete corrupt "android" folder.');
                console.error('👉 Please manually delete the "android" folder and run this command again.');
                process.exit(1);
            }
        }

        if (!androidExists) {
            console.log('   (Initializing Android platform...)');
            // npx cap add android
            execSync('npx cap add android', { stdio: 'inherit', cwd: projectRoot });
        } else {
            // npx cap sync android
            execSync('npx cap sync android', { stdio: 'inherit', cwd: projectRoot });
        }

        // 2.5 Ensure Permissions
        console.log('   (Ensuring Android permissions...)');
        execSync('node scripts/update-android-manifest.js', { stdio: 'inherit', cwd: projectRoot });

        // 3. Verify Gradle Wrapper (Double check)
        if (!fs.existsSync(wrapperPath)) {
            console.error('\n❌ CRITICAL ERROR: Gradle wrapper still not found at:');
            console.error('   ' + wrapperPath);
            console.error('\nPossible solutions:');
            console.error('1. Delete the "android" folder manually.');
            console.error('2. Run "npm install @capacitor/android" to ensure dependencies are installed.');
            console.error('3. Check your write permissions in this folder.');
            process.exit(1);
        }

        // 4. Build APK
        console.log('\n🏗️  [3/4] Compiling APK with Gradle (this may take a while)...');

        const buildCommand = isWindows ? '.\\gradlew.bat' : './gradlew';
        const build = spawn(buildCommand, ['assembleDebug'], {
            cwd: androidDir,
            stdio: 'inherit',
            shell: true
        });

        build.on('close', (code) => {
            if (code === 0) {
                console.log('\n✅ [4/4] APK Build Successful!');
                const apkPath = path.join(androidDir, 'app/build/outputs/apk/debug/app-debug.apk');
                console.log(`📂 APK Location: ${apkPath}`);
                console.log('👉 Transfer this file to your Android device to install.');
            } else {
                console.error(`\n❌ Gradle Build failed with exit code ${code}`);
                process.exit(code);
            }
        });

    } catch (error) {
        console.error('\n❌ Build Script Error:', error.message);
        process.exit(1);
    }
})();
