// CONFIGURACIÓN

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const OSRM_URL = "https://router.project-osrm.org/route/v1";
const DEFAULT_LOCATION = "Morelos, México";

// DOM

const searchInput = document.getElementById("search-input");
const searchButton = document.getElementById("search-button");
const menuItems = document.querySelectorAll(".menu-item");
const categoryItems = document.querySelectorAll(".category-item");
const mapCategoryItems = document.querySelectorAll(".map-category");

// MAPA

const map = L.map("map", {
    zoomControl: false,
}).setView([18.6813, -99.1013], 10);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',

    maxZoom: 19,
}).addTo(map);

// VARIABLES

let searchMarker = null;
let routeLayer = null;
let placeMarkers = [];
let selectedCategory = "todos";

// COLORES POR CATEGORÍA

const CATEGORY_CONFIG = {
    restaurante: {
        color: "#ff8a00",
        icon: "fa-utensils",
    },

    tienda: {
        color: "#a72cff",
        icon: "fa-bag-shopping",
    },

    parque: {
        color: "#16c765",
        icon: "fa-tree",
    },

    favoritos: {
        color: "#f00",
        icon: "fa-star",
    },

    otro: {
        color: "#1597ff",
        icon: "fa-ellipsis",
    },

    todo: {
        color: "#00b8ff",
        icon: "fa-layer-group",
    },
};

// ICONO DE MARCADOR

function createMarkerIcon(category) {
    const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.otro;

    return L.divIcon({
        className: "custom-map-marker",

        html: `
            <div class="marker-pin" style="background: ${config.color};">
                <i class="fa-solid ${config.icon}"></i>
            </div>
        `,

        iconSize: [34, 34],
        iconAnchor: [17, 34],
        popupAnchor: [0, -34],
    });
}

// NOMINATIM

async function geocodeAddress(query) {
    if (!query || !query.trim()) {
        return null;
    }

    try {
        const response = await fetch(
            `${NOMINATIM_URL}?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`,
            {
                headers: {
                    "Accept-Language": "es",
                },
            },
        );

        if (!response.ok) {
            throw new Error("No se pudo consultar Nominatim.");
        }

        const results = await response.json();

        if (!results.length) {
            return null;
        }

        return results;
    } catch (error) {
        console.error("Error de geocodificación:", error);
        return null;
    }
}

// BÚSQUEDA

