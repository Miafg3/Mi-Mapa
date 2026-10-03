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
const sidebar = document.getElementById("sidebar");
const sidebarMenuButton = document.getElementById("sidebar-menu-button");
const favoritesSearchInput = document.getElementById("favorites-search-input");

// MAPA PRINCIPAL

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

// MAPA DE VISTA PREVIA

let placePreviewMap = null;
let placePreviewMarker = null;
let placePreviewCoordinates = null;
let placeAddressTimeout = null;

// LUGAR SELECCIONADO

let selectedMarkerColor = null;
let selectedMarkerIcon = null;

// CATEGORÍAS

const CATEGORY_CONFIG = {
  restaurante: {
    color: "#ff8a00",
    icon: "fa-utensils",
  },

  tienda: {
    color: "#a72cff",
    icon: "fa-bag-shopping",
  },

  mercado: {
    color: "#216cff",
    icon: "fa-store",
  },

  parque: {
    color: "#16c765",
    icon: "fa-tree",
  },

  favorito: {
    color: "#f00",
    icon: "fa-star",
  },

  otro: {
    color: "#1597ff",
    icon: "fa-ellipsis",
  },

  todos: {
    color: "#00b8ff",
    icon: "fa-layer-group",
  },
};

// ICONO DE MARCADOR

