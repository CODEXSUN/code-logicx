# CodeLogicX Mobile

This Ionic React and Capacitor application provides mobile-owned CodeLogicX pages backed by the CodeLogicX API.

Set `VITE_MOBILE_API_URL` to the deployed HTTPS API origin. For the Android emulator, use `http://127.0.0.1:9150` with an ADB reverse tunnel.

```powershell
$env:VITE_MOBILE_API_URL = "https://your-codelogicx-cloud.example"
npm.cmd run mobile:apk:debug
```

The app exposes mobile-native Home, Ideas, Projects, Tasks, and Messages pages. Authentication and data remain owned by the CodeLogicX API.