async function performSearch() {
    const query = searchInput.value.trim();

    if (!query) {
        return;
    }

    searchButton.disabled = true;
    searchButton.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`;

    const results = await geocodeAddress(query);

    searchButton.disabled = false;
    searchButton.innerHTML = `<i class="fa-solid fa-magnifying-glass"></i>`;

    if (!results) {
        alert("No se encontró ninguna ubicación.");
        return;
    }

    showSearchResult(results[0]);
}

searchButton.addEventListener("click", performSearch);

searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        performSearch();
    }
});

// MOSTRAR RESULTADO DE BÚSQUEDA

function showSearchResult(result) {
    const latitude = parseFloat(result.lat);
    const longitude = parseFloat(result.lon);

    if (searchMarker) {
        map.removeLayer(searchMarker);
    }

    searchMarker = L.marker([latitude, longitude]).addTo(map);

    searchMarker
        .bindPopup(
        `
            <strong>
                ${result.display_name}
            </strong>
        `,
        )
        .openPopup();

    map.setView([latitude, longitude], 16);
}

// MARCADORES DE LUGARES GUARDADOS

function renderPlaceMarkers() {
    placeMarkers.forEach((marker) => {
        map.removeLayer(marker);
    });

    placeMarkers = [];

    const places = getPlaces();

    places.forEach((place) => {
        if (!place.coordinates) {
            return;
        }

        if (
            selectedCategory !== "todos" &&
            selectedCategory !== "favoritos" &&
            place.category !== selectedCategory
        ) {
            return;
        }

        if (selectedCategory === "favoritos" && !place.favorite) {
            return;
        }

        const marker = L.marker(
            [place.coordinates.latitude, place.coordinates.longitude],
        {
            icon: createMarkerIcon(place.category),
        },
        ).addTo(map);

        marker.bindPopup(createPlacePopup(place));
        marker.placeId = place.id;
        placeMarkers.push(marker);
    });
}

// POPUP DE LUGAR

function createPlacePopup(place) {
    const favoriteText = place.favorite ? "⭐ Favorito" : "";

    return `
        <div class="place-popup">
            <strong>${escapeHTML(place.name)}</strong>
            <span>${escapeHTML(place.category)}</span>

            ${
              place.address
                ? `
                    <small>
                        ${escapeHTML(place.address)}
                    </small>
                    `
                : ""
            }

            ${
              favoriteText
                ? `
                    <small>
                        ${favoriteText}
                    </small>
                    `
                : ""
            }

            <button class="popup-route-button" onclick="createRouteFromPlace('${place.id}')">
                <i class="fa-solid fa-route"></i>
                Crear ruta desde aquí
            </button>
        </div>
    `;
}

// ESCAPAR HTML

function escapeHTML(value) {
    const div = document.createElement("div");
    div.textContent = value || "";
    return div.innerHTML;
}

// RENDERIZAR LUGARES RECIENTES

function renderRecentPlaces() {
    const container = document.getElementById("recent-list");
    const places = getPlaces();

    if (!places.length) {
        container.innerHTML = `
            <div class="empty-panel">
                <i class="fa-solid fa-location-dot"></i>

                <p>Todavía no tienes lugares guardados.</p>

                <button type="button" onclick="openPlaceModal()">
                    Agregar primer lugar
                </button>
            </div>
        `;

        return;
    }

    container.innerHTML = places
        .slice(0, 5)
        .map((place) => {
        const config = CATEGORY_CONFIG[place.category] || CATEGORY_CONFIG.otro;

        return `
            <article class="recent-item" data-place-id="${place.id}">
                <span class="place-marker" style="background: ${config.color};">
                    <i class="fa-solid ${config.icon}"></i>
                </span>

                <div>
                    <strong>${escapeHTML(place.name)}</strong>
                    <span>${escapeHTML(place.category)}</span>
                </div>

                <button type="button" onclick="focusPlace('${place.id}')">
                    <i class="fa-solid fa-ellipsis-vertical"></i>
                </button>
            </article>
        `;
    })
    .join("");
}

// ENFOCAR LUGAR

function focusPlace(placeId) {
    const places = getPlaces();
    const place = places.find((item) => String(item.id) === String(placeId));

    if (!place || !place.coordinates) {
        return;
    }

    changeView("mapa");
    map.setView([place.coordinates.latitude, place.coordinates.longitude], 16);

    const marker = placeMarkers.find(
        (item) => String(item.placeId) === String(placeId),
    );

    if (marker) {
        marker.openPopup();
    }
}

// CATEGORÍAS

function selectCategory(category) {
    selectedCategory = category;

    categoryItems.forEach((item) => {
        item.classList.toggle("active", item.dataset.category === category);
    });

    mapCategoryItems.forEach((item) => {
        item.classList.toggle("active", item.dataset.category === category);
    });

    renderPlaceMarkers();
}

categoryItems.forEach((item) => {
    item.addEventListener("click", () => {
        selectCategory(item.dataset.category);
    });
});

mapCategoryItems.forEach((item) => {
    item.addEventListener("click", () => {
        selectCategory(item.dataset.category);
    });
});

// NAVEGACIÓN

function changeView(viewName) {
    const views = document.querySelectorAll(".vista");

    views.forEach((view) => {
        view.classList.remove("activa");
    });

    const viewId = `vista${viewName.charAt(0).toUpperCase()}${viewName.slice(1)}`;
    const target = document.getElementById(viewId);

    if (target) {
        target.classList.add("activa");
    }

    menuItems.forEach((item) => {
        item.classList.toggle("active", item.dataset.view === viewName);
    });

    if (viewName === "mapa") {
        setTimeout(() => {
        map.invalidateSize();
        }, 100);
    }

    if (viewName === "rutas") {
        renderSavedRoutes();
    }

    if (viewName === "favoritos") {
        renderFavorites();
    }
}

menuItems.forEach((item) => {
    item.addEventListener("click", () => {
        changeView(item.dataset.view);
    });
});

// MODAL LUGAR

const placeModal = document.getElementById("add-place-modal");

function openPlaceModal() {
    placeModal.classList.add("visible");
}

function closePlaceModal() {
    placeModal.classList.remove("visible");
}

document
    .getElementById("add-place-button")
    .addEventListener("click", openPlaceModal);

document
    .getElementById("close-modal")
    .addEventListener("click", closePlaceModal);

document
    .getElementById("cancel-modal")
    .addEventListener("click", closePlaceModal);

// GUARDAR LUGAR

document
    .getElementById("place-form")
    .addEventListener("submit", async (event) => {
        event.preventDefault();

        const name = document.getElementById("place-name").value.trim();
        const category = document.getElementById("place-category").value;
        const reference = document.getElementById("place-reference").value.trim();
        const address = document.getElementById("place-address").value.trim();
        const notes = document.getElementById("place-notes").value.trim();
        const favorite = document.getElementById("place-favorite").checked;
        const submitButton = event.target.querySelector('button[type="submit"]');

        submitButton.disabled = true;
        submitButton.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Guardando...`;

        const results = await geocodeAddress(address);

        if (!results) {
            alert("No se encontró la dirección.");
            submitButton.disabled = false;
            submitButton.innerHTML = `<i class="fa-solid fa-check"></i> Guardar lugar`;
            return;
        }

        const result = results[0];

        const place = {
        id: Date.now(),
        name,
        category,
        reference,
        address,
        notes,
        favorite,
        coordinates: {
            latitude: parseFloat(result.lat),
            longitude: parseFloat(result.lon),
        },
        createdAt: new Date().toISOString(),
        };

        addPlace(place);

        addActivity({
            id: Date.now(),
            type: "place_created",
            text: `Guardaste el lugar "${name}".`,
            date: new Date().toISOString(),
        });

        event.target.reset();
        closePlaceModal();
        renderPlaceMarkers();
        renderRecentPlaces();

        map.setView([place.coordinates.latitude, place.coordinates.longitude], 16);
        submitButton.disabled = false;
        submitButton.innerHTML = `<i class="fa-solid fa-check"></i> Guardar lugar`;
    });


