const PROXY_URL = "https://badges.brodanistheman.workers.dev";

let currentUserId = null;
let currentCode = "";
let loadedBadges = [];
let currentMode = "username"; // Modes: 'username', 'userid', 'gameid'

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

// Mode Selector
window.setMode = function(mode) {
  currentMode = mode;
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`tab-${mode}`).classList.add('active');
  
  const input = document.getElementById('username-input');
  const label = document.getElementById('input-label');
  document.getElementById('code-section').style.display = 'none';

  if (mode === 'username') {
    label.innerText = "Enter a Roblox Username:";
    input.placeholder = "e.g. Builderman";
  } else if (mode === 'userid') {
    label.innerText = "Enter a Numerical Player User ID:";
    input.placeholder = "e.g. 156";
  } else if (mode === 'gameid') {
    label.innerText = "Enter a Game Universe ID:";
    input.placeholder = "e.g. 8870926683";
  }
};

// Main Submit Action
document.getElementById('gen-code-btn').onclick = async () => {
  const inputVal = document.getElementById('username-input').value.trim();
  if (!inputVal) return alert("Please fill in the input field.");

  // Direct Game ID Lookup
  if (currentMode === 'gameid') {
    if (isNaN(inputVal)) return alert("Game Universe ID must be a number!");
    document.getElementById('auth-card').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    await fetchGameBadges(inputVal);
    return;
  }

  // Direct User ID Lookup (Unverified direct view)
  if (currentMode === 'userid') {
    if (isNaN(inputVal)) return alert("User ID must be a number!");
    document.getElementById('auth-card').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    await fetchUserOwnedBadges(inputVal);
    return;
  }

  // Username Lookup with Profile Verification
  try {
    const res = await fetch(`${PROXY_URL}/api/get-user-id`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernames: [inputVal], excludeBannedUsers: true })
    });

    if (!res.ok) throw new Error(`Server status ${res.status}`);

    const data = await res.json();
    if (data && data.data && data.data.length > 0 && data.data[0].id) {
      currentUserId = parseInt(data.data[0].id, 10);
      currentCode = generateNaturalSentence();
      document.getElementById('verification-phrase').innerText = currentCode;
      document.getElementById('code-section').style.display = 'block';
    } else {
      alert("Username not found on Roblox.");
    }
  } catch (err) {
    alert("Error looking up username. Check browser console.");
    console.error("Lookup Error:", err);
  }
};

// Profile Verification Handler
document.getElementById('verify-btn').onclick = async () => {
  if (!currentUserId) return alert("No User ID available.");

  try {
    const res = await fetch(`${PROXY_URL}/api/verify-profile/${currentUserId}`);
    const user = await res.json();
    
    const profileText = ((user.about || user.description) || "").toLowerCase();
    const searchPhrase = currentCode.toLowerCase();

    if (profileText.includes(searchPhrase)) {
      document.getElementById('auth-card').style.display = 'none';
      document.getElementById('app').style.display = 'block';
      await fetchUserOwnedBadges(currentUserId);
    } else {
      alert(`Verification phrase "${currentCode}" was not found in your Roblox description!`);
    }
  } catch (err) {
    alert("Error verifying profile.");
    console.error("Verification Error:", err);
  }
};

// Fetch Player Owned Badges
async function fetchUserOwnedBadges(userId) {
  const loading = document.getElementById('loading');
  loading.style.display = 'block';
  loading.innerText = `Fetching badges for Player User ID #${userId}...`;

  let rawBadges = [];
  let cursor = "";

  try {
    for (let i = 0; i < 3; i++) {
      const url = cursor 
        ? `${PROXY_URL}/api/badges/${userId}?cursor=${cursor}`
        : `${PROXY_URL}/api/badges/${userId}`;

      const res = await fetch(url);
      if (!res.ok) {
        const errData = await res.json();
        console.error("Roblox API Error:", errData);
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

    // Badge Icon Loader
    const badgeIds = rawBadges.map(item => item.id).filter(Boolean).slice(0, 100).join(',');
    let iconMap = {};

    if (badgeIds) {
      try {
        const iconRes = await fetch(`${PROXY_URL}/api/badge-icons?badgeIds=${badgeIds}`);
        const iconData = await iconRes.json();
        if (iconData && iconData.data) {
          iconData.data.forEach(img => {
            iconMap[img.targetId] = img.imageUrl;
          });
        }
      } catch (e) {
        console.warn("Badge icon load failed:", e);
      }
    }

    loadedBadges = rawBadges.map(b => ({
      ...b,
      iconUrl: iconMap[b.id] || ""
    }));

    loading.style.display = 'none';
    renderBadges(loadedBadges);
  } catch (err) {
    loading.innerText = 'Error loading player badges.';
    console.error("fetchUserOwnedBadges Error:", err);
  }
}

// Fetch Game Universe Badges
async function fetchGameBadges(universeId) {
  const loading = document.getElementById('loading');
  loading.style.display = 'block';
  loading.innerText = `Fetching game badges for Game Universe #${universeId}...`;

  let allBadges = [];
  let cursor = "";

  try {
    for (let i = 0; i < 3; i++) {
      const url = cursor 
        ? `${PROXY_URL}/api/game-badges/${universeId}?cursor=${cursor}`
        : `${PROXY_URL}/api/game-badges/${universeId}`;

      const res = await fetch(url);
      if (!res.ok) break;

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
    loading.innerText = 'Error loading game badges.';
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

  badges.forEach(item => {
    const badge = item.badge || item;
    const card = document.createElement('div');
    card.className = 'game-card';

    const iconHtml = badge.iconUrl 
      ? `<img src="${badge.iconUrl}" alt="${badge.name}" style="width:60px; height:60px; border-radius:8px; margin-bottom:10px;">`
      : '';

    const awardDate = item.awardDate 
      ? new Date(item.awardDate).toLocaleDateString() 
      : null;

    card.innerHTML = `
      ${iconHtml}
      <h3>${badge.name || 'Unnamed Badge'}</h3>
      <p style="font-size: 0.85em; opacity: 0.8;">${badge.description || 'No description provided.'}</p>
      <small style="display:block;">Badge ID: ${badge.id}</small>
      ${awardDate ? `<small style="color: #10b981;">Awarded: ${awardDate}</small>` : ''}
    `;
    container.appendChild(card);
  });
}

// Search Bar Filter
document.getElementById('search-bar').oninput = (e) => {
  const query = e.target.value.toLowerCase();
  const filtered = loadedBadges.filter(item => {
    const b = item.badge || item;
    return (b.name && b.name.toLowerCase().includes(query)) ||
           (b.description && b.description.toLowerCase().includes(query));
  });
  renderBadges(filtered);
};
