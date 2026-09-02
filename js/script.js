const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const OSRM_URL = "https://router.project-osrm.org/route/v1";
const DEFAULT_LOCATION = "Morelos, México";
const searchInput = document.getElementById("search-input");
const searchButton = document.getElementById("search-button");
const originInput = document.getElementById("origin-input");
const destinationInput = document.getElementById("destination-input");
const routeButton = document.getElementById("route-button");
const routesPanel = document.getElementById("routes-panel");
const routeEmpty = document.getElementById("route-empty");
const routeResults = document.getElementById("route-results");
const closeRoutesButton = document.getElementById("close-routes");
const showRoutesButton = document.getElementById("show-routes");
const transportOptions = document.querySelectorAll(".transport-option");
const menuItems = document.querySelectorAll(".menu-item");
const categories = document.querySelectorAll(".category");
const addPlaceButton = document.getElementById("add-place-button");

let map;
let originMarker = null;
let destinationMarker = null;
let routeLayer = null;
let currentTransportMode = "car";
let originCoordinates = null;
let destinationCoordinates = null;

function initializeMap() {

  map = L.map("map").setView([18.6813, -99.1013], 10);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,

    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);
}

function initializeApp() {
  initializeMap();
  setupEvents();
}

function setupEvents() {

  if (searchButton) {
    searchButton.addEventListener("click", handleSearch);
  }

  if (searchInput) {
    searchInput.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        handleSearch();
      }
    });
  }

  if (routeButton) {
    routeButton.addEventListener("click", calculateRoute);
  }

  if (originInput) {
    originInput.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        calculateRoute();
      }
    });
  }

  if (destinationInput) {
    destinationInput.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        calculateRoute();
      }
    });
  }

  transportOptions.forEach(function (button) {
    button.addEventListener("click", function () {
      selectTransportMode(button);
    });
  });

  if (closeRoutesButton) {
    closeRoutesButton.addEventListener("click", hideRoutesPanel);
  }

  if (showRoutesButton) {
    showRoutesButton.addEventListener("click", showRoutesPanel);
  }

  menuItems.forEach(function (item) {
    item.addEventListener("click", function () {
      selectMenuItem(item);
    });
  });

  categories.forEach(function (category) {
    category.addEventListener("click", function () {
      selectCategory(category);
    });
  });

  if (addPlaceButton) {
    addPlaceButton.addEventListener("click", handleAddPlace);
  }
}

async function handleSearch() {
  const query = searchInput.value.trim();

  if (!query) {
    showMessage("Escribe un lugar para buscar.");

    return;
  }

  destinationInput.value = query;

  const location = await geocodeAddress(query);

  if (!location) {
    showError("No encontramos ese lugar.");

    return;
  }

  destinationCoordinates = location;
  showLocationOnMap(location);
  setDestinationMarker(location);
  showLocationResult(location);
}

async function geocodeAddress(address) {
  try {

    const query = `${address}, ${DEFAULT_LOCATION}`;
    const url = new URL(NOMINATIM_URL);

    url.searchParams.set("q", query);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    url.searchParams.set("countrycodes", "mx");

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Error en el servicio de geocodificación.");
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      return null;
    }

    const result = data[0];

    return {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      displayName: result.display_name,
    };
  } catch (error) {
    console.error("Error al buscar ubicación:", error);

    return null;
  }
}

function showLocationOnMap(location) {
  map.setView([location.lat, location.lng], 14);
}

function setOriginMarker(location) {

  if (originMarker) {
    map.removeLayer(originMarker);
  }

  originMarker = L.marker([location.lat, location.lng])
    .addTo(map)
    .bindPopup(
      "<strong>Origen</strong><br>" + escapeHTML(location.displayName),
    );
}

function setDestinationMarker(location) {

  if (destinationMarker) {
    map.removeLayer(destinationMarker);
  }

  destinationMarker = L.marker([location.lat, location.lng])
    .addTo(map)
    .bindPopup(
      "<strong>Destino</strong><br>" + escapeHTML(location.displayName),
    );
}

async function calculateRoute() {
  const origin = originInput.value.trim();
  const destination = destinationInput.value.trim();

  if (!origin || !destination) {
    showError("Introduce un origen y un destino.");

    return;
  }

  showLoading();

  const locations = await Promise.all([
    geocodeAddress(origin),
    geocodeAddress(destination),
  ]);

  const originLocation = locations[0];
  const destinationLocation = locations[1];

  if (!originLocation) {
    showError("No pudimos encontrar el origen.");

    return;
  }

  if (!destinationLocation) {
    showError("No pudimos encontrar el destino.");

    return;
  }

  originCoordinates = originLocation;
  destinationCoordinates = destinationLocation;
  setOriginMarker(originLocation);
  setDestinationMarker(destinationLocation);

  const route = await getRoute(originLocation, destinationLocation);

  if (!route) {
    showError("No pudimos calcular una ruta para este recorrido.");

    return;
  }

  drawRoute(route);
  showRouteResults(route, originLocation, destinationLocation);
  fitMapToRoute(route);
  showRoutesPanel();
}

async function getRoute(origin, destination) {
  try {

    const coordinates =
      `${origin.lng},${origin.lat};` + `${destination.lng},${destination.lat}`;

    const url =
      `${OSRM_URL}/driving/${coordinates}` +
      `?overview=full` +
      `&geometries=geojson` +
      `&steps=true`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Error en el servicio de rutas.");
    }

    const data = await response.json();

    if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
      return null;
    }

    return data.routes[0];
  } catch (error) {
    console.error("Error al calcular ruta:", error);

    return null;
  }
}