function createMarkerIcon(category, customColor = null, customIcon = null) {
  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.otro;
  const color = customColor || config.color;
  const icon = customIcon || config.icon;

  return L.divIcon({
    className: "custom-map-marker",
    html: `
        <div class="marker-pin" style="background: ${color};">
            <i class="fa-solid ${icon}"></i>
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

// BÚSQUEDA PRINCIPAL

async function performSearch() {
  const query = searchInput.value.trim();

  if (!query) {
    return;
  }

  searchButton.disabled = true;

  searchButton.innerHTML = `
        <i class="fa-solid fa-spinner fa-spin"></i>
    `;

  const results = await geocodeAddress(query);

  searchButton.disabled = false;

  searchButton.innerHTML = `
        <i class="fa-solid fa-magnifying-glass"></i>
    `;

  if (!results) {
    alert("No se encontró ninguna ubicación.");
    return;
  }

  showSearchResult(results[0]);
}

// EVENTOS DE BÚSQUEDA

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
        <strong>${escapeHTML(result.display_name)}</strong>
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
      selectedCategory !== "favorito" &&
      place.category !== selectedCategory
    ) {
      return;
    }

    if (selectedCategory === "favorito" && !place.favorite) {
      return;
    }

    const marker = L.marker(
      [place.coordinates.latitude, place.coordinates.longitude],
      {
        icon: createMarkerIcon(
          place.category,
          place.markerColor,
          place.markerIcon,
        ),
      },
    ).addTo(map);

    marker.bindPopup(createPlacePopup(place));
    marker.placeId = place.id;
    placeMarkers.push(marker);
  });
}

// POPUP DE LUGAR

function createPlacePopup(place) {
  const favoriteText = place.favorite ? "Favorito" : "";

  const referenceText = place.reference
    ? `
          <small>
            ${escapeHTML(place.reference)}
          </small>
      `
    : "";

  return `
    <div class="place-popup">

        <strong>
            ${escapeHTML(place.name)}
        </strong>

        <span>
            ${escapeHTML(place.category)}
        </span>

        ${
          place.address
            ? `
                <small>
                    ${escapeHTML(place.address)}
                </small>
              `
            : ""
        }

        ${referenceText}

        ${
          favoriteText
            ? `
                  <small>
                    ${favoriteText}
                  </small>
                `
            : ""
        }

        <button class="popup-route-button" onclick="createRouteFromPlace('${place.id}')" type="button">
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

// LUGARES RECIENTES

function renderRecentPlaces() {
  const container = document.getElementById("recent-list");

  if (!container) {
    return;
  }

  const places = getPlaces();

  if (!places.length) {
    container.innerHTML = `
          <div class="empty-panel">
              <i class="fa-solid fa-location-dot"></i>

              <p>
                  Todavía no tienes lugares guardados.
              </p>

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
      const color = place.markerColor || config.color;
      const icon = place.markerIcon || config.icon;

      return `
          <article class="recent-item" data-place-id="${place.id}">

              <span class="place-marker" style="background: ${color};">
                  <i class="fa-solid ${icon}"></i>
              </span>

              <div>

                  <strong>
                      ${escapeHTML(place.name)}
                  </strong>

                  <span>
                      ${escapeHTML(place.category)}
                  </span>

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
    renderSavedRoutes(routeSearchInput ? routeSearchInput.value : "");
  }

  if (viewName === "favoritos") {
    renderFavorites(favoritesSearchInput ? favoritesSearchInput.value : "");
  }
}

menuItems.forEach((item) => {
  item.addEventListener("click", () => {
    changeView(item.dataset.view);
  });
});

// VOLVER AL MAPA DESDE MIS RUTAS

const backToMapButton = document.getElementById("back-to-map-button");

if (backToMapButton) {
  backToMapButton.addEventListener("click", () => {
    changeView("mapa");
  });
}

// SIDEBAR

function toggleSidebar() {
  const isCollapsed = sidebar.classList.toggle("collapsed");

  sidebarMenuButton.setAttribute("aria-expanded", String(!isCollapsed));

  sidebarMenuButton.setAttribute(
    "aria-label",
    isCollapsed ? "Expandir menú" : "Colapsar menú",
  );

  setTimeout(() => {
    map.invalidateSize();
  }, 300);
}

if (sidebarMenuButton) {
  sidebarMenuButton.addEventListener("click", toggleSidebar);
}

// MODAL AGREGAR LUGAR

const placeModal = document.getElementById("add-place-modal");
const placeForm = document.getElementById("place-form");
const placeNameInput = document.getElementById("place-name");
const placeCategoryInput = document.getElementById("place-category");
const placeReferenceInput = document.getElementById("place-reference");
const placeAddressInput = document.getElementById("place-address");
const placeNotesInput = document.getElementById("place-notes");
const placeFavoriteInput = document.getElementById("place-favorite");
const placeStatus = document.getElementById("place-status");
const addressLoading = document.getElementById("address-loading");
const categoryPreviewIcon = document.getElementById("category-preview-icon");
const markerOptions = document.getElementById("marker-options");

// INICIALIZAR MAPA DE VISTA PREVIA

function initializePlacePreviewMap() {
  if (placePreviewMap) {
    return;
  }

  placePreviewMap = L.map("place-preview-map", {
    zoomControl: false,
    attributionControl: false,
  }).setView([18.6813, -99.1013], 10);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
  }).addTo(placePreviewMap);
}

// ACTUALIZAR ICONO DE CATEGORÍA

function updateCategoryPreviewIcon() {
  if (!categoryPreviewIcon) {
    return;
  }

  const category = placeCategoryInput.value;
  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.otro;

  categoryPreviewIcon.innerHTML = `
        <i class="fa-solid ${config.icon}"></i>
    `;
}

// OBTENER COLOR E ICONO DEL MARCADOR

function updateSelectedMarker(category) {
  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.otro;

  selectedMarkerColor = config.color;
  selectedMarkerIcon = config.icon;

  if (!markerOptions) {
    return;
  }

  const options = markerOptions.querySelectorAll(".marker-option");

  options.forEach((option) => {
    option.classList.toggle(
      "active",
      option.dataset.color === selectedMarkerColor &&
        option.dataset.icon === selectedMarkerIcon,
    );
  });
}

// CONFIGURAR OPCIONES DE MARCADOR

function initializeMarkerOptions() {
  if (!markerOptions) {
    return;
  }

  const options = markerOptions.querySelectorAll(".marker-option");

  options.forEach((option) => {
    option.addEventListener("click", () => {
      selectedMarkerColor = option.dataset.color;
      selectedMarkerIcon = option.dataset.icon;

      options.forEach((item) => {
        item.classList.remove("active");
      });

      option.classList.add("active");

      updatePreviewMarker();
    });
  });
}

// ACTUALIZAR MARCADOR DEL MAPA PEQUEÑO

function updatePreviewMarker() {
  if (!placePreviewMap || !placePreviewCoordinates) {
    return;
  }

  if (placePreviewMarker) {
    placePreviewMap.removeLayer(placePreviewMarker);
  }

  placePreviewMarker = L.marker(
    [placePreviewCoordinates.latitude, placePreviewCoordinates.longitude],
    {
      icon: createMarkerIcon(
        placeCategoryInput.value,
        selectedMarkerColor,
        selectedMarkerIcon,
      ),
    },
  ).addTo(placePreviewMap);

  placePreviewMap.setView(
    [placePreviewCoordinates.latitude, placePreviewCoordinates.longitude],
    16,
  );
}

// MOSTRAR UBICACIÓN EN VISTA PREVIA

function showPlacePreview(result) {
  const latitude = parseFloat(result.lat);
  const longitude = parseFloat(result.lon);

  placePreviewCoordinates = {
    latitude,
    longitude,
  };

  updatePreviewMarker();
}

// BUSCAR DIRECCIÓN PARA VISTA PREVIA

async function updatePlaceAddressPreview() {
  const address = placeAddressInput.value.trim();

  if (!address) {
    placePreviewCoordinates = null;

    if (placePreviewMarker) {
      placePreviewMap.removeLayer(placePreviewMarker);
      placePreviewMarker = null;
    }

    if (placeStatus) {
      placeStatus.textContent = "";
    }

    return;
  }

  if (addressLoading) {
    addressLoading.classList.add("visible");
  }

  if (placeStatus) {
    placeStatus.textContent = "Buscando dirección...";
  }

  const results = await geocodeAddress(address);

  if (addressLoading) {
    addressLoading.classList.remove("visible");
  }

  if (!results) {
    placePreviewCoordinates = null;

    if (placePreviewMarker) {
      placePreviewMap.removeLayer(placePreviewMarker);
      placePreviewMarker = null;
    }

    if (placeStatus) {
      placeStatus.textContent = "No se encontró esa dirección.";
    }

    return;
  }

  showPlacePreview(results[0]);

  if (placeStatus) {
    placeStatus.textContent = "Ubicación encontrada.";
  }
}

// EVENTO DE DIRECCIÓN

placeAddressInput.addEventListener("input", () => {
  clearTimeout(placeAddressTimeout);
  placeAddressTimeout = setTimeout(updatePlaceAddressPreview, 700);
});

// EVENTO DE CATEGORÍA

placeCategoryInput.addEventListener("change", () => {
  updateCategoryPreviewIcon();
  updateSelectedMarker(placeCategoryInput.value);
  updatePreviewMarker();
});

// ABRIR MODAL

function openPlaceModal() {
  placeModal.classList.add("visible");

  initializePlacePreviewMap();
  updateCategoryPreviewIcon();
  updateSelectedMarker(placeCategoryInput.value);

  setTimeout(() => {
    placePreviewMap.invalidateSize();
  }, 100);
}

// CERRAR MODAL

function closePlaceModal() {
  placeModal.classList.remove("visible");
}

// LIMPIAR FORMULARIO

function resetPlaceForm() {
  placeForm.reset();
  placePreviewCoordinates = null;

  if (placePreviewMarker) {
    placePreviewMap.removeLayer(placePreviewMarker);
    placePreviewMarker = null;
  }

  if (placeStatus) {
    placeStatus.textContent = "";
  }

  if (addressLoading) {
    addressLoading.classList.remove("visible");
  }

  selectedMarkerColor = null;
  selectedMarkerIcon = null;

  updateCategoryPreviewIcon();
  updateSelectedMarker(placeCategoryInput.value);

  if (placePreviewMap) {
    placePreviewMap.setView([18.6813, -99.1013], 10);
  }
}

// BOTÓN AGREGAR LUGAR

document
  .getElementById("add-place-button")
  .addEventListener("click", openPlaceModal);

// BOTÓN CERRAR

document
  .getElementById("close-modal")
  .addEventListener("click", closePlaceModal);

// BOTÓN CANCELAR

document
  .getElementById("cancel-modal")
  .addEventListener("click", closePlaceModal);

// CERRAR FUERA DEL MODAL

placeModal.addEventListener("click", (event) => {
  if (event.target === placeModal) {
    closePlaceModal();
  }
});

// ESC PARA CERRAR

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && placeModal.classList.contains("visible")) {
    closePlaceModal();
  }
});

