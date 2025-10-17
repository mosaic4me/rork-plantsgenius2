# How to Update App Icon on Rork

Since Rork doesn't support direct file pasting for binary files like images, here's how to update your app icon:

## Method 1: Using Asset Links (Recommended for Rork)

1. Upload your icon image to a public URL (like Imgur, Cloudinary, or your own server)
2. Update the `app.json` file with your icon URLs:

```json
{
  "expo": {
    "icon": "https://your-cdn.com/icon.png",
    "splash": {
      "image": "https://your-cdn.com/splash-icon.png"
    },
    "ios": {
      "icon": "https://your-cdn.com/icon.png"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "https://your-cdn.com/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      }
    }
  }
}
```

## Method 2: Using Base64 (For Small Icons)

Convert your icon to base64 and use it directly in app.json:

```json
{
  "expo": {
    "icon": "data:image/png;base64,YOUR_BASE64_STRING_HERE"
  }
}
```

## Method 3: Ask Rork to Generate Icons

You can ask Rork to generate icons using its image generation capabilities:

```
Please generate an app icon for PlantsGenius with a leaf design on a green background
```

Rork will generate the image and save it at the appropriate path.

## Icon Requirements

- **App Icon**: 1024x1024 px (PNG)
- **Adaptive Icon** (Android): 1024x1024 px (PNG)
- **Splash Icon**: 1024x1024 px (PNG)

## Current Icon Locations

- `assets/images/icon.png` - Main app icon
- `assets/images/adaptive-icon.png` - Android adaptive icon
- `assets/images/splash-icon.png` - Splash screen icon
- `assets/images/favicon.png` - Web favicon

## Note

When working with Rork, the easiest approach is to:
1. Use the existing icons (they're already configured)
2. Or ask Rork to generate new ones with specific descriptions
3. Or provide URLs to your hosted images
