# App Icon Update Instructions

## Overview
You need to update the app icons with the following images:
- **iOS Icon**: https://res.cloudinary.com/dxekd0dw3/image/upload/v1760656344/appstore_ibspdz.png
- **Android Icon**: https://res.cloudinary.com/dxekd0dw3/image/upload/v1760656342/playstore_hccbhx.png

## Important Note
⚠️ **Binary files (images) cannot be directly updated through Rork's text-based interface.**

You must manually download and replace the icons outside of this environment.

## Step-by-Step Instructions

### 1. Download the New Icons

Download both images from the URLs above:
- iOS: `appstore_ibspdz.png` 
- Android: `playstore_hccbhx.png`

### 2. Prepare Icon Sizes

You'll need to create multiple sizes for each platform:

#### iOS Requirements (`assets/images/icon.png`)
- **1024x1024px** - App Store icon

The icon should be:
- PNG format
- RGB color space (no alpha channel)
- No rounded corners (iOS adds them automatically)

#### Android Requirements (`assets/images/adaptive-icon.png`)
- **1024x1024px** - Adaptive icon foreground

The icon should be:
- PNG format with transparency
- The safe zone for content is a 768x768px circle in the center
- Content outside this circle may be cropped

### 3. Replace Icon Files

Replace the following files in your project:

```
assets/images/icon.png              # iOS app icon (1024x1024)
assets/images/adaptive-icon.png     # Android adaptive icon foreground (1024x1024)  
assets/images/splash-icon.png       # Splash screen icon (1200x1200 recommended)
assets/images/favicon.png           # Web favicon (48x48 or larger)
```

### 4. Update app.json Configuration

The current `app.json` already has the correct paths configured:

```json
{
  "expo": {
    "icon": "./assets/images/icon.png",
    "splash": {
      "image": "./assets/images/splash-icon.png"
    },
    "ios": {
      "bundleIdentifier": "app.rork.plant-genius"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "app.rork.plant-genius"
    },
    "web": {
      "favicon": "./assets/images/favicon.png"
    }
  }
}
```

### 5. Generate Icons Automatically (Recommended)

You can use online tools or CLI tools to generate all required sizes:

**Option A: Using expo-asset-generator**
```bash
npx expo-asset-generator -i path/to/your-icon.png -o assets/images/
```

**Option B: Using Online Tools**
- https://www.appicon.co/ - Generate all sizes from one image
- https://easyappicon.com/ - Similar service
- https://makeappicon.com/ - iOS and Android icons

### 6. Test the Icons

After replacing the icons:

1. **Clear Expo cache:**
   ```bash
   npx expo start -c
   ```

2. **Test on iOS simulator:**
   - Check home screen icon
   - Check App Store icon preview
   - Verify no transparency issues

3. **Test on Android emulator:**
   - Check launcher icon with different shapes (circle, square, rounded square)
   - Verify adaptive icon behaves correctly
   - Test with light and dark themes

### 7. Build for Production

When ready to deploy:

```bash
# For iOS
eas build --platform ios

# For Android  
eas build --platform android

# For both
eas build --platform all
```

## Icon Design Guidelines

### iOS Guidelines
- Use simple, recognizable designs
- Avoid text (it becomes unreadable at small sizes)
- Use a consistent color palette
- Test at multiple sizes (iPhone, iPad, App Store)
- No transparency or rounded corners needed

### Android Guidelines
- Design for the adaptive icon system
- Keep important elements in the 768px safe zone
- Test with different mask shapes
- Provide sufficient contrast with background
- Consider how it looks with Material Design themes

## Troubleshooting

### Icon not updating?
- Clear Metro bundler cache: `npx expo start -c`
- Clear app data on device
- Uninstall and reinstall the app
- Check file paths in `app.json`

### Icon looks pixelated?
- Ensure you're using high-resolution source images
- Use vector graphics when possible
- Export at 2x or 3x resolution

### Adaptive icon cropped incorrectly?
- Keep content within the 768x768px safe zone
- Test with different launcher shapes
- Adjust `backgroundColor` in `app.json` if needed

## Additional Resources

- [Expo Icon Documentation](https://docs.expo.dev/guides/app-icons/)
- [iOS Human Interface Guidelines - App Icon](https://developer.apple.com/design/human-interface-guidelines/app-icons)
- [Android Adaptive Icon Guide](https://developer.android.com/develop/ui/views/launch/icon_design_adaptive)
- [Material Design Icon Guidelines](https://m3.material.io/styles/icons/overview)