// GUARDAR LUGAR

placeForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = placeNameInput.value.trim();
  const category = placeCategoryInput.value;
  const reference = placeReferenceInput.value.trim();
  const address = placeAddressInput.value.trim();
  const notes = placeNotesInput.value.trim();
  const favorite = placeFavoriteInput.checked;

  const submitButton = event.target.querySelector('button[type="submit"]');

  submitButton.disabled = true;

  submitButton.innerHTML = `
        <i class="fa-solid fa-spinner fa-spin"></i>
        Guardando...
    `;

  if (placeStatus) {
    placeStatus.textContent = "Buscando la ubicación...";
  }

  let coordinates = placePreviewCoordinates;

  if (!coordinates) {
    const results = await geocodeAddress(address);

    if (!results) {
      if (placeStatus) {
        placeStatus.textContent = "No se encontró la dirección.";
      }

      alert("No se encontró la dirección.");

      submitButton.disabled = false;

      submitButton.innerHTML = `
                <i class="fa-solid fa-check"></i>
                Guardar lugar
          `;

      return;
    }

    coordinates = {
      latitude: parseFloat(results[0].lat),
      longitude: parseFloat(results[0].lon),
    };
  }

  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.otro;

  const place = {
    id: Date.now(),
    name,
    category,
    reference,
    address,
    notes,
    favorite,
    markerColor: selectedMarkerColor || config.color,
    markerIcon: selectedMarkerIcon || config.icon,
    coordinates,
    createdAt: new Date().toISOString(),
  };

  // GUARDAR LUGAR

  addPlace(place);

  // ACTIVIDAD

  addActivity({
    id: Date.now(),
    type: "place_created",
    text: `Guardaste el lugar "${name}".`,
    date: new Date().toISOString(),
  });

  // ACTUALIZAR INTERFAZ

  renderPlaceMarkers();
  renderRecentPlaces();
  renderFavorites(favoritesSearchInput ? favoritesSearchInput.value : "");

  // CENTRAR MAPA

  map.setView([coordinates.latitude, coordinates.longitude], 16);

  // CERRAR MODAL

  closePlaceModal();
  resetPlaceForm();

  // RESTAURAR BOTÓN

  submitButton.disabled = false;

  submitButton.innerHTML = `
        <i class="fa-solid fa-check"></i>
        Guardar lugar
    `;
});

