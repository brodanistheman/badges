const PROXY_URL = "https://badges.brodanistheman.workers.dev"; 

let loadedBadges = [];

// Step 1: Load Game Badges by Universe ID
document.getElementById('gen-code-btn').onclick = async () => {
  const inputVal = document.getElementById('username-input').value.trim();
  if (!inputVal) return alert("Please enter a Game Universe ID!");

  const loading = document.getElementById('loading');
  document.getElementById('auth-card').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  
  loading.style.display = 'block';
  loading.innerText = `Fetching badges for Game Universe #${inputVal}...`;

  await fetchGameBadges(inputVal);
};

// Step 2: Fetch Game Badges from Proxy
async function fetchGameBadges(universeId) {
  const loading = document.getElementById('loading');
  let allBadges = [];
  let cursor = "";

  try {
    for (let i = 0; i < 3; i++) {
      const res = await fetch(`${PROXY_URL}/api/game-badges/${universeId}?cursor=${cursor}`);
      const data = await res.json();

      if (data && Array.isArray(data.data)) {
        allBadges.push(...data.data);
      }

      if (!data || !data.nextPageCursor) break;
      cursor = data.nextPageCursor;
    }

    if (allBadges.length === 0) {
      loading.innerText = 'No badges found for this game (or Universe ID is invalid).';
      return;
    }

    loadedBadges = allBadges;
    loading.style.display = 'none';
    renderBadges(loadedBadges);
  } catch (err) {
    loading.innerText = 'Error loading game badges. Check console for details.';
    console.error("fetchGameBadges Error:", err);
  }
}

// Step 3: Render Badges Grid
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
    
    // Display badge information
    card.innerHTML = `
      <h3>${badge.name || 'Unnamed Badge'}</h3>
      <p style="font-size: 0.85em; opacity: 0.8;">${badge.description || 'No description provided.'}</p>
      <small>Badge ID: ${badge.id}</small>
    `;

    container.appendChild(card);
  });
}

// Search Filter Bar
document.getElementById('search-bar').oninput = (e) => {
  const query = e.target.value.toLowerCase();
  const filtered = loadedBadges.filter(b => 
    (b.name && b.name.toLowerCase().includes(query)) ||
    (b.description && b.description.toLowerCase().includes(query))
  );
  renderBadges(filtered);
};
