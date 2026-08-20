const PROXY_URL = "https://badges.brodanistheman.workers.dev";
let loadedBadges = [];

// Handle Button Click
document.getElementById('gen-code-btn').onclick = async () => {
  const universeId = document.getElementById('username-input').value.trim();
  if (!universeId) return alert("Please enter a Game Universe ID");

  document.getElementById('auth-card').style.display = 'none';
  document.getElementById('app').style.display = 'block';

  await fetchGameBadges(universeId);
};

// Fetch Badges for Game Universe
async function fetchGameBadges(universeId) {
  const loading = document.getElementById('loading');
  loading.style.display = 'block';
  loading.innerText = `Fetching badges for Game Universe #${universeId}...`;

  let allBadges = [];
  let cursor = "";

  try {
    for (let i = 0; i < 3; i++) {
      const url = cursor 
        ? `${PROXY_URL}/api/game-badges/${universeId}?cursor=${cursor}`
        : `${PROXY_URL}/api/game-badges/${universeId}`;

      const res = await fetch(url);
      if (!res.ok) {
        console.error(`Fetch error status: ${res.status}`);
        break;
      }

      const data = await res.json();
      if (data && Array.isArray(data.data)) {
        allBadges.push(...data.data);
      }

      if (!data || !data.nextPageCursor) break;
      cursor = data.nextPageCursor;
    }

    if (allBadges.length === 0) {
      loading.innerText = 'No badges found for this Game Universe ID.';
      return;
    }

    loadedBadges = allBadges;
    loading.style.display = 'none';
    renderBadges(loadedBadges);
  } catch (err) {
    loading.innerText = 'Error loading game badges. Check console.';
    console.error("fetchGameBadges Error:", err);
  }
}

// Render Badge Cards
function renderBadges(badges) {
  const container = document.getElementById('game-list');
  container.innerHTML = "";

  if (badges.length === 0) {
    container.innerHTML = "<p>No matching badges found.</p>";
    return;
  }

  badges.forEach(badge => {
    const card = document.createElement('div');
    card.className = 'game-card';
    card.innerHTML = `
      <h3>${badge.name || 'Unnamed Badge'}</h3>
      <p style="font-size: 0.85em; opacity: 0.8;">${badge.description || 'No description provided.'}</p>
      <small>Badge ID: ${badge.id}</small>
    `;
    container.appendChild(card);
  });
}

// Filter Badges with Search Input
document.getElementById('search-bar').oninput = (e) => {
  const query = e.target.value.toLowerCase();
  const filtered = loadedBadges.filter(b => 
    (b.name && b.name.toLowerCase().includes(query)) ||
    (b.description && b.description.toLowerCase().includes(query))
  );
  renderBadges(filtered);
};
