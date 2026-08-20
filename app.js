const PROXY_URL = "https://badges.brodanistheman.workers.dev";
let loadedBadges = [];

// Step 1: Handle Button Click - Convert Username to User ID
document.getElementById('gen-code-btn').onclick = async () => {
  const username = document.getElementById('username-input').value.trim();
  if (!username) {
    return alert("Please enter a Roblox username!");
  }

  const loading = document.getElementById('loading');
  document.getElementById('auth-card').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  loading.style.display = 'block';
  loading.innerText = `Fetching user ID for "${username}"...`;

  console.log(`[DEBUG] Starting badge fetch for username: ${username}`);

  // Get User ID from Username
  const userId = await getUserIdFromUsername(username);
  
  if (!userId) {
    loading.innerText = 'User not found! Check the username and try again.';
    document.getElementById('auth-card').style.display = 'block';
    document.getElementById('app').style.display = 'none';
    console.error('[DEBUG] User ID not found for username:', username);
    return;
  }

  console.log(`[DEBUG] Got user ID: ${userId}`);
  loading.innerText = `Fetching badges for ${username} (ID: ${userId})...`;
  await fetchUserBadges(userId);
};

// Step 2: Convert Username to User ID
async function getUserIdFromUsername(username) {
  try {
    console.log('[DEBUG] Calling /api/get-user-id with username:', username);
    const res = await fetch(`${PROXY_URL}/api/get-user-id`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernames: [username] })
    });

    console.log(`[DEBUG] get-user-id response status: ${res.status}`);

    if (!res.ok) {
      console.error('[DEBUG] API Error:', res.status, res.statusText);
      return null;
    }

    const data = await res.json();
    console.log('[DEBUG] get-user-id response:', JSON.stringify(data, null, 2));
    
    // Extract user ID from response
    if (data.data && Array.isArray(data.data) && data.data.length > 0) {
      return data.data[0].id;
    }
    
    console.warn('[DEBUG] No user found in response');
    return null;
  } catch (err) {
    console.error("[DEBUG] getUserIdFromUsername Error:", err);
    return null;
  }
}

// Step 3: Fetch User's Earned Badges
async function fetchUserBadges(userId) {
  const loading = document.getElementById('loading');
  let allBadges = [];
  let cursor = "";
  let pageNum = 0;

  try {
    // Fetch up to 3 pages of badges
    for (let i = 0; i < 3; i++) {
      pageNum = i + 1;
      const url = cursor 
        ? `${PROXY_URL}/api/badges/${userId}?cursor=${cursor}`
        : `${PROXY_URL}/api/badges/${userId}`;
      
      console.log(`[DEBUG] Fetching page ${pageNum}: ${url}`);
      loading.innerText = `Loading badges (page ${pageNum})...`;
      
      const res = await fetch(url);
      
      console.log(`[DEBUG] Page ${pageNum} response status: ${res.status}`);

      if (!res.ok) {
        console.error(`[DEBUG] Fetch error on page ${pageNum}: ${res.status} ${res.statusText}`);
        break;
      }

      const data = await res.json();
      console.log(`[DEBUG] Page ${pageNum} response:`, JSON.stringify(data, null, 2));

      // Add badges to array
      if (data && Array.isArray(data.data)) {
        console.log(`[DEBUG] Page ${pageNum} has ${data.data.length} badges`);
        allBadges.push(...data.data);
      } else {
        console.warn(`[DEBUG] Page ${pageNum} data is not an array or missing`);
      }

      // Check if there are more pages
      if (!data || !data.nextPageCursor) {
        console.log('[DEBUG] No more pages (no nextPageCursor)');
        break;
      }

      cursor = data.nextPageCursor;
      console.log(`[DEBUG] Next cursor: ${cursor}`);
    }

    console.log(`[DEBUG] Total badges collected: ${allBadges.length}`);

    if (allBadges.length === 0) {
      loading.innerText = 'No badges found for this user.';
      console.warn('[DEBUG] No badges found in any response');
      return;
    }

    loadedBadges = allBadges;
    loading.style.display = 'none';
    renderBadges(loadedBadges);
  } catch (err) {
    loading.innerText = 'Error loading badges. Check console for details.';
    console.error("[DEBUG] fetchUserBadges Error:", err);
  }
}

// Step 4: Render Badges Grid
function renderBadges(badges) {
  const container = document.getElementById('game-list');
  container.innerHTML = "";

  console.log(`[DEBUG] Rendering ${badges.length} badges`);

  if (badges.length === 0) {
    container.innerHTML = "<p>No badges found.</p>";
    return;
  }

  badges.forEach((badge, index) => {
    const card = document.createElement('div');
    card.className = 'game-card';

    console.log(`[DEBUG] Badge ${index}:`, badge);

    // Display badge information
    card.innerHTML = `
      <h3>${badge.name || 'Unnamed Badge'}</h3>
      <p style="font-size: 0.85em; opacity: 0.8;">${badge.description || 'No description provided.'}</p>
      <small>Badge ID: ${badge.id}</small>
    `;
    container.appendChild(card);
  });
}

// Step 5: Search Filter Bar
document.getElementById('search-bar').oninput = (e) => {
  const query = e.target.value.toLowerCase();
  
  const filtered = loadedBadges.filter(b =>
    (b.name && b.name.toLowerCase().includes(query)) ||
    (b.description && b.description.toLowerCase().includes(query))
  );

  console.log(`[DEBUG] Search query: "${query}" - Found ${filtered.length} matches`);
  renderBadges(filtered);
};

console.log('[DEBUG] app.js loaded and ready');
