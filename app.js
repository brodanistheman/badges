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

// 1. Submit Button Handler
document.getElementById('gen-code-btn').onclick = async () => {
  const inputVal = document.getElementById('username-input').value.trim();
  if (!inputVal) return alert("Please enter a Roblox Username, User ID, or Game Universe ID");

  // Handle Pure Numbers
  if (!isNaN(inputVal) && Number(inputVal) > 0) {
    const numericId = parseInt(inputVal, 10);
    document.getElementById('auth-card').style.display = 'none';
    document.getElementById('app').style.display = 'block';

    // Game Universe IDs are currently 10-digit/higher numbers (e.g., 8870926683)
    if (numericId > 3000000000) {
      await fetchGameBadges(numericId);
    } else {
      await fetchUserOwnedBadges(numericId);
    }
    return;
  }

  // Handle Username Lookup
  try {
    const res = await fetch(`${PROXY_URL}/api/get-user-id`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernames: [inputVal], excludeBannedUsers: true })
    });

    if (!res.ok) throw new Error(`Server returned status ${res.status}`);

    const data = await res.json();

    if (data && data.data && data.data.length > 0 && data.data[0].id) {
      currentUserId = parseInt(data.data[0].id, 10);
      currentCode = generateNaturalSentence();
      document.getElementById('verification-phrase').innerText = currentCode;
      document.getElementById('code-section').style.display = 'block';
    } else {
      alert("Username not found on Roblox. Make sure to enter the exact username.");
    }
  } catch (err) {
    alert("Error looking up username. Check browser console.");
    console.error("Lookup Error:", err);
  }
};

// 2. Profile Verification Button Handler
document.getElementById('verify-btn').onclick = async () => {
  if (!currentUserId) return alert("No User ID set. Try submitting your username again.");

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

// 3. Fetch Badges Owned by Player
async function fetchUserOwnedBadges(userId) {
  const loading = document.getElementById('loading');
  loading.style.display = 'block';
  loading.innerText = `Fetching player badges for User ID #${userId}...`;

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
      loading.innerText = 'No badges found for this user (or inventory is set to private).';
      return;
    }

    // Fetch Icons
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
        console.warn("Badge icon fetch failed:", e);
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

// 4. Fetch Badges Belonging to a Game Universe
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

// 5. Render Cards
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

// 6. Filter Search Bar
document.getElementById('search-bar').oninput = (e) => {
  const query = e.target.value.toLowerCase();
  const filtered = loadedBadges.filter(item => {
    const b = item.badge || item;
    return (b.name && b.name.toLowerCase().includes(query)) ||
           (b.description && b.description.toLowerCase().includes(query));
  });
  renderBadges(filtered);
};
