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

document.querySelectorAll(".role-card").forEach(card => {
  card.addEventListener("click", () => {
    document
      .querySelectorAll(".role-card")
      .forEach(c => c.classList.remove("selected"));

    card.classList.add("selected");
    card.querySelector("input").checked = true;
  });
});


/* =========================
   DONOR PAGE
========================= */
/* =========================
   DONOR PAGE GUARD
========================= */
if (location.pathname.includes("donor.html")) {
  const role = localStorage.getItem("role");

  if (role !== "donor") {
    window.location.replace("login.html");
  }
}

if (location.pathname.includes("donor.html")) {
  const form = document.getElementById("foodForm");
  const locationInput = document.getElementById("location");
  const getLocationBtn = document.getElementById("getLocationBtn");
  const alertBox = document.getElementById("alert");
  const toggleBtn = document.getElementById("darkModeToggle");

  /* 🌙 Dark mode */
  if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark");
  }

  toggleBtn.onclick = () => {
    document.body.classList.toggle("dark");
    localStorage.setItem(
      "theme",
      document.body.classList.contains("dark") ? "dark" : "light"
    );
  };

  let donorLat = null;
  let donorLng = null;

  /* 📍 Get Location */
  getLocationBtn.addEventListener("click", () => {
    if (!navigator.geolocation) {
      alert("Geolocation not supported");
      return;
    }

    getLocationBtn.innerText = "⏳ Getting location...";

    navigator.geolocation.getCurrentPosition(
      async pos => {
        donorLat = pos.coords.latitude;
        donorLng = pos.coords.longitude;

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${donorLat}&lon=${donorLng}`
          );
          const data = await res.json();

          locationInput.value =
            data.display_name || `${donorLat}, ${donorLng}`;
        } catch {
          locationInput.value = `${donorLat}, ${donorLng}`;
        }

        getLocationBtn.innerText = "✅ Location Set";
      },
      err => {
        alertBox.classList.remove("hidden");
        alertBox.innerText = "❌ Location permission denied";
        getLocationBtn.innerText = "📍 Get Location";
        console.error(err);
      }
    );
  });

  /* 📤 Submit Food */
  form.addEventListener("submit", async e => {
  e.preventDefault();

  if (!donorLat || !donorLng) {
    alert("Please click Get Location first");
    return;
  }

  const btn = document.querySelector(".submit-btn");
  const text = btn.querySelector(".btn-text");
  const spinner = btn.querySelector(".spinner");

  // Start animation
  text.textContent = "Posting...";
  spinner.classList.remove("hidden");
  btn.disabled = true;

  const payload = {
    foodName: form.foodName.value,
    quantity: form.quantity.value,
    location: locationInput.value,
    lat: donorLat,
    lng: donorLng,
    expiry: form.expiry.value,
    phone: form.phone.value
  };

  try {
    const res = await fetch(`${API_BASE}/food`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error("Failed");

    alertBox.textContent = "✅ Food posted successfully!";
    alertBox.style.display = "block";
    alertBox.classList.add("success-pop");

    form.reset();
    donorLat = donorLng = null;
  } catch {
    alert("Failed to post food");
  }

  // Reset button
  setTimeout(() => {
    spinner.classList.add("hidden");
    text.textContent = "Post Food";
    btn.disabled = false;
  }, 1000);
});

  
} 



/* =========================
   NGO PAGE GUARD
========================= */
if (location.pathname.includes("ngo.html")) {
  const role = localStorage.getItem("role");

  if (role !== "ngo") {
    window.location.replace("login.html");
  }
}

if (location.pathname.includes("ngo.html")) {
  const foodList = document.getElementById("foodList");
  const toggleBtn = document.getElementById("darkModeToggle");

  /* 🌙 Dark mode */
  if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark");
  }

  toggleBtn.onclick = () => {
    document.body.classList.toggle("dark");
    localStorage.setItem(
      "theme",
      document.body.classList.contains("dark") ? "dark" : "light"
    );
  };

  let ngoLat = null;
  let ngoLng = null;

  navigator.geolocation.getCurrentPosition(pos => {
    ngoLat = pos.coords.latitude;
    ngoLng = pos.coords.longitude;
  });

  async function fetchFoodPosts() {
  const res = await fetch(`${API_BASE}/food`);
  const posts = await res.json();

  console.log("NGO posts from API:", posts); // ✅ correct place

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

      const total = 2 * 60 * 60 * 1000;
      const percent = Math.max(Math.min(diff / total, 1), 0);

      let ringColor = "#4caf50";
      if (diff < 30 * 60000) ringColor = "#f44336";
      else if (diff < 60 * 60000) ringColor = "#ff9800";

      const h = Math.max(Math.floor(diff / 3600000), 0);
      const m = Math.max(Math.floor((diff % 3600000) / 60000), 0);

      const distance =
        ngoLat && ngoLng
          ? `${calculateDistance(ngoLat, ngoLng, post.lat, post.lng)} km away`
          : "Calculating…";

      const card = document.createElement("div");
      card.className = "card";

      let status = "Available";
      if (diff < 30 * 60000) status = "Urgent";

      card.innerHTML = `
        <span class="status">${status}</span>
        <h3>${post.foodName}</h3>
        <p><b>Qty:</b> ${post.quantity}</p>
        <p><b>Location:</b> ${post.location}</p>
        <p><b>Phone:</b> ${post.phone}</p>

        <div class="countdown-ring"
          style="--ring:${ringColor}; --percent:${percent * 100}">
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
      enableSwipe(card, post.id);
      setTimeout(() => initMap(`map-${post.id}`, post.lat, post.lng), 100);
    });
  }

  function initMap(id, lat, lng) {
  if (typeof L === "undefined") {
    setTimeout(() => initMap(id, lat, lng), 100);
    return;
  }

  const map = L.map(id, { zoomControl: false }).setView([lat, lng], 15);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
  L.marker([lat, lng]).addTo(map);
}


  let collectTimeout = null;
  let pendingCollectId = null;

foodList.addEventListener("click", async e => {
  const btn = e.target.closest(".collect-btn");
  if (!btn) return;

  const card = btn.closest(".card");
  const id = btn.dataset.id;

  btn.classList.add("loading");
  btn.textContent = "Collecting...";
  btn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/food/${id}`, {
      method: "PUT"
    });

    if (!res.ok) throw new Error();

    // Animate removal
    card.classList.add("fade-out");

    setTimeout(() => {
      card.remove();
    }, 400);
  } catch {
    alert("Failed to collect food");
    btn.textContent = "Collect";
    btn.disabled = false;
    btn.classList.remove("loading");
  }
});


function showCollectToast() {
  const toast = document.getElementById("collectToast");
  if (!toast) return;

  toast.classList.remove("hidden");
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.classList.add("hidden"), 300);
  }, 2000);
}
fetchFoodPosts();

// 🔄 Auto refresh food list every 10 seconds
setInterval(fetchFoodPosts, 10000);

}

function enableSwipe(card, postId) {
  let startX = 0;

  card.addEventListener("touchstart", e => {
    startX = e.touches[0].clientX;
  });

  card.addEventListener("touchend", e => {
    const endX = e.changedTouches[0].clientX;
    if (endX - startX > 80) {
      pendingCollectId = postId;
      showCollectToast();

      collectTimeout = setTimeout(async () => {
        await fetch(`${API_BASE}/food/${postId}`, { method: "PUT" });
        fetchFoodPosts();
      }, 5000);
    }
  });
}

/* =========================
   LOGIN INTERACTIONS
========================= */
const roleForm = document.getElementById("roleForm");
const proceedBtn = document.querySelector(".proceed-btn");
const roleCards = document.querySelectorAll(".role-card");

if (roleForm && proceedBtn) {
  roleCards.forEach(card => {
    card.addEventListener("click", () => {
      roleCards.forEach(c => c.classList.remove("selected"));
      card.classList.add("selected");
      card.querySelector("input").checked = true;

      proceedBtn.disabled = false; // ✅ enable button
    });
  });

  roleForm.addEventListener("submit", e => {
    e.preventDefault();

    const selected = document.querySelector(
      'input[name="role"]:checked'
    );
    if (!selected) return;

    // ✅ save role
localStorage.setItem("role", selected.value);

// 🎬 redirect
window.location.href =
  selected.value === "donor"
    ? "donor.html"
    : "ngo.html";

    }, 450);
  };