// INICIALIZAR OPCIONES DE MARCADOR

initializeMarkerOptions();

// MODAL DE RUTA

const routeModal = document.getElementById("route-modal");
const routeForm = document.getElementById("route-form");
const routeNameInput = document.getElementById("route-name");
const routeOriginInput = document.getElementById("route-origin");
const routeDestinationInput = document.getElementById("route-destination");
const routeStatus = document.getElementById("route-status");
const calculateRouteButton = document.getElementById("calculate-route-button");

// ABRIR MODAL DE RUTA

function openRouteModal() {
  routeModal.classList.add("visible");
}

// CERRAR MODAL DE RUTA

function closeRouteModal() {
  routeModal.classList.remove("visible");
}

// BOTÓN NUEVA RUTA - PANEL MAPA

document
  .getElementById("new-route-button")
  .addEventListener("click", openRouteModal);

// BOTÓN NUEVA RUTA - PÁGINA

document
  .getElementById("new-route-page-button")
  .addEventListener("click", openRouteModal);

// CERRAR MODAL DE RUTA

document
  .getElementById("close-route-modal")
  .addEventListener("click", closeRouteModal);

document
  .getElementById("cancel-route-modal")
  .addEventListener("click", closeRouteModal);

// CREAR RUTA

routeForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = routeNameInput.value.trim();
  const originText = routeOriginInput.value.trim();
  const destinationText = routeDestinationInput.value.trim();

  if (!name) {
    routeStatus.textContent = "Escribe un nombre para la ruta.";
    return;
  }

  if (!originText) {
    routeStatus.textContent = "Escribe el origen.";
    return;
  }

  if (!destinationText) {
    routeStatus.textContent = "Escribe el destino.";
    return;
  }

  routeStatus.textContent = "Buscando las ubicaciones...";

  calculateRouteButton.disabled = true;

  calculateRouteButton.innerHTML = `
        <i class="fa-solid fa-spinner fa-spin"></i>
        Calculando...
    `;

  const origin = await getCoordinates(originText);

  if (!origin) {
    routeStatus.textContent = "No se encontró el origen.";

    calculateRouteButton.disabled = false;

    calculateRouteButton.innerHTML = `
            <i class="fa-solid fa-route"></i>
            Calcular ruta
      `;

    return;
  }

  const destination = await getCoordinates(destinationText);

  if (!destination) {
    routeStatus.textContent = "No se encontró el destino.";

    calculateRouteButton.disabled = false;

    calculateRouteButton.innerHTML = `
            <i class="fa-solid fa-route"></i>
            Calcular ruta
        `;

    return;
  }

  routeStatus.textContent = "Calculando ruta...";

  const routes = await getRoute(origin, destination);

  if (!routes || !routes.length) {
    routeStatus.textContent = "No se pudo calcular una ruta.";

    calculateRouteButton.disabled = false;

    calculateRouteButton.innerHTML = `
            <i class="fa-solid fa-route"></i>
            Calcular ruta
        `;

    return;
  }

  const mainRoute = routes[0];

  // DIBUJAR RUTA

  drawRoute(routes);

  // CREAR OBJETO

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
    geometry: mainRoute.geometry,
    createdAt: new Date().toISOString(),
  };

  // GUARDAR

  addRoute(route);

  // ACTIVIDAD

  addActivity({
    id: Date.now(),
    type: "route_created",
    text: `Creaste la ruta "${name}".`,
    date: new Date().toISOString(),
  });

  // ACTUALIZAR INTERFAZ

  renderRoutePanel();
  renderSavedRoutes();

  routeStatus.textContent = "Ruta guardada correctamente.";

  // CERRAR

  setTimeout(() => {
    closeRouteModal();
    resetRouteForm();
  }, 700);

  calculateRouteButton.disabled = false;

  calculateRouteButton.innerHTML = `
        <i class="fa-solid fa-route"></i>
        Calcular ruta
    `;
});

