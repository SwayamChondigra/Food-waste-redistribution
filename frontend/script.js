const API_BASE = "http://localhost:3000/api";

/* =========================
   UTILS
========================= */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;

  return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2);
}

/* =========================
   DONOR PAGE
========================= */
if (location.pathname.includes("donor.html")) {
  const form = document.getElementById("foodForm");
  const locationInput = document.getElementById("location");
  const getLocationBtn = document.getElementById("getLocationBtn");
  const alertBox = document.getElementById("alert");

  let donorLat = null;
  let donorLng = null;

  getLocationBtn.addEventListener("click", () => {
    navigator.geolocation.getCurrentPosition(
      async pos => {
        donorLat = pos.coords.latitude;
        donorLng = pos.coords.longitude;

        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${donorLat}&lon=${donorLng}`
        );
        const data = await res.json();

        locationInput.value =
          data.display_name || `${donorLat}, ${donorLng}`;

        getLocationBtn.innerText = "✅ Location Set";
      },
      err => {
        alert("Location permission denied");
        console.error(err);
      }
    );
  });

  form.addEventListener("submit", async e => {
    e.preventDefault();

    if (!donorLat || !donorLng) {
      alert("Please click Get Location first");
      return;
    }

    const payload = {
      foodName: form.foodName.value,
      quantity: form.quantity.value,
      location: locationInput.value,
      lat: donorLat,
      lng: donorLng,
      expiry: form.expiry.value,
      phone: form.phone.value
    };

    const res = await fetch(`${API_BASE}/food`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      alert("Failed to post food");
      return;
    }

    alertBox.style.display = "block";
    alertBox.innerText = "✅ Food posted successfully!";
    setTimeout(() => (alertBox.style.display = "none"), 3000);

    form.reset();
    getLocationBtn.innerText = "📍 Get Location";
    donorLat = donorLng = null;
  });
}

/* =========================
   NGO PAGE
========================= */
if (location.pathname.includes("ngo.html")) {
  const foodList = document.getElementById("foodList");
  let ngoLat = null;
  let ngoLng = null;

  navigator.geolocation.getCurrentPosition(pos => {
    ngoLat = pos.coords.latitude;
    ngoLng = pos.coords.longitude;
  });

  async function fetchFoodPosts() {
    const res = await fetch(`${API_BASE}/food`);
    const posts = await res.json();
    renderPosts(posts);
  }

  function renderPosts(posts) {
    foodList.innerHTML = "";

    if (!posts.length) {
      foodList.innerHTML = "<p>No available food posts</p>";
      return;
    }

    posts.forEach(post => {
      if (!post.lat || !post.lng) return;

      const expiry = new Date(post.expiry);
      const diff = expiry - new Date();

      const h = Math.max(Math.floor(diff / 3600000), 0);
      const m = Math.max(Math.floor((diff % 3600000) / 60000), 0);

      let ringColor = "#4caf50";
      if (diff < 30 * 60000) ringColor = "#f44336";
      else if (diff < 60 * 60000) ringColor = "#ff9800";

      const distance =
        ngoLat && ngoLng
          ? `${calculateDistance(ngoLat, ngoLng, post.lat, post.lng)} km away`
          : "Calculating…";

      const card = document.createElement("div");
      card.className = "card";

      card.innerHTML = `
        <h3>${post.foodName}</h3>
        <p><b>Qty:</b> ${post.quantity}</p>
        <p><b>Location:</b> ${post.location}</p>
        <p><b>Phone:</b> ${post.phone}</p>

        <div class="countdown-ring" style="--ring:${ringColor}">
          ${h}h ${m}m
        </div>

        <p class="distance">📍 ${distance}</p>

        <div class="map-container" id="map-${post.id}"></div>

        <div class="card-actions">
          <a class="map-link" target="_blank"
            href="https://maps.google.com?q=${post.lat},${post.lng}">
            📍 Open in Google Maps
          </a>
          <button class="collect-btn" data-id="${post.id}">Collect</button>
        </div>
      `;

      foodList.appendChild(card);
      setTimeout(() => initMap(`map-${post.id}`, post.lat, post.lng), 200);
    });
  }

  function initMap(id, lat, lng) {
    const map = L.map(id, { zoomControl: false }).setView([lat, lng], 15);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
    L.marker([lat, lng]).addTo(map);
  }

  foodList.addEventListener("click", async e => {
    if (!e.target.classList.contains("collect-btn")) return;
    await fetch(`${API_BASE}/food/${e.target.dataset.id}`, { method: "PUT" });
    fetchFoodPosts();
  });

  fetchFoodPosts();
}
