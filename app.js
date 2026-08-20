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

  // Get User ID from Username
  const userId = await getUserIdFromUsername(username);
  
  if (!userId) {
    loading.innerText = 'User not found! Check the username and try again.';
    document.getElementById('auth-card').style.display = 'block';
    document.getElementById('app').style.display = 'none';
    return;
  }

  loading.innerText = `Fetching badges for ${username}...`;
  await fetchUserBadges(userId);
};

// Step 2: Convert Username to User ID
async function getUserIdFromUsername(username) {
  try {
    const res = await fetch(`${PROXY_URL}/api/get-user-id`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernames: [username] })
    });

    if (!res.ok) {
      console.error("API Error:", res.status);
      return null;
    }

    const data = await res.json();
    
    // Extract user ID from response
    if (data.data && Array.isArray(data.data) && data.data.length > 0) {
      return data.data[0].id;
    }
    
    return null;
  } catch (err) {
    console.error("getUserIdFromUsername Error:", err);
    return null;
  }
}

// Step 3: Fetch User's Earned Badges
async function fetchUserBadges(userId) {
  const loading = document.getElementById('loading');
  let allBadges = [];
  let cursor = "";

  try {
    // Fetch up to 3 pages of badges
    for (let i = 0; i < 3; i++) {
      const url = cursor 
        ? `${PROXY_URL}/api/badges/${userId}?cursor=${cursor}`
        : `${PROXY_URL}/api/badges/${userId}`;
      
      const res = await fetch(url);
      
      if (!res.ok) {
        console.error(`Fetch error: ${res.status}`);
        break;
      }

      const data = await res.json();

      // Add badges to array
      if (data && Array.isArray(data.data)) {
        allBadges.push(...data.data);
      }

      // Check if there are more pages
      if (!data || !data.nextPageCursor) {
        break;
      }

      cursor = data.nextPageCursor;
    }

    if (allBadges.length === 0) {
      loading.innerText = 'No badges found for this user.';
      return;
    }

    loadedBadges = allBadges;
    loading.style.display = 'none';
    renderBadges(loadedBadges);
  } catch (err) {
    loading.innerText = 'Error loading badges. Check console for details.';
    console.error("fetchUserBadges Error:", err);
  }
}

// Step 4: Render Badges Grid
function renderBadges(badges) {
  const container = document.getElementById('game-list');
  container.innerHTML = "";

  if (badges.length === 0) {
    container.innerHTML = "<p>No badges found.</p>";
    return;
  }

  badges.forEach(badge => {
    const card = document.createElement('div');
    card.className = 'game-card';

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

  renderBadges(filtered);
};
