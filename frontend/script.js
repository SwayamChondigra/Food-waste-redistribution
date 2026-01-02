const API_BASE = "http://localhost:3000/api";

/* =======================
   DARK MODE (GLOBAL)
======================= */
const darkToggle = document.getElementById("darkModeToggle");

if (localStorage.getItem("theme") === "dark") {
  document.body.classList.add("dark");
}

if (darkToggle) {
  darkToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");

    localStorage.setItem(
      "theme",
      document.body.classList.contains("dark") ? "dark" : "light"
    );
  });
}

/* =======================
   UTILS
======================= */
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

function showToast(message, targetElement = null) {
  const toast = document.createElement("div");
  toast.textContent = message;
  toast.style.position = "absolute";
  toast.style.background = message.includes("❌") ? "#dc3545" : "#28a745";
  toast.style.color = "white";
  toast.style.padding = "10px 15px";
  toast.style.borderRadius = "5px";
  toast.style.zIndex = "1000";
  toast.style.left = "50%";
  toast.style.transform = "translateX(-50%)";
  toast.style.marginTop = "10px";

  if (targetElement) {
    targetElement.style.position = "relative";
    targetElement.appendChild(toast);
  } else {
    toast.style.position = "fixed";
    toast.style.top = "20px";
    toast.style.right = "20px";
    document.body.appendChild(toast);
  }

  setTimeout(() => toast.remove(), 3000);
}

/* =======================
   LOGIN PAGE
======================= */
const roleForm = document.getElementById("roleForm");
if (roleForm) {
  const proceedBtn = document.querySelector(".proceed-btn");

  document.querySelectorAll(".role-card").forEach(card => {
    card.addEventListener("click", () => {
      document.querySelectorAll(".role-card")
        .forEach(c => c.classList.remove("selected"));

      card.classList.add("selected");
      card.querySelector("input").checked = true;
      proceedBtn.disabled = false;
    });
  });

  roleForm.addEventListener("submit", e => {
    e.preventDefault();
    const role = document.querySelector("input[name=role]:checked").value;
    localStorage.setItem("role", role);
    location.href = role === "donor" ? "donor.html" : "ngo.html";
  });
}

/* =======================
   DONOR PAGE
======================= */
if (location.pathname.includes("donor.html")) {
  if (localStorage.getItem("role") !== "donor") {
    location.href = "login.html";
  }

  const form = document.getElementById("foodForm");
  const locationInput = document.getElementById("location");
  const getLocationBtn = document.getElementById("getLocationBtn");
  const alertBox = document.getElementById("alert");

  let lat = null;
  let lng = null;

  getLocationBtn.onclick = () => {
    if (!navigator.geolocation) {
      alert("Geolocation not supported");
      return;
    }

    getLocationBtn.textContent = "⏳ Getting location...";

    navigator.geolocation.getCurrentPosition(
      async pos => {
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
          );
          const data = await res.json();
          locationInput.value = data.display_name;
        } catch {
          locationInput.value = `${lat}, ${lng}`;
        }

        getLocationBtn.textContent = "✅ Location Set";
      },
      () => {
        alert("Location permission denied");
        getLocationBtn.textContent = "📍 Get Location";
      }
    );
  };

  form.addEventListener("submit", async e => {
    e.preventDefault();

    if (!lat || !lng) {
      alertBox.textContent = "⚠️ Please click Get Location first";
      alertBox.classList.remove("hidden");
      return;
    }

    const payload = {
      foodName: foodName.value,
      quantity: quantity.value,
      location: locationInput.value,
      lat,
      lng,
      expiry: expiry.value,
      phone: phone.value
    };

    try {
      const res = await fetch(`${API_BASE}/food`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error();

      alertBox.textContent = "✅ Food posted successfully!";
      alertBox.classList.remove("hidden");

      setTimeout(() => alertBox.classList.add("hidden"), 3000);

      form.reset();
      lat = lng = null;
      getLocationBtn.textContent = "📍 Get Location";
    } catch {
      alertBox.textContent = "❌ Failed to post food";
      alertBox.classList.remove("hidden");
    }
  });
}

/* =======================
   NGO PAGE
======================= */
/* =========================
   NGO PAGE
========================= */
if (location.pathname.includes("ngo.html")) {

  if (localStorage.getItem("role") !== "ngo") {
    location.href = "login.html";
  }

  const foodList = document.getElementById("foodList");

  let ngoLat = null;
  let ngoLng = null;

  // Get NGO location first
  navigator.geolocation.getCurrentPosition(
    pos => {
      ngoLat = pos.coords.latitude;
      ngoLng = pos.coords.longitude;
      fetchFoodPosts();
    },
    () => {
      fetchFoodPosts(); // still load posts
    }
  );

  async function fetchFoodPosts() {
    try {
      const res = await fetch("http://localhost:3000/api/food");
      const posts = await res.json();
      renderPosts(posts);
    } catch {
      foodList.innerHTML = "<p>Failed to load food posts</p>";
    }
  }

  function renderPosts(posts) {
    foodList.innerHTML = "";

    if (!posts.length) {
      foodList.innerHTML = "<p>No available food</p>";
      return;
    }

    posts.forEach(post => {
      const card = document.createElement("div");
      card.className = "card";

      card.innerHTML = `
        <span class="status">Available</span>
        <h3>${post.foodName}</h3>
        <p><b>Qty:</b> ${post.quantity}</p>
        <p><b>Location:</b> ${post.location}</p>
        <p><b>Phone:</b> ${post.phone}</p>

        <div class="countdown-ring"
          style="--ring:#f59e0b; --percent:60">
          0h 45m
        </div>

        <p class="distance">📍 ${calculateDistanceText(post)}</p>

        <div class="map-container">
          <iframe
            loading="lazy"
            src="https://www.google.com/maps?q=${post.lat},${post.lng}&z=15&output=embed">
          </iframe>
        </div>

        <div class="card-actions">
          <a target="_blank"
             href="https://maps.google.com?q=${post.lat},${post.lng}">
            📍 Open in Maps
          </a>
          <button class="collect-btn" data-id="${post.id}">Collect</button>
        </div>
      `;

      foodList.appendChild(card);
    });
  }

  /* ✅ EVENT DELEGATION FOR COLLECT BUTTON */

  foodList.addEventListener("click", async e => {
    if (!e.target.classList.contains("collect-btn")) return;

    const button = e.target;
    const card = button.closest(".card");
    const postId = button.dataset.id;

    try {
      const res = await fetch(`${API_BASE}/food/${postId}`, {
        method: "PUT"
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to collect food");
      }

      // Success feedback
      showToast("✅ Food collected", card);

      // Smooth remove
      card.style.opacity = "0";
      setTimeout(() => card.remove(), 400);
    } catch (error) {
      showToast(`❌ ${error.message}`, card);
    }
  });

  function calculateDistanceText(post) {
    if (!ngoLat || !ngoLng) return "Distance unknown";

    return (
      distance(ngoLat, ngoLng, post.lat, post.lng) + " km away"
    );
  }
}

function distance(a, b, c, d) {
  const R = 6371;
  const dLat = (c - a) * Math.PI / 180;
  const dLon = (d - b) * Math.PI / 180;

  return (
    R * 2 *
    Math.asin(
      Math.sqrt(
        Math.sin(dLat / 2) ** 2 +
        Math.cos(a * Math.PI / 180) *
        Math.cos(c * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2
      )
    )
  ).toFixed(2);
}