// LIMPIAR FORMULARIO DE RUTA

function resetRouteForm() {
  routeForm.reset();
  routeStatus.textContent = "";
  calculateRouteButton.disabled = false;
  calculateRouteButton.innerHTML = `
        <i class="fa-solid fa-route"></i>
        Calcular ruta
    `;
}

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
        color: main ? "#ffd21f" : "#70839e",
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

// PANEL DE RUTAS DEL MAPA

function renderRoutePanel() {
  const container = document.getElementById("route-list");

  if (!container) {
    return;
  }

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
                    <strong>
                        ${escapeHTML(route.name)}
                    </strong>

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

  if (!route || !route.geometry) {
    return;
  }

  changeView("mapa");

  drawRoute([
    {
      geometry: route.geometry,
    },
  ]);
}

// BUSCADOR DE MIS RUTAS

const routeSearchInput = document.getElementById("route-search-input");

if (routeSearchInput) {
  routeSearchInput.addEventListener("input", () => {
    renderSavedRoutes(routeSearchInput.value);
  });
}

// CONTADOR DE RUTAS

function updateRoutesCount(count) {
  const routesCount = document.getElementById("routes-count");

  if (!routesCount) {
    return;
  }

  routesCount.textContent = count === 1 ? "1 ruta" : `${count} rutas`;
}

