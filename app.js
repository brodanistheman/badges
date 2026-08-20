// Connected to your active Cloudflare Worker Proxy
const PROXY_URL = "https://badges.brodanistheman.workers.dev"; 

let currentUserId = null;
let currentCode = "";
let gamesData = [];

// Step 1: User Lookup
document.getElementById('gen-code-btn').onclick = async () => {
  const username = document.getElementById('username-input').value.trim();
  if (!username) return alert("Please enter a username");

  const res = await fetch(`${PROXY_URL}/api/get-user-id`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usernames: [username], excludeBannedUsers: true })
  });
  
  const data = await res.json();
  if (data.data && data.data.length > 0) {
    currentUserId = data.data[0].id;
    currentCode = `verify-${Math.random().toString(36).substring(2, 8)}`;
    document.getElementById('verification-phrase').innerText = currentCode;
    document.getElementById('code-section').style.display = 'block';
  } else {
    alert("Username not found on Roblox.");
  }
};

// Step 2: Verification Check
document.getElementById('verify-btn').onclick = async () => {
  const res = await fetch(`${PROXY_URL}/api/verify-profile/${currentUserId}`);
  const user = await res.json();
  
  if (user.description && user.description.includes(currentCode)) {
    document.getElementById('auth-card').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    loadBadgesAndGames();
  } else {
    alert("Verification code not found in your Roblox description yet!");
  }
};

// Step 3: Fetch Badges and Experience Details
async function loadBadgesAndGames() {
  document.getElementById('loading').style.display = 'block';
  
  let allBadges = [];
  let cursor = "";

  for (let i = 0; i < 2; i++) {
    const res = await fetch(`${PROXY_URL}/api/badges/${currentUserId}?cursor=${cursor}`);
    const data = await res.json();
    if (data.data) allBadges.push(...data.data);
    if (!data.nextPageCursor) break;
    cursor = data.nextPageCursor;
  }

  // Group Badges by Universe ID
  const grouped = {};
  allBadges.forEach(badge => {
    const uId = badge.awarder.id;
    if (!grouped[uId]) grouped[uId] = [];
    grouped[uId].push(badge);
  });

  const universeIds = Object.keys(grouped);

  // Fetch Game Details
  if (universeIds.length > 0) {
    const gameRes = await fetch(`${PROXY_URL}/api/games`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ universeIds })
    });
    const gameInfo = await gameRes.json();

    gamesData = (gameInfo.data || []).map(game => ({
      name: game.name,
      universeId: game.id,
      badges: grouped[game.id] || []
    }));
  }

  document.getElementById('loading').style.display = 'none';
  renderGames(gamesData);
}

// Render Games and Badge Drawers
function renderGames(games) {
  const container = document.getElementById('game-list');
  container.innerHTML = "";

  games.forEach(game => {
    const card = document.createElement('div');
    card.className = 'game-card';
    card.innerHTML = `
      <h3>${game.name}</h3>
      <small>${game.badges.length} Badges Earned</small>
    `;

    const drawer = document.createElement('div');
    drawer.className = 'badge-drawer';
    drawer.style.display = 'none';

    game.badges.forEach(b => {
      drawer.innerHTML += `
        <div class="badge-item">
          <span>${b.name}</span>
        </div>
      `;
    });

    card.onclick = () => {
      const isVisible = drawer.style.display === 'grid';
      drawer.style.display = isVisible ? 'none' : 'grid';
      card.classList.toggle('active', !isVisible);
    };

    card.appendChild(drawer);
    container.appendChild(card);
  });
}

// Search Functionality
document.getElementById('search-bar').oninput = (e) => {
  const query = e.target.value.toLowerCase();
  const filtered = gamesData.filter(g => g.name.toLowerCase().includes(query));
  renderGames(filtered);
};