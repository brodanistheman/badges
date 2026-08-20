// Connected to your active Cloudflare Worker Proxy
const PROXY_URL = "https://badges.brodanistheman.workers.dev"; 

let currentUserId = null;
let currentCode = "";
let gamesData = [];

// Word banks to construct natural-sounding sentences
const ADJECTIVES = ["red", "blue", "green", "happy", "swift", "cool", "calm", "bright", "small", "kind"];
const NOUNS = ["cat", "dog", "fox", "owl", "bear", "frog", "duck", "lion", "fish", "bird"];
const VERBS = ["jumped", "played", "ran", "danced", "slept", "flew", "walked", "swam", "sang", "smiled"];
const ADVERBS = ["today", "quickly", "outside", "happily", "around", "everywhere", "together", "away"];

function generateNaturalSentence() {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const verb = VERBS[Math.floor(Math.random() * VERBS.length)];
  const adv = ADVERBS[Math.floor(Math.random() * ADVERBS.length)];
  return `the ${adj} ${noun} ${verb} ${adv}`;
}

// Step 1: User Lookup
document.getElementById('gen-code-btn').onclick = async () => {
  const username = document.getElementById('username-input').value.trim();
  if (!username) return alert("Please enter a username");

  try {
    const res = await fetch(`${PROXY_URL}/api/get-user-id`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernames: [username], excludeBannedUsers: true })
    });
    
    const data = await res.json();
    if (data.data && data.data.length > 0) {
      currentUserId = data.data[0].id;
      currentCode = generateNaturalSentence();
      document.getElementById('verification-phrase').innerText = currentCode;
      document.getElementById('code-section').style.display = 'block';
    } else {
      alert("Username not found on Roblox.");
    }
  } catch (err) {
    alert("Error fetching user ID. Check console.");
    console.error(err);
  }
};

// Step 2: Verification Check
document.getElementById('verify-btn').onclick = async () => {
  try {
    const res = await fetch(`${PROXY_URL}/api/verify-profile/${currentUserId}`);
    const user = await res.json();
    
    const profileText = ((user.about || user.description) || "").toLowerCase();
    const searchPhrase = currentCode.toLowerCase();

    if (profileText.includes(searchPhrase)) {
      document.getElementById('auth-card').style.display = 'none';
      document.getElementById('app').style.display = 'block';
      loadBadgesAndGames();
    } else {
      alert(`Verification phrase "${currentCode}" was not found in your Roblox description!`);
    }
  } catch (err) {
    alert("Error checking profile. Check console.");
    console.error(err);
  }
};

// Step 3: Fetch Badges and Experience Details
async function loadBadgesAndGames() {
  const loading = document.getElementById('loading');
  loading.style.display = 'block';
  loading.innerText = 'Fetching badges from Roblox...';
  
  let rawBadges = [];
  let cursor = "";

  try {
    // Fetch pages of received badges
    for (let i = 0; i < 3; i++) {
      const res = await fetch(`${PROXY_URL}/api/badges/${currentUserId}?cursor=${cursor}`);
      const data = await res.json();
      
      if (data && Array.isArray(data.data)) {
        rawBadges.push(...data.data);
      }
      
      if (!data || !data.nextPageCursor) break;
      cursor = data.nextPageCursor;
    }

    if (rawBadges.length === 0) {
      loading.innerText = 'No badges found for this account (or inventory is set to private).';
      return;
    }

    // Group Badges by Universe ID (Unwrapping Roblox's badge object structure)
    const grouped = {};
    rawBadges.forEach(item => {
      const badgeObj = item.badge || item; // Handles nested badge object
      const uId = (badgeObj.awarder && badgeObj.awarder.id) ? badgeObj.awarder.id : 'unknown';
      
      if (!grouped[uId]) grouped[uId] = [];
      grouped[uId].push(badgeObj);
    });

    const universeIds = Object.keys(grouped).filter(id => id !== 'unknown');

    loading.innerText = `Found badges across ${universeIds.length} games. Loading details...`;

    // Create default game structures
    gamesData = universeIds.map(uId => ({
      name: `Game Universe #${uId}`,
      universeId: uId,
      badges: grouped[uId]
    }));

    // Fetch Game Names
    if (universeIds.length > 0) {
      try {
        const gameRes = await fetch(`${PROXY_URL}/api/games`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ universeIds })
        });
        const gameInfo = await gameRes.json();

        if (gameInfo && Array.isArray(gameInfo.data)) {
          const nameMap = {};
          gameInfo.data.forEach(g => { nameMap[g.id] = g.name; });

          gamesData.forEach(game => {
            if (nameMap[game.universeId]) {
              game.name = nameMap[game.universeId];
            }
          });
        }
      } catch (err) {
        console.warn("Could not retrieve game titles; displaying universe IDs instead.");
      }
    }

    loading.style.display = 'none';
    renderGames(gamesData);
  } catch (err) {
    loading.innerText = 'An error occurred while loading data. Open Developer Console for details.';
    console.error("loadBadgesAndGames error:", err);
  }
}

// Render Games and Badge Drawers
function renderGames(games) {
  const container = document.getElementById('game-list');
  container.innerHTML = "";

  if (games.length === 0) {
    container.innerHTML = "<p>No games to display.</p>";
    return;
  }

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
          <span>${b.name || 'Badge'}</span>
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
