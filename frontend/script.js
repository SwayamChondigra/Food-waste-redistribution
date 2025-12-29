// Global variables
const API_BASE = 'http://localhost:3000/api';

// Dark mode toggle functionality
function initDarkMode() {
    const toggle = document.getElementById('darkModeToggle');
    if (toggle) {
        toggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            toggle.textContent = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
        });
    }
}

// Login page: Handle role selection and redirection with enhancements
if (window.location.pathname.includes('login.html')) {
    initDarkMode();
    const roleForm = document.getElementById('roleForm');
    const loadingDiv = document.getElementById('loading');
    const roleCards = document.querySelectorAll('.role-card');

    // Visual selection for role cards
    roleCards.forEach(card => {
        card.addEventListener('click', () => {
            roleCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            card.querySelector('input[type="radio"]').checked = true;
        });
    });

    roleForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const role = document.querySelector('input[name="role"]:checked').value;
        loadingDiv.classList.remove('hidden');
        // Simulate loading for demo feel
        setTimeout(() => {
            window.location.href = role === 'donor' ? 'donor.html' : 'ngo.html';
        }, 1000);
    });
}

// Donor page: Handle food posting
if (window.location.pathname.includes('donor.html')) {
    initDarkMode();
    const foodForm = document.getElementById('foodForm');
    const alertDiv = document.getElementById('alert');
    const getLocationBtn = document.getElementById('getLocationBtn');
    const locationInput = document.getElementById('location');

    getLocationBtn.addEventListener('click', async () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    try {
                        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`);
                        const data = await response.json();
                        if (data && data.display_name) {
                            locationInput.value = data.display_name;
                        } else {
                            locationInput.value = `${lat}, ${lng}`;
                        }
                    } catch (error) {
                        console.error('Error reverse geocoding:', error);
                        locationInput.value = `${lat}, ${lng}`;
                    }
                },
                (error) => {
                    console.error('Error getting location:', error);
                    alert('Unable to get location. Please enter manually.');
                }
            );
        } else {
            alert('Geolocation is not supported by this browser.');
        }
    });

    foodForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            foodName: document.getElementById('foodName').value,
            quantity: document.getElementById('quantity').value,
            location: document.getElementById('location').value,
            expiry: document.getElementById('expiry').value,
            phone: document.getElementById('phone').value
        };

        try {
            const response = await fetch(`${API_BASE}/food`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (response.ok) {
                alertDiv.textContent = 'Food posted successfully!';
                alertDiv.classList.remove('hidden');
                foodForm.reset();
                setTimeout(() => alertDiv.classList.add('hidden'), 3000);
            } else {
                const error = await response.text();
                alertDiv.textContent = error;
                alertDiv.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Error posting food:', error);
            alertDiv.textContent = 'Error posting food. Try again.';
            alertDiv.classList.remove('hidden');
        }
    });
}

// NGO page: Fetch and display food posts, handle collection
if (window.location.pathname.includes('ngo.html')) {
    initDarkMode();
    const foodList = document.getElementById('foodList');

    async function fetchFoodPosts() {
        try {
            const response = await fetch(`${API_BASE}/food`);
            const posts = await response.json();
            displayFoodPosts(posts);
        } catch (error) {
            console.error('Error fetching food posts:', error);
        }
    }

    function displayFoodPosts(posts) {
        foodList.innerHTML = '';
        if (posts.length === 0) {
            foodList.innerHTML = '<p>No available food posts.</p>';
            return;
        }
        posts.forEach(post => {
            const expiryDate = new Date(post.expiry);
            const now = new Date();
            const timeDiff = expiryDate - now;
            let timeRemaining = '';
            if (timeDiff > 0) {
                const hours = Math.floor(timeDiff / (1000 * 60 * 60));
                const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
                timeRemaining = `Expires in ${hours}h ${minutes}m`;
            } else {
                const hours = Math.floor(-timeDiff / (1000 * 60 * 60));
                const minutes = Math.floor((-timeDiff % (1000 * 60 * 60)) / (1000 * 60));
                timeRemaining = `Expired ${hours}h ${minutes}m ago`;
            }
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <h3>${post.foodName}</h3>
                <p><strong>Quantity:</strong> ${post.quantity}</p>
                <p><strong>Location:</strong> ${post.location}</p>
                <p><strong>Time Remaining:</strong> ${timeRemaining}</p>
                <p><strong>Phone:</strong> ${post.phone}</p>
                <button class="btn collect-btn" data-id="${post.id}">Collect</button>
            `;
            foodList.appendChild(card);
        });
    }

    foodList.addEventListener('click', async (e) => {
        if (e.target.classList.contains('collect-btn')) {
            const id = e.target.dataset.id;
            try {
                const response = await fetch(`${API_BASE}/food/${id}`, {
                    method: 'PUT'
                });
                if (response.ok) {
                    fetchFoodPosts(); // Refresh the list
                } else {
                    alert('Error collecting food.');
                }
            } catch (error) {
                console.error('Error collecting food:', error);
                alert('Error collecting food.');
            }
        }
    });

    // Initial fetch
    fetchFoodPosts();

    // Poll for updates every 10 seconds for real-time feel
    setInterval(fetchFoodPosts, 10000);
}