function drawRoute(route) {

  if (routeLayer) {
    map.removeLayer(routeLayer);
  }

  const coordinates = route.geometry.coordinates.map(function (coordinate) {
    return [coordinate[1], coordinate[0]];
  });

  routeLayer = L.polyline(coordinates, {
    weight: 6,
    opacity: 0.9,
    lineJoin: "round",
    lineCap: "round",
  }).addTo(map);
}

function fitMapToRoute(route) {
  if (!routeLayer) {
    return;
  }

  const bounds = routeLayer.getBounds();

  map.fitBounds(bounds, {
    paddingTopLeft: [380, 80],
    paddingBottomRight: [380, 80],
  });
}

function showRouteResults(route, origin, destination) {

  routeEmpty.style.display = "none";
  routeResults.innerHTML = "";

  const distanceKm = route.distance / 1000;
  const durationMinutes = Math.round(route.duration / 60);
  const card = document.createElement("article");

  card.className = "route-card active";

  card.innerHTML = `

      <div class="route-card-header">
          <span class="route-card-title">
            Ruta recomendada
          </span>

          <span class="route-card-badge">
            ${getTransportLabel()}
          </span>
      </div>

      <div class="route-card-info">
        <div class="route-info">
            <span class="route-info-label">
              Distancia
            </span>

            <span class="route-info-value">
              ${formatDistance(distanceKm)}
            </span>
        </div>

        <div class="route-info">
            <span class="route-info-label">
              Tiempo estimado
            </span>

            <span class="route-info-value">
              ${formatDuration(durationMinutes)}
            </span>
        </div>

        <div class="route-info">
            <span class="route-info-label">
              Desde
            </span>

            <span class="route-info-value">
              ${escapeHTML(shortenLocation(origin.displayName))}
            </span>
        </div>

        <div class="route-info">
            <span class="route-info-label">
              Hasta
            </span>

            <span class="route-info-value">
              ${escapeHTML(shortenLocation(destination.displayName))}
            </span>
        </div>
      </div>

    `;

  routeResults.appendChild(card);
}

function formatDistance(kilometers) {
  if (kilometers < 1) {
    return `${Math.round(kilometers * 1000)} m`;
  }

  return `${kilometers.toFixed(1)} km`;
}

function formatDuration(minutes) {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours} h`;
  }

  return `${hours} h ${remainingMinutes} min`;
}

function selectTransportMode(selectedButton) {

  transportOptions.forEach(function (button) {
    button.classList.remove("active");
  });

  selectedButton.classList.add("active");

  currentTransportMode = selectedButton.dataset.mode;

  if (currentTransportMode === "public") {
    showMessage(
      "El transporte público se integrará con datos reales de Morelos.",
    );

    return;
  }

  if (currentTransportMode === "walk") {
    showMessage("La navegación peatonal se integrará en el siguiente paso.");

    return;
  }

  if (originCoordinates && destinationCoordinates) {
    calculateRoute();
  }
}

function getTransportLabel() {
  switch (currentTransportMode) {
    case "public":
      return "Público";

    case "walk":
      return "Caminar";

    case "car":

    default:
      return "Auto";
  }
}

function showLocationResult(location) {
  routeEmpty.style.display = "none";

  routeResults.innerHTML = "";

  const card = document.createElement("article");

  card.className = "route-card active";

  card.innerHTML = `

      <div class="route-card-header">

          <span class="route-card-title">
              Ubicación encontrada
          </span>

          <span class="route-card-badge">
              Lugar
          </span>

      </div>

      <p style=" color: var(--color-texto-secundario); font-size: 12px; line-height: 1.5;">
          ${escapeHTML(location.displayName)}
      </p>

    `;

  routeResults.appendChild(card);

  showRoutesPanel();
}

function showLoading() {
  routesPanel.classList.remove("mobile-visible");

  routeEmpty.style.display = "none";

  routeResults.innerHTML = `

      <div class="route-message">

          <div class="route-message-icon">
            🧭
          </div>

          <p>
            Buscando ubicaciones
            y calculando la ruta...
          </p>

      </div>

    `;

  showRoutesPanel();
}

function showMessage(message) {
  routeEmpty.style.display = "none";

  routeResults.innerHTML = `

      <div class="route-message">

          <div class="route-message-icon">
            🧭
          </div>

          <p>
            ${escapeHTML(message)}
          </p>

      </div>

    `;

  showRoutesPanel();
}

function showError(message) {
  routeEmpty.style.display = "none";

  routeResults.innerHTML = `

      <div class="route-message error">

        <div class="route-message-icon">
          ⚠️
        </div>

        <p>
          ${escapeHTML(message)}
        </p>

      </div>

    `;

  showRoutesPanel();
}

function showRoutesPanel() {
  if (!routesPanel) {
    return;
  }

  routesPanel.classList.add("mobile-visible");
}

function hideRoutesPanel() {
  if (!routesPanel) {
    return;
  }

  routesPanel.classList.remove("mobile-visible");
}

function selectMenuItem(selectedItem) {
  menuItems.forEach(function (item) {
    item.classList.remove("active");
  });

  selectedItem.classList.add("active");
}

function selectCategory(selectedCategory) {
  categories.forEach(function (category) {
    category.classList.remove("active");
  });

  selectedCategory.classList.add("active");
}

function handleAddPlace() {
  showMessage("La función para guardar lugares se agregará próximamente.");
}

function shortenLocation(name) {
  if (!name) {
    return "";
  }

  const parts = name.split(",");

  if (parts.length <= 2) {
    return name;
  }

  return parts.slice(0, 2).join(",").trim();
}

function escapeHTML(text) {
  const element = document.createElement("div");

  element.textContent = text ?? "";

  return element.innerHTML;
}

initializeApp();
