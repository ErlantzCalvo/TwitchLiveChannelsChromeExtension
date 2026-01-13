document.addEventListener('DOMContentLoaded', async () => {
  const setupSection = document.getElementById('setupSection');
  const mainContent = document.getElementById('mainContent');
  const connectBtn = document.getElementById('connectBtn');
  const authError = document.getElementById('authError');
  const refreshBtn = document.getElementById('refreshBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const streamersList = document.getElementById('streamersList');
  const onlineCount = document.getElementById('onlineCount');
  const lastUpdated = document.getElementById('lastUpdated');
  const extensionIdSpan = document.getElementById('extensionId');

  let currentAccessToken = null;

  async function loadAccessToken() {
    const result = await chrome.storage.local.get(['accessToken']);
    currentAccessToken = result.accessToken;
    return currentAccessToken;
  }

  function showSetup() {
    setupSection.classList.remove('hidden');
    mainContent.classList.add('hidden');
  }

  function showMainContent() {
    setupSection.classList.add('hidden');
    mainContent.classList.remove('hidden');
  }

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

  function renderStreamers(streamers) {
    if (streamers.length === 0) {
      streamersList.innerHTML = '<div class="no-streamers">No streamers are currently online</div>';
      onlineCount.textContent = '0 online';
      return;
    }

    onlineCount.textContent = `${streamers.length} online`;

    streamersList.innerHTML = streamers.map(streamer => `
      <div class="streamer-item" data-url="https://twitch.tv/${streamer.user_login}">
        <img src="${streamer.thumbnail_url.replace('{width}', '80').replace('{height}', '80')}" alt="${streamer.user_name}" class="streamer-avatar">
        <div class="streamer-info">
          <div class="streamer-name">${streamer.user_name}</div>
          <div class="streamer-title" title="${streamer.title}">${streamer.title || 'No title'}</div>
          <div class="streamer-meta">
            <span class="live-badge">LIVE</span>
            <span class="game">${streamer.game_name || 'No game'}</span>
          </div>
          <div class="viewer-count">${formatViewerCount(streamer.viewer_count)} viewers</div>
        </div>
      </div>
    `).join('');

    document.querySelectorAll('.streamer-item').forEach(item => {
      item.addEventListener('click', () => {
        const url = item.getAttribute('data-url');
        chrome.tabs.create({ url });
      });
    });
  }

  function formatViewerCount(count) {
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1) + 'M';
    } else if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'K';
    }
    return count.toString();
  }

  function updateLastUpdated() {
    const now = new Date();
    lastUpdated.textContent = `Updated: ${now.toLocaleTimeString()}`;
  }

  function showError(message) {
    authError.textContent = message;
  }

  async function authenticateWithTwitch() {
    const extensionId = chrome.runtime.id;
    extensionIdSpan.textContent = extensionId;

    try {
      connectBtn.textContent = 'Connecting...';
      connectBtn.disabled = true;
      authError.textContent = '';

      const response = await chrome.runtime.sendMessage({ action: 'startAuth' });

      if (response && response.success) {
        currentAccessToken = await loadAccessToken();
        showMainContent();
        await loadStreamers();
      } else if (response && response.error) {
        showError('Authentication error: ' + response.error);
      } else {
        showError('Authentication failed. Please try again.');
      }
    } catch (error) {
      console.error('Auth request error:', error);
      showError('Authentication error: ' + error.message);
    } finally {
      connectBtn.textContent = 'Connect with Twitch';
      connectBtn.disabled = false;
    }
  }

  async function loadStreamers() {
    if (!currentAccessToken) {
      showSetup();
      return;
    }

    streamersList.innerHTML = '<div class="loading">Loading streamers...</div>';

    try {
      const isValid = await validateToken(currentAccessToken);
      if (!isValid) {
        await chrome.storage.local.remove(['accessToken']);
        showSetup();
        return;
      }

      const userId = await getUserId(currentAccessToken);
      const streamers = await getFollowedStreams(userId, currentAccessToken);
      renderStreamers(streamers);
      updateLastUpdated();

      await chrome.storage.local.set({ lastStreamers: streamers });
    } catch (error) {
      console.error('Load streamers error:', error);
      streamersList.innerHTML = '<div class="no-streamers">Error loading streamers. Try refreshing.</div>';
    }
  }

  async function loadCachedStreamers() {
    const result = await chrome.storage.local.get(['lastStreamers', 'lastUpdated']);
    if (result.lastStreamers) {
      renderStreamers(result.lastStreamers);
      if (result.lastUpdated) {
        const date = new Date(result.lastUpdated);
        lastUpdated.textContent = `Updated: ${date.toLocaleTimeString()}`;
      }
    }
  }

  connectBtn.addEventListener('click', authenticateWithTwitch);

  refreshBtn.addEventListener('click', async () => {
    await loadStreamers();
  });

  logoutBtn.addEventListener('click', async () => {
    await chrome.storage.local.remove(['accessToken']);
    currentAccessToken = null;
    showSetup();
  });

  const token = await loadAccessToken();
  if (token) {
    const isValid = await validateToken(token);
    if (isValid) {
      showMainContent();
      await loadCachedStreamers();
      await loadStreamers();
    } else {
      await chrome.storage.local.remove(['accessToken']);
      showSetup();
    }
  } else {
    showSetup();
  }
});
