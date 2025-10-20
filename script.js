// Initialize the map centered on Kampala
const map = L.map('map').setView([0.3176, 32.5825], 12);

// Store tile layer for theme switching
let tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
}).addTo(map);

// Define custom icons for different health center types
const icons = {
    'Hospital': L.divIcon({
        html: '<div style="background: #e74c3c; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>',
        className: 'custom-icon',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    }),
    'Clinic': L.divIcon({
        html: '<div style="background: #3498db; width: 25px; height: 25px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>',
        className: 'custom-icon',
        iconSize: [25, 25],
        iconAnchor: [12.5, 12.5]
    }),
    'Dispensary': L.divIcon({
        html: '<div style="background: #2ecc71; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>',
        className: 'custom-icon',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    })
};

// Store markers for search functionality
let markers = [];

// Add GeoJSON layer to the map
L.geoJSON(healthCentersData, {
    pointToLayer: function(feature, latlng) {
        const icon = icons[feature.properties.type] || icons['Clinic'];
        const marker = L.marker(latlng, { icon: icon });
        markers.push({
            marker: marker,
            name: feature.properties.name,
            properties: feature.properties,
            latlng: latlng
        });
        return marker;
    },
    onEachFeature: function(feature, layer) {
        const props = feature.properties;
        const popupContent = `
            <div class="popup-content">
                <h3>${props.name}</h3>
                <p><strong>Type:</strong> ${props.type}</p>
                <p><strong>Contact:</strong> ${props.contact}</p>
                <p><strong>Description:</strong> ${props.description}</p>
            </div>
        `;
        layer.bindPopup(popupContent);
    }
}).addTo(map);

// Calculate statistics
function updateStats() {
    const stats = {
        total: healthCentersData.features.length,
        hospitals: healthCentersData.features.filter(f => f.properties.type === 'Hospital').length,
        clinics: healthCentersData.features.filter(f => f.properties.type === 'Clinic').length,
        dispensaries: healthCentersData.features.filter(f => f.properties.type === 'Dispensary').length
    };

    document.getElementById('totalCount').textContent = stats.total;
    document.getElementById('hospitalCount').textContent = stats.hospitals;
    document.getElementById('clinicCount').textContent = stats.clinics;
    document.getElementById('dispensaryCount').textContent = stats.dispensaries;
}

updateStats();

// Add legend
const legend = L.control({ position: 'bottomright' });
legend.onAdd = function(map) {
    const div = L.DomUtil.create('div', 'legend');
    div.innerHTML = `
        <h4>Legend</h4>
        <i style="background: #e74c3c;"></i> Hospital<br>
        <i style="background: #3498db;"></i> Clinic<br>
        <i style="background: #2ecc71;"></i> Dispensary
    `;
    return div;
};
legend.addTo(map);

// User location marker
let userMarker = null;

// Theme toggle functionality
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    document.getElementById('themeIcon').textContent = newTheme === 'dark' ? '☀️' : '🌙';
}

// Search function
function searchHealthCenter() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    const resultsDiv = document.getElementById('searchResults');
    
    if (!searchTerm) {
        resultsDiv.innerHTML = '<span style="color: #e74c3c;">Please enter a search term</span>';
        return;
    }

    const found = markers.filter(m => 
        m.name.toLowerCase().includes(searchTerm)
    );

    if (found.length > 0) {
        const firstResult = found[0];
        map.setView(firstResult.latlng, 15);
        firstResult.marker.openPopup();
        
        if (found.length === 1) {
            resultsDiv.innerHTML = `<span style="color: #2ecc71;">✓ Found: ${firstResult.name}</span>`;
        } else {
            resultsDiv.innerHTML = `<span style="color: #2ecc71;">✓ Found ${found.length} results. Showing: ${firstResult.name}</span>`;
        }
    } else {
        resultsDiv.innerHTML = '<span style="color: #e74c3c;">No health centers found with that name</span>';
    }
}

// Show user's current location
function showMyLocation() {
    const resultsDiv = document.getElementById('searchResults');
    
    if (!navigator.geolocation) {
        resultsDiv.innerHTML = '<span style="color: #e74c3c;">Geolocation is not supported by your browser</span>';
        return;
    }

    resultsDiv.innerHTML = '<span style="color: #3498db;">🔍 Locating you...</span>';

    navigator.geolocation.getCurrentPosition(
        function(position) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            if (userMarker) {
                map.removeLayer(userMarker);
            }

            const userIcon = L.divIcon({
                html: '<div style="background: #f39c12; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 20px rgba(243, 156, 18, 0.8); animation: pulse 2s infinite;"></div><style>@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.2); } }</style>',
                className: 'user-location-icon',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            });

            userMarker = L.marker([lat, lng], { icon: userIcon })
                .addTo(map)
                .bindPopup('<div class="popup-content"><h3>📍 Your Location</h3><p>You are here!</p></div>');

            map.setView([lat, lng], 14);
            resultsDiv.innerHTML = '<span style="color: #2ecc71;">✓ Your location is now shown on the map</span>';
        },
        function(error) {
            let errorMsg = 'Unable to retrieve your location';
            if (error.code === error.PERMISSION_DENIED) {
                errorMsg = 'Location access denied. Please enable location permissions.';
            }
            resultsDiv.innerHTML = `<span style="color: #e74c3c;">${errorMsg}</span>`;
        }
    );
}

// Enable search on Enter key
document.getElementById('searchInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        searchHealthCenter();
    }
});