// MODAL RUTA

const routeModal = document.getElementById("route-modal");

function openRouteModal() {
    routeModal.classList.add("visible");
}

function closeRouteModal() {
    routeModal.classList.remove("visible");
}

document
    .getElementById("new-route-button")
    .addEventListener("click", openRouteModal);

document
    .getElementById("new-route-page-button")
    .addEventListener("click", openRouteModal);

document
    .getElementById("close-route-modal")
    .addEventListener("click", closeRouteModal);

document
    .getElementById("cancel-route-modal")
    .addEventListener("click", closeRouteModal);

// CREAR RUTA

document
    .getElementById("route-form")
    .addEventListener("submit", async (event) => {

        event.preventDefault();

        const name = document.getElementById("route-name").value.trim();
        const originText = document.getElementById("route-origin").value.trim();

        const destinationText = document
        .getElementById("route-destination")
        .value.trim();

        const status = document.getElementById("route-status");
        const button = document.getElementById("calculate-route-button");

        status.textContent = "Buscando las ubicaciones...";
        button.disabled = true;

        const origin = await getCoordinates(originText);

        if (!origin) {
            status.textContent = "No se encontró el origen.";
            button.disabled = false;
            return;
        }

        const destination = await getCoordinates(destinationText);

        if (!destination) {
            status.textContent = "No se encontró el destino.";
            button.disabled = false;
            return;
        }

        status.textContent = "Calculando ruta...";

        const routes = await getRoute(origin, destination);

        if (!routes || !routes.length) {
            status.textContent = "No se pudo calcular una ruta.";
            button.disabled = false;
            return;
        }

        const mainRoute = routes[0];

        // DIBUJAR

        drawRoute(routes);

        // GUARDAR

        const route = {
            id: Date.now(),
            name,

            origin: {
                name: origin.name,
                latitude: origin.latitude,
                longitude: origin.longitude,
            },

            destination: {
                name: destination.name,
                latitude: destination.latitude,
                longitude: destination.longitude,
            },

            distance: mainRoute.distance,
            duration: mainRoute.duration,
            alternatives: routes.length,
            createdAt: new Date().toISOString(),
        };

        addRoute(route);

        addActivity({
            id: Date.now(),
            type: "route_created",
            text: `Creaste la ruta "${name}".`,
            date: new Date().toISOString(),
        });

        renderRoutePanel();
        renderSavedRoutes();

        status.textContent = "Ruta guardada correctamente.";

        setTimeout(() => {
            closeRouteModal();
        }, 700);

        button.disabled = false;
    });