// RUTAS GUARDADAS

function renderSavedRoutes(searchTerm = "") {
  const container = document.getElementById("saved-routes-container");

  if (!container) {
    return;
  }

  const routes = getRoutes();
  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredRoutes = normalizedSearch
    ? routes.filter((route) => {
        const name = String(route.name || "").toLowerCase();
        const origin = String(route.origin?.name || "").toLowerCase();
        const destination = String(route.destination?.name || "").toLowerCase();

        return (
          name.includes(normalizedSearch) ||
          origin.includes(normalizedSearch) ||
          destination.includes(normalizedSearch)
        );
      })
    : routes;

  updateRoutesCount(filteredRoutes.length);

  if (!filteredRoutes.length) {
    if (normalizedSearch) {
      container.innerHTML = `
            <div class="empty-page">
                <i class="fa-solid fa-magnifying-glass"></i>

                <h3>
                    No encontramos esa ruta
                </h3>

                <p>
                    Prueba con otro nombre, origen o destino.
                </p>
            </div>
        `;

      return;
    }

    container.innerHTML = `
          <div class="empty-page">
              <i class="fa-solid fa-route"></i>

              <h3>
                  Todavía no tienes rutas
              </h3>

              <p>
                  Calcula tu primera ruta para verla aquí.
              </p>

              <button class="primary-button" onclick="openRouteModal()" type="button">
                  <i class="fa-solid fa-plus"></i>
                  Crear primera ruta
              </button>
          </div>
      `;

    return;
  }

  container.innerHTML = filteredRoutes
    .map((route) => {
      return `
            <article class="saved-route-card">

                <div class="saved-route-icon">
                    <i class="fa-solid fa-route"></i>
                </div>

                <div class="saved-route-content">
                    <h3>
                        ${escapeHTML(route.name)}
                    </h3>

                    <div class="route-address">
                        <span>
                            ${escapeHTML(route.origin?.name || "")}
                        </span>

                        <i class="fa-solid fa-arrow-right"></i>

                        <span>
                            ${escapeHTML(route.destination?.name || "")}
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
                            ${route.alternatives || 1}
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

  // QUITAR RUTA DEL MAPA

  if (routeLayer) {
    map.removeLayer(routeLayer);
    routeLayer = null;
  }

  // ACTUALIZAR INTERFAZ

  renderRoutePanel();
  renderSavedRoutes(routeSearchInput ? routeSearchInput.value : "");
}

// FAVORITOS

function updateFavoritesCount(count) {
  const favoritesCount = document.getElementById("favorites-count");

  if (!favoritesCount) {
    return;
  }

  favoritesCount.textContent = count === 1 ? "1 lugar" : `${count} lugares`;
}

function renderFavorites(searchTerm = "") {
  const container = document.getElementById("favorites-container");

  if (!container) {
    return;
  }

  const places = getPlaces().filter((place) => place.favorite);
  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredPlaces = normalizedSearch
    ? places.filter((place) => {
        const name = String(place.name || "").toLowerCase();
        const category = String(place.category || "").toLowerCase();
        const address = String(place.address || "").toLowerCase();

        return (
          name.includes(normalizedSearch) ||
          category.includes(normalizedSearch) ||
          address.includes(normalizedSearch)
        );
      })
    : places;

  updateFavoritesCount(filteredPlaces.length);

  if (!filteredPlaces.length) {
    if (normalizedSearch) {
      container.innerHTML = `
        <div class="empty-page">
            <i class="fa-solid fa-magnifying-glass"></i>

            <h3>
                No encontramos ese favorito
            </h3>

            <p>
                Prueba con otro nombre, categoría o dirección.
            </p>
        </div>
      `;

      return;
    }

    container.innerHTML = `
      <div class="empty-page">
          <i class="fa-regular fa-star"></i>

          <h3>
              No tienes favoritos
          </h3>

          <p>
              Marca un lugar como favorito para verlo aquí.
          </p>

          <button class="primary-button" onclick="changeView('mapa')" type="button">
              <i class="fa-solid fa-map"></i>
              Ir al mapa
          </button>
      </div>
    `;

    return;
  }

  container.innerHTML = filteredPlaces
    .map((place) => {
      const config = CATEGORY_CONFIG[place.category] || CATEGORY_CONFIG.otro;
      const color = place.markerColor || config.color;
      const icon = place.markerIcon || config.icon;

      return `
        <article class="favorite-card" data-place-id="${place.id}">

            <div class="favorite-card-header">

                <div class="favorite-place-info">

                    <div class="favorite-place-icon" style="background: ${color};">
                        <i class="fa-solid ${icon}"></i>
                    </div>

                    <div>
                        <h3>
                            ${escapeHTML(place.name)}
                        </h3>

                        <span>
                            ${escapeHTML(place.category)}
                        </span>

                        <p>
                            ${escapeHTML(place.address || "Sin dirección")}
                        </p>
                    </div>

                </div>

                <button class="favorite-button" onclick="toggleFavorite('${place.id}')" type="button" aria-label="Quitar de favoritos" title="Quitar de favoritos">
                    <i class="fa-solid fa-star"></i>
                </button>

            </div>

            <div class="favorite-card-actions">

                <button class="favorite-action" onclick="createRouteFromPlace('${place.id}')" type="button">
                    <i class="fa-solid fa-route"></i>
                    Crear ruta
                </button>

                <button class="favorite-action" onclick="focusPlace('${place.id}')" type="button">
                    <i class="fa-solid fa-map"></i>
                    Ver en mapa
                </button>

                <button class="favorite-menu-button" onclick="showFavoriteOptions('${place.id}')" type="button" aria-label="Más opciones" title="Más opciones">
                    <i class="fa-solid fa-ellipsis-vertical"></i>
                </button>

            </div>

        </article>
      `;
    })
    .join("");
}

// BUSCAR FAVORITOS

if (favoritesSearchInput) {
  favoritesSearchInput.addEventListener("input", () => {
    renderFavorites(favoritesSearchInput.value);
  });
}

// CAMBIAR ESTADO DE FAVORITO

function toggleFavorite(placeId) {
  const places = getPlaces();
  const place = places.find((item) => String(item.id) === String(placeId));

  if (!place) {
    return;
  }

  place.favorite = !place.favorite;

  savePlaces(places);

  renderFavorites(favoritesSearchInput ? favoritesSearchInput.value : "");
  renderPlaceMarkers();
  renderRecentPlaces();
}

// OPCIONES DE FAVORITO

function showFavoriteOptions(placeId) {
  const places = getPlaces();
  const place = places.find((item) => String(item.id) === String(placeId));

  if (!place) {
    return;
  }

  const action = confirm(
    `¿Quieres eliminar "${place.name}" de tus lugares guardados?`,
  );

  if (!action) {
    return;
  }

  deletePlace(place.id);

  renderFavorites(favoritesSearchInput ? favoritesSearchInput.value : "");
  renderPlaceMarkers();
  renderRecentPlaces();
}

// CREAR RUTA DESDE UN LUGAR

function createRouteFromPlace(placeId) {
  const places = getPlaces();
  const place = places.find((item) => String(item.id) === String(placeId));

  if (!place) {
    return;
  }

  routeNameInput.value = `Ruta desde ${place.name}`;
  routeOriginInput.value = place.address;
  routeDestinationInput.value = "";

  openRouteModal();
}

// CONTROLES DEL MAPA

document.getElementById("zoom-in").addEventListener("click", () => {
  map.zoomIn();
});

document.getElementById("zoom-out").addEventListener("click", () => {
  map.zoomOut();
});

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
  updateCategoryPreviewIcon();
}

initializeApp();