# Twitch Live Channels Chrome Extension

A Chrome extension that shows which Twitch streamers you follow are online without needing to open the Twitch website. Uses OAuth for secure authentication.

## Features

- View all your followed streamers who are currently live
- See streamer name, title, game, and viewer count
- Click on any streamer to open their channel
- Auto-refreshes every 5 minutes in the background
- Manual refresh button
- Twitch-themed dark UI
- Secure OAuth authentication

## Installation

### Step 1: Download or Clone the Extension

1. Download this extension or clone the repository
2. Navigate to the extension folder in your file system

### Step 2: Create a Twitch Application

To use OAuth, you need to register a Twitch application:

1. Go to [Twitch Developer Console](https://dev.twitch.tv/console)
2. Log in with your Twitch account
3. Click "Register Your Application"
4. Fill in the form:
   - **Name**: Twitch Live Channels Extension (or any name you prefer)
   - **OAuth Redirect URLs**: `https://<extension-id>.chromiumapp.org/`
     - Note: You'll need to know your extension ID first (see Step 4)
   - **Category**: Any category
   - **Company Name**: Optional
5. Click "Create"
6. **Copy the Client ID** displayed on the application page

### Step 3: Configure the Client ID

1. Create a file named `config.js` in the extension folder with this content:
```javascript
const CLIENT_ID = 'your-client-id-here';
```

### Step 4: Load the Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" using the toggle in the top right corner
3. Click "Load unpacked"
4. Select the folder containing the extension files
5. **Copy the extension ID** from the extensions page (it looks like: `abcdefghijklmnopqrstuvwxy`)

### Step 5: Update Twitch OAuth Redirect URL

1. Go back to [Twitch Developer Console](https://dev.twitch.tv/console)
2. Find your application and click "Manage"
3. Add the OAuth Redirect URL: `https://<your-extension-id>.chromiumapp.org/`
4. Save the changes
5. Reload the extension in Chrome (click the reload icon on the extension card)

### Step 6: Add Icons (Required)

Before the extension will work, you need to add icon files:

**Option 1: Use the provided script**
```bash
./generate-icons.sh
```
(Requires ImageMagick: `sudo apt-get install imagemagick`)

**Option 2: Manual creation**
1. Create three PNG files in the `icons/` folder:
   - `icon16.png` (16x16 pixels)
   - `icon48.png` (48x48 pixels)
   - `icon128.png` (128x128 pixels)
2. You can use any Twitch-themed icons or simple purple squares

### Step 7: Connect with Twitch

1. Click the extension icon in your Chrome toolbar
2. Click "Connect with Twitch"
3. You'll be redirected to Twitch's authorization page
4. Authorize the application
5. The extension will now load and display your followed live streamers

## Usage

- **View Live Streamers**: Click the extension icon to see all followed streamers who are currently online
- **Open Stream**: Click on any streamer in the list to open their Twitch channel
- **Refresh**: Click the refresh button (↻) to manually update the list
- **Disconnect**: Click "Disconnect" to remove your authorization

## Privacy & Security

- OAuth tokens are stored locally in Chrome's storage
- Tokens are only used to authenticate with Twitch's API
- No data is sent to any third-party servers
- The extension uses Twitch's official Helix API
- OAuth provides secure, token-based authentication without exposing your Twitch credentials

## Troubleshooting

### "Authentication failed" error

1. Make sure you've updated the Twitch OAuth Redirect URL with your extension ID
2. Check that you've set the correct Client ID in both `popup.js` and `background.js`
3. Try reloading the extension
4. Clear your browser's local storage for the extension and try connecting again

### Extension not loading

1. Make sure all files are in the same directory
2. Check that you've added the required icon files
3. Try reloading the extension from chrome://extensions/

### No streamers showing

1. Make sure you follow some streamers on Twitch
2. Check if any of your followed streamers are actually live
3. Try clicking the refresh button
4. Check that your OAuth token is valid (try disconnecting and reconnecting)

### OAuth Redirect URL issues

- The redirect URL must include the trailing slash: `https://<extension-id>.chromiumapp.org/`
- Make sure you're using the correct extension ID from chrome://extensions/
- You can find your extension ID on the extension card after loading it

## Technical Details

- **Manifest Version**: 3
- **Permissions**: storage, alarms, identity
- **API**: Twitch Helix API
- **Authentication**: OAuth 2.0 (implicit grant flow)
- **Update Interval**: 5 minutes (background)
- **OAuth Flow**: chrome.identity.launchWebAuthFlow (handled in background service worker)
- **Architecture**: Background handles auth, Popup handles UI

## Files

- `manifest.json` - Extension configuration
- `config.js` - Configuration file with Twitch Client ID (single source of truth)
- `popup.html` - Popup interface HTML
- `popup.css` - Popup styling
- `popup.js` - Popup UI logic and Twitch API calls for displaying streams
- `background.js` - Service worker for OAuth authentication and periodic updates
- `icons/` - Extension icons (you need to add these)
- `generate-icons.sh` - Script to generate placeholder icons


## Architecture

The extension follows a clean separation of concerns:

- **Background Service Worker**: Handles all OAuth authentication and background periodic updates. When the popup requests authentication, the background script manages the entire OAuth flow using `chrome.identity.launchWebAuthFlow()`, validates the token, and stores it in chrome.storage.local.

- **Popup**: Focuses solely on the UI. It reads the access token from storage, makes API calls to fetch followed streams, and displays the data to the user. When authentication is needed, it sends a message to the background script.

This architecture is more robust because:
- OAuth flow persists even if the popup is closed
- Authentication logic is centralized in one place
- The background service worker can handle token refresh if needed
- Cleaner separation between authentication and presentation logic

## License

This extension is provided as-is for personal use. Please respect Twitch's Terms of Service when using their API.

## Contributing

Feel free to fork and modify this extension for your own needs!