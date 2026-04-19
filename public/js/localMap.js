document.addEventListener('DOMContentLoaded', () => {
    const mapElement = document.getElementById('localMap');
    const toggleButtons = document.querySelectorAll('[data-map-type]');

    if (!mapElement || typeof L === 'undefined') {
        return;
    }

    const map = L.map('localMap', {
        scrollWheelZoom: true
    }).setView([36.62, -121.80], 10);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    let markersLayer = L.layerGroup().addTo(map);
    let activeType = 'gig';

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function createCountIcon(count, type) {
        return L.divIcon({
            className: '',
            html: `
                <div class="map-count-marker ${type === 'pitch' ? 'map-count-marker-pitch' : 'map-count-marker-gig'}">
                    <span>${count}</span>
                </div>
            `,
            iconSize: [44, 44],
            iconAnchor: [22, 22],
            popupAnchor: [0, -18]
        });
    }

    function buildPopupHtml(point) {
        const filterUrl = point.type === 'pitch'
            ? `/findPitch?location=${encodeURIComponent(point.filterLocation)}`
            : `/findGig?location=${encodeURIComponent(point.filterLocation)}`;

        const topItems = point.items.slice(0, 3).map(item => {
            return `
                <li class="mb-1">
                    <a href="${item.url}" class="map-popup-link">${escapeHtml(item.title)}</a>
                </li>
            `;
        }).join('');

        return `
            <div class="map-popup-content">
                <h6 class="fw-bold mb-2">${escapeHtml(point.label)}</h6>
                <p class="mb-2">
                    <strong>${point.count}</strong> open ${point.type === 'pitch' ? 'pitch' : 'gig'}${point.count === 1 ? '' : 's'}
                </p>

                ${topItems ? `<ul class="ps-3 mb-2">${topItems}</ul>` : '<p class="mb-2">No listings to preview.</p>'}

                <a href="${filterUrl}" class="btn btn-sm btn-dark">View All in ${escapeHtml(point.label)}</a>
            </div>
        `;
    }

    async function loadMapPoints(type) {
        activeType = type;

        toggleButtons.forEach(button => {
            button.classList.toggle('active', button.dataset.mapType === type);
        });

        markersLayer.clearLayers();

        try {
            const response = await fetch(`/api/map-points?type=${encodeURIComponent(type)}`);
            const points = await response.json();

            if (!Array.isArray(points)) {
                return;
            }

            points.forEach(point => {
                const marker = L.marker([point.lat, point.lng], {
                    icon: createCountIcon(point.count, type)
                });

                marker.bindPopup(buildPopupHtml(point), {
                    maxWidth: 280
                });

                marker.addTo(markersLayer);
            });
        } catch (error) {
            console.error('Error loading map points:', error);
        }
    }

    toggleButtons.forEach(button => {
        button.addEventListener('click', () => {
            loadMapPoints(button.dataset.mapType);
        });
    });

    loadMapPoints('gig');
});