// COORDENADAS

async function getCoordinates(query) {
    const results = await geocodeAddress(query);

    if (!results) {
        return null;
    }

    return {
        latitude: parseFloat(results[0].lat),
        longitude: parseFloat(results[0].lon),
        name: results[0].display_name,
    };
}

// OSRM

async function getRoute(origin, destination) {
    const coordinates = [
        `${origin.longitude},${origin.latitude}`,
        `${destination.longitude},${destination.latitude}`,
    ].join(";");

    try {
        const response = await fetch(
            `${OSRM_URL}/driving/${coordinates}?overview=full&geometries=geojson&alternatives=true`,
        );

        if (!response.ok) {
            throw new Error("Error de OSRM.");
        }

        const data = await response.json();

        if (data.code !== "Ok" || !data.routes || !data.routes.length) {
            return null;
        }

        return data.routes;

    } catch (error) {
        console.error("Error calculando ruta:", error);
        return null;
    }
}

// DIBUJAR RUTA

function drawRoute(routes) {
    if (!routes || !routes.length) {
        return;
    }

    if (routeLayer) {
        map.removeLayer(routeLayer);
    }

    const features = routes.map((route, index) => {
        return {
            type: "Feature",

            properties: {
                routeIndex: index,
            },

            geometry: route.geometry,
        };
    });

    routeLayer = L.geoJSON(features, {
        style: (feature) => {
            const main = feature.properties.routeIndex === 0;

            return {
                color: main ? "#ffd166" : "#70839e",
                weight: main ? 6 : 4,
                opacity: main ? 0.95 : 0.5,
            };
        },
    }).addTo(map);

    map.fitBounds(routeLayer.getBounds(), {
        padding: [50, 50],
    });
}

// FORMATEAR DISTANCIA

function formatDistance(distance) {
    const km = distance / 1000;

    if (km < 1) {
        return `${Math.round(distance)} m`;
    }

    return `${km.toFixed(1)} km`;
}

// FORMATEAR DURACIÓN

function formatDuration(duration) {
    const minutes = Math.round(duration / 60);
    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;

    if (hours === 0) {
        return `${remaining} min`;
    }

    if (remaining === 0) {
        return `${hours} h`;
    }

    return `${hours} h ${remaining} min`;
}

// PANEL DE RUTAS

function renderRoutePanel() {
    const container = document.getElementById("route-list");
    const routes = getRoutes();

    if (!routes.length) {
        container.innerHTML = `
            <div class="empty-panel">
                <i class="fa-solid fa-route"></i>
                <p>
                    Todavía no tienes rutas guardadas.
                </p>
            </div>
        `;

        return;
    }

    container.innerHTML = routes
        .slice(0, 4)
        .map((route, index) => {
        const colors = ["blue", "orange", "purple", "green"];

        return `
            <article class="route-item" onclick="focusRoute('${route.id}')">
                <span class="route-dot ${colors[index % colors.length]}"></span>

                <div class="route-info">
                    <strong>${escapeHTML(route.name)}</strong>

                    <div class="route-meta">
                        <span>
                            <i class="fa-regular fa-clock"></i>
                            ${formatDuration(route.duration)}
                        </span>

                        <span>
                            <i class="fa-solid fa-location-dot"></i>
                            2 lugares
                        </span>
                    </div>
                </div>

                <span class="route-distance">
                    ${formatDistance(route.distance)}
                </span>
            </article>
        `;
    })
    .join("");
}

// ENFOCAR RUTA

function focusRoute(routeId) {
    const routes = getRoutes();
    const route = routes.find((item) => String(item.id) === String(routeId));

    if (!route) {
        return;
    }

    drawRoute([
        {
            geometry: route.geometry,
        },
    ]);
}

// RUTAS GUARDADAS

