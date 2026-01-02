const express = require("express");
const path = require("path");

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend")));

// Serve login page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/login.html"));
});

// In-memory DB
let foodPosts = [];

/* =========================
   AUTO EXPIRE CLEANUP
========================= */
setInterval(() => {
  const now = new Date();
  foodPosts.forEach(post => {
    if (post.status === "Available" && post.expiry <= now) {
      post.status = "Expired";
    }
  });
}, 60 * 1000); // every 1 minute

/* =========================
   POST FOOD
========================= */
app.post("/api/food", (req, res) => {
  const { foodName, quantity, location, lat, lng, expiry, phone } = req.body;

  if (!foodName || !quantity || !location || !expiry || !phone) {
    return res.status(400).json({ message: "All fields required" });
  }

  const expiryDate = new Date(expiry);
  if (expiryDate <= new Date()) {
    return res.status(400).json({ message: "Expiry must be in future" });
  }

  const post = {
    id: Date.now(),
    foodName,
    quantity,
    location,
    lat: Number(lat),
    lng: Number(lng),
    expiry: expiryDate,
    phone,
    status: "Available",
    createdAt: new Date()
  };

  foodPosts.push(post);
  res.status(201).json(post);
});

/* =========================
   GET FOOD FOR NGO
========================= */
app.get("/api/food", (req, res) => {
  const now = new Date();

  const available = foodPosts.filter(
    p => p.status === "Available" && p.expiry > now
  );

  res.json(available);
});

/* =========================
   COLLECT FOOD
========================= */
app.put("/api/food/:id", (req, res) => {
  const post = foodPosts.find(p => p.id == req.params.id);
  if (!post) {
    return res.status(404).json({ message: "Food not found" });
  }

  if (post.status === "Collected") {
    return res.status(400).json({ message: "Already collected" });
  }

  if (post.status === "Expired" || post.expiry <= new Date()) {
    post.status = "Expired";
    return res.status(400).json({ message: "Food expired" });
  }

  post.status = "Collected";
  res.json({
    message: "Food collected successfully",
    post
  });
});

app.listen(PORT, () =>
  console.log(`✅ Server running → http://localhost:${PORT}`)
);
