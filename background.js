importScripts('config.js');

async function validateToken(token) {
  try {
    const response = await fetch('https://id.twitch.tv/oauth2/validate', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.user_id !== undefined;
  } catch (error) {
    console.error('Token validation error:', error);
    return false;
  }
}

async function getUserId(token) {
  try {
    const response = await fetch('https://api.twitch.tv/helix/users', {
      headers: {
        'Client-Id': CLIENT_ID,
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to get user ID');
    }

    const data = await response.json();
    return data.data[0].id;
  } catch (error) {
    console.error('Get user ID error:', error);
    throw error;
  }
}

async function getFollowedStreams(userId, token) {
  try {
    const response = await fetch(
      `https://api.twitch.tv/helix/streams/followed?user_id=${userId}`,
      {
        headers: {
          'Client-Id': CLIENT_ID,
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to get followed streams');
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Get followed streams error:', error);
    throw error;
  }
}

async function updateStreamers() {
  const result = await chrome.storage.local.get(['accessToken']);

  if (!result.accessToken) {
    return;
  }

  const { accessToken } = result;

  try {
    const isValid = await validateToken(accessToken);
    if (!isValid) {
      await chrome.storage.local.remove(['accessToken']);
      return;
    }

    const userId = await getUserId(accessToken);
    const streamers = await getFollowedStreams(userId, accessToken);

    await chrome.storage.local.set({
      lastStreamers: streamers,
      lastUpdated: Date.now()
    });
  } catch (error) {
    console.error('Background update error:', error);
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('updateStreamers', {
    periodInMinutes: 5
  });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'updateStreamers') {
    updateStreamers();
  }
});

async function authenticateWithTwitch() {
  const extensionId = chrome.runtime.id;

  if (CLIENT_ID === 'YOUR_TWITCH_CLIENT_ID') {
    throw new Error('Please set your Twitch Client ID in config.js');
  }

  const redirectUri = `https://${extensionId}.chromiumapp.org/`;
  const authUrl = new URL('https://id.twitch.tv/oauth2/authorize');
  authUrl.searchParams.append('client_id', CLIENT_ID);
  authUrl.searchParams.append('redirect_uri', redirectUri);
  authUrl.searchParams.append('response_type', 'token');
  authUrl.searchParams.append('scope', 'user:read:follows');
  authUrl.searchParams.append('force_verify', 'true');

  console.log('Extension ID:', extensionId);
  console.log('Redirect URI:', redirectUri);
  console.log('Auth URL:', authUrl.toString());

  try {
    console.log('Launching web auth flow...');
    const authResult = await chrome.identity.launchWebAuthFlow({
      url: authUrl.toString(),
      interactive: true
    });

    console.log('Auth result:', authResult);

    if (authResult) {
      console.log('Full auth URL:', authResult);
      const accessTokenMatch = authResult.match(/access_token=([^&]+)/);
      console.log('Token match result:', accessTokenMatch);

      if (accessTokenMatch) {
        const accessToken = accessTokenMatch[1];
        console.log('Extracted access token:', accessToken.substring(0, 10) + '...');

        const isValid = await validateToken(accessToken);
        console.log('Token valid:', isValid);

        if (isValid) {
          await chrome.storage.local.set({ accessToken });
          return { success: true };
        } else {
          throw new Error('Token validation failed');
        }
      } else {
        throw new Error('Could not extract access token from response');
      }
    } else {
      throw new Error('No auth result returned');
    }
  } catch (error) {
    console.error('OAuth error:', error);
    throw error;
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'startAuth') {
    authenticateWithTwitch()
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});
