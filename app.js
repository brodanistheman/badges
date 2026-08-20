const PROXY_URL = "https://badges.brodanistheman.workers.dev";

let currentUserId = null;
let currentCode = "";
let loadedBadges = [];

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

// 1. Get Code Button Handler
document.getElementById('gen-code-btn').onclick = async () => {
  const inputVal = document.getElementById('username-input').value.trim();
  if (!inputVal) return alert("Please enter a Roblox Username or Universe ID");

  // Direct Universe ID entry (if numerical input)
  if (!isNaN(inputVal)) {
    document.getElementById('auth-card').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    await fetchGameBadges(inputVal);
    return;
  }

  // Username lookup
  try {
    const res = await fetch(`${PROXY_URL}/api/get-user-id`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernames: [inputVal], excludeBannedUsers: true })
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
    alert("Error looking up username. Check browser console.");
    console.error(err);
  }
};

// 2. Verification Button Handler
document.getElementById('verify-btn').onclick = async () => {
  try {
    const res = await fetch(`${PROXY_URL}/api/verify-profile/${currentUserId}`);
    const user = await res.json();
    
    const profileText = ((user.about || user.description) || "").toLowerCase();
    const searchPhrase = currentCode.toLowerCase();

    if (profileText.includes(searchPhrase)) {
      document.getElementById('auth-card').style.display = 'none';
      document.getElementById('app').style.display = 'block';
      await fetchUserBadges(currentUserId);
    } else {
      alert(`Verification phrase "${currentCode}" was not found in your Roblox description!`);
    }
  } catch (err) {
    alert("Error verifying profile.");
    console.error(err);
  }
};

// Fetch User Earned Badges
async function fetchUserBadges(userId) {
  const loading = document.getElementById('loading');
  loading.style.display = 'block';
  loading.innerText = 'Fetching user badges...';

  let rawBadges = [];
  let cursor = "";

  try {
    for (let i = 0; i < 3; i++) {
      const url = cursor 
        ? `${PROXY_URL}/api/badges/${userId}?cursor=${cursor}`
        : `${PROXY_URL}/api/badges/${userId}`;

      const res = await fetch(url);
      if (!res.ok) break;

      const data = await res.json();
      if (data && Array.isArray(data.data)) {
        rawBadges.push(...data.data);
      }

      if (!data || !data.nextPageCursor) break;
      cursor = data.nextPageCursor;
    }

    if (rawBadges.length === 0) {
      loading.innerText = 'No badges found for this user.';
      return;
    }

    loadedBadges = rawBadges;
    loading.style.display = 'none';
    renderBadges(loadedBadges);
  } catch (err) {
    loading.innerText = 'Error loading badges.';
    console.error(err);
  }
}

// Fetch Game Universe Badges
async function fetchGameBadges(universeId) {
  const loading = document.getElementById('loading');
  loading.style.display = 'block';
  loading.innerText = `Fetching game badges...`;

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
    console.error(err);
  }
}

// Render Badge Display
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
    card.innerHTML = `
      <h3>${badge.name || 'Unnamed Badge'}</h3>
      <p style="font-size: 0.85em; opacity: 0.8;">${badge.description || 'No description available.'}</p>
      <small>Badge ID: ${badge.id}</small>
    `;
    container.appendChild(card);
  });
}

// Search Filter
document.getElementById('search-bar').oninput = (e) => {
  const query = e.target.value.toLowerCase();
  const filtered = loadedBadges.filter(item => {
    const b = item.badge || item;
    return (b.name && b.name.toLowerCase().includes(query)) ||
           (b.description && b.description.toLowerCase().includes(query));
  });
  renderBadges(filtered);
};
