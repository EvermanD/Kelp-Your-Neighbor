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

    const { animate } = anime || {};

function animateMarkers() {
    if (!animate) return;

    animate('.map-count-marker', {
        scale: [0.65, 1],
        opacity: [0, 1],
        duration: 550,
        delay: (_, i) => i * 90,
        easing: 'out(3)'
    });
}

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
                    <strong>${point.count}</strong> open ${
                        point.type === 'pitch'
                            ? (point.count === 1 ? 'pitch' : 'pitches')
                            : (point.count === 1 ? 'gig' : 'gigs')
                    }
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

        const insightElement = document.getElementById("localMapInsight");

        if (insightElement) {
            if (points.length === 0) {
                insightElement.textContent = type === 'pitch'
                    ? 'No pitch activity is available on the map right now.'
                    : 'No gig activity is available on the map right now.';
            } else {
                const topPoint = [...points].sort((a, b) => b.count - a.count)[0];
                insightElement.textContent = `${topPoint.label} currently has the highest ${type === 'pitch' ? 'pitch' : 'gig'} activity with ${topPoint.count} open ${topPoint.count === 1 ? type : `${type}s`}.`;
            }
        }

        window.requestAnimationFrame(() => {
            animateMarkers();
        });

    } catch (error) {
        console.error('Error loading map points:', error);

        const insightElement = document.getElementById("localMapInsight");
        if (insightElement) {
            insightElement.textContent = 'Unable to load local activity insight right now.';
        }
    }
}

    toggleButtons.forEach(button => {
        button.addEventListener('click', () => {
            loadMapPoints(button.dataset.mapType);
        });
    });

    loadMapPoints('gig');
});