function renderSavedRoutes() {
    const container = document.getElementById("saved-routes-container");
    const routes = getRoutes();

    if (!routes.length) {
        container.innerHTML = `

            <div class="empty-page">
                <i class="fa-solid fa-route"></i>
                <h3>Todavía no tienes rutas</h3>

                <p>
                    Calcula tu primera ruta para verla aquí.
                </p>

                <button class="primary-button" onclick="openRouteModal()">
                    <i class="fa-solid fa-plus"></i>
                    Crear primera ruta
                </button>
            </div>
        `;

        return;
    }

    container.innerHTML = routes
        .map((route) => {
        return `
            <article class="saved-route-card">

                <div class="saved-route-icon">
                    <i class="fa-solid fa-route"></i>
                </div>

                <div class="saved-route-content">
                    <h3>${escapeHTML(route.name)}</h3>

                    <div class="route-address">
                        <span>
                            ${escapeHTML(route.origin.name)}
                        </span>

                        <i class="fa-solid fa-arrow-right"></i>

                        <span>
                            ${escapeHTML(route.destination.name)}
                        </span>
                    </div>

                    <div class="saved-route-stats">
                        <span>
                            <i class="fa-solid fa-road"></i>
                            ${formatDistance(route.distance)}
                        </span>

                        <span>
                            <i class="fa-regular fa-clock"></i>
                            ${formatDuration(route.duration)}
                        </span>

                        <span>
                            <i class="fa-solid fa-route"></i>
                            ${route.alternatives}
                            opción(es)
                        </span>
                    </div>
                </div>

                <button class="delete-button" onclick="removeRoute('${route.id}')" type="button" title="Eliminar ruta">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </article>
        `;
    })
    .join("");
}

// ELIMINAR RUTA

function removeRoute(routeId) {
    const confirmed = confirm("¿Quieres eliminar esta ruta?");

    if (!confirmed) {
        return;
    }

    deleteRoute(Number(routeId));
    renderRoutePanel();
    renderSavedRoutes();
}

// FAVORITOS

function renderFavorites() {
    const container = document.getElementById("favorites-container");
    const places = getPlaces().filter((place) => place.favorite);

    if (!places.length) {
        container.innerHTML = `
            <div class="empty-page">
                <i class="fa-regular fa-star"></i>
                <h3>No tienes favoritos</h3>
            </div>
        `;

        return;
    }

    container.innerHTML = places
        .map((place) => {
            const config = CATEGORY_CONFIG[place.category] || CATEGORY_CONFIG.otro;

            return `

                <article class="place-card" onclick="focusPlace('${place.id}')">
                    <div class="place-card-icon" style="background: ${config.color};">
                        <i class="fa-solid ${config.icon}"></i>
                    </div>

                    <div>
                        <h3>${escapeHTML(place.name)}</h3>
                        <span>${escapeHTML(place.category)}</span>
                        <p>${escapeHTML(place.address)}</p>
                    </div>
                </article>

            `;
        })
        .join("");
}

// CREAR RUTA DESDE UN LUGAR

function createRouteFromPlace(placeId) {
    const places = getPlaces();
    const place = places.find((item) => String(item.id) === String(placeId));

    if (!place) {
        return;
    }

    document.getElementById("route-name").value = `Ruta desde ${place.name}`;
    document.getElementById("route-origin").value = place.address;
    document.getElementById("route-destination").value = "";
    openRouteModal();
}

// CONTROLES DEL MAPA

document
    .getElementById("zoom-in")
    .addEventListener("click", () => map.zoomIn());

document
    .getElementById("zoom-out")
    .addEventListener("click", () => map.zoomOut());

document.getElementById("map-center").addEventListener("click", () => {
    map.setView([18.6813, -99.1013], 10);
});

document.getElementById("locate-button").addEventListener("click", () => {
    map.setView([18.6813, -99.1013], 10);
});

// UBICACIÓN INICIAL

async function loadDefaultLocation() {
    const results = await geocodeAddress(DEFAULT_LOCATION);

    if (!results) {
        return;
    }

    map.setView([parseFloat(results[0].lat), parseFloat(results[0].lon)], 10);
}

// INICIALIZACIÓN

function initializeApp() {
    renderPlaceMarkers();
    renderRecentPlaces();
    renderRoutePanel();
    renderSavedRoutes();
    renderFavorites();
    loadDefaultLocation();
}

initializeApp();