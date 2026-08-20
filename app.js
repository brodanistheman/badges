const PROXY_URL = "https://badges.brodanistheman.workers.dev";

let currentUserId = null;
let currentCode = "";
let gamesData = [];

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

// 1. Get Code Button
document.getElementById('gen-code-btn').onclick = async () => {
  const username = document.getElementById('username-input').value.trim();
  if (!username) return alert("Please enter a username");

  try {
    const res = await fetch(`${PROXY_URL}/api/get-user-id`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernames: [username], excludeBannedUsers: true })
    });

    if (!res.ok) throw new Error(`Server returned ${res.status}`);

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
    alert("Error fetching user ID. See console for details.");
    console.error(err);
  }
};

// 2. Verify Button
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
    alert("Error checking profile. See console for details.");
    console.error(err);
  }
};

// 3. Load User Earned Badges
async function loadBadgesAndGames() {
  const loading = document.getElementById('loading');
  loading.style.display = 'block';
  loading.innerText = 'Fetching badges from Roblox...';

  let rawBadges = [];
  let cursor = "";

  try {
    for (let i = 0; i < 3; i++) {
      const url = cursor 
        ? `${PROXY_URL}/api/badges/${currentUserId}?cursor=${cursor}`
        : `${PROXY_URL}/api/badges/${currentUserId}`;

      const res = await fetch(url);
      if (!res.ok) {
        console.error(`Fetch error: ${res.status}`);
        break;
      }

      const data = await res.json();
      if (data && Array.isArray(data.data)) {
        rawBadges.push(...data.data);
      }

      if (!data || !data.nextPageCursor) break;
      cursor = data.nextPageCursor;
    }

    if (rawBadges.length === 0) {
      loading.innerText = 'No badges found for this user (or inventory is set to private).';
      return;
    }

    const grouped = {};
    rawBadges.forEach(item => {
      const badgeObj = item.badge || item;
      const uId = (badgeObj.awarder && badgeObj.awarder.id) ? badgeObj.awarder.id : 'Other / Special Badges';

      if (!grouped[uId]) grouped[uId] = [];
      grouped[uId].push(badgeObj);
    });

    const universeIds = Object.keys(grouped).filter(id => id !== 'Other / Special Badges');
    loading.innerText = `Found badges across ${universeIds.length} games. Fetching game info...`;

    gamesData = Object.keys(grouped).map(uId => ({
      name: uId === 'Other / Special Badges' ? 'Other Badges' : `Game Universe #${uId}`,
      universeId: uId,
      badges: grouped[uId]
    }));

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
        console.warn("Could not retrieve game titles.");
      }
    }

    loading.style.display = 'none';
    renderGames(gamesData);
  } catch (err) {
    loading.innerText = 'An error occurred while loading badges.';
    console.error("loadBadgesAndGames error:", err);
  }
}

// 4. Render Interface
function renderGames(games) {
  const container = document.getElementById('game-list');
  container.innerHTML = "";

  if (games.length === 0) {
    container.innerHTML = "<p>No badges found.</p>";
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

// 5. Search Filter
document.getElementById('search-bar').oninput = (e) => {
  const query = e.target.value.toLowerCase();
  const filtered = gamesData.filter(g => g.name.toLowerCase().includes(query));
  renderGames(filtered);
};
