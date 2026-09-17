// =========================================================
// CONFIGURACIÓN
// =========================================================

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

const OSRM_URL = "https://router.project-osrm.org/route/v1";

const DEFAULT_LOCATION = "Morelos, México";

// =========================================================
// ELEMENTOS DEL DOM
// =========================================================

const searchInput = document.getElementById("search-input");

const searchButton = document.getElementById("search-button");

const menuItems = document.querySelectorAll(".menu-item");

const categoryItems = document.querySelectorAll(".category-item");

const addPlaceButton = document.getElementById("add-place-button");

const modal = document.getElementById("add-place-modal");

const closeModalButton = document.getElementById("close-modal");

const cancelModalButton = document.getElementById("cancel-modal");

const placeForm = document.getElementById("place-form");

const locateButton = document.getElementById("locate-button");

const zoomInButton = document.getElementById("zoom-in");

const zoomOutButton = document.getElementById("zoom-out");

const mapCenterButton = document.getElementById("map-center");

// =========================================================
// MAPA
// =========================================================

const map = L.map("map", {
  zoomControl: false,
}).setView([18.6813, -99.1013], 10);

// =========================================================
// MAPA OPENSTREETMAP
// =========================================================

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',

  maxZoom: 19,
}).addTo(map);

// =========================================================
// VARIABLES
// =========================================================

let searchMarker = null;

let routeLayer = null;

let savedPlaces = [];

// =========================================================
// ICONOS PERSONALIZADOS
// =========================================================

function createMarkerIcon(color = "#ffd166", icon = "fa-location-dot") {
  return L.divIcon({
    className: "custom-map-marker",

    html: `
            <div
                style="
                    width: 34px;
                    height: 34px;
                    border-radius: 50% 50% 50% 0;
                    transform: rotate(-45deg);
                    background: ${color};
                    border: 3px solid white;
                    box-shadow: 0 4px 12px rgba(0,0,0,.30);
                    display:flex;
                    align-items:center;
                    justify-content:center;
                "
            >

                <i
                    class="fa-solid ${icon}"
                    style="
                        transform: rotate(45deg);
                        color: white;
                        font-size: 13px;
                    "
                ></i>

            </div>
        `,

    iconSize: [34, 34],

    iconAnchor: [17, 34],

    popupAnchor: [0, -34],
  });
}

// =========================================================
// MARCADORES DE EJEMPLO
// =========================================================

const examplePlaces = [
  {
    name: "Mercado Adolfo López",
    lat: 18.9186,
    lon: -99.2348,
    category: "Mercado",
    color: "#ff9f1c",
    icon: "fa-cart-shopping",
  },

  {
    name: "Parque Alameda",
    lat: 18.925,
    lon: -99.228,
    category: "Parque",
    color: "#16c765",
    icon: "fa-tree",
  },

  {
    name: "Chedraui Flores Magón",
    lat: 18.909,
    lon: -99.225,
    category: "Tienda",
    color: "#a72cff",
    icon: "fa-shop",
  },

  {
    name: "IMSS Plan de Ayala",
    lat: 18.912,
    lon: -99.216,
    category: "Referencia",
    color: "#1597ff",
    icon: "fa-location-dot",
  },

  {
    name: "Jiutepec",
    lat: 18.881,
    lon: -99.177,
    category: "Referencia",
    color: "#1597ff",
    icon: "fa-location-dot",
  },
];

// =========================================================
// MOSTRAR MARCADORES DE EJEMPLO
// =========================================================

function loadExampleMarkers() {
  examplePlaces.forEach((place) => {
    const marker = L.marker([place.lat, place.lon], {
      icon: createMarkerIcon(place.color, place.icon),
    }).addTo(map);

    marker.bindPopup(`
            <strong>
                ${place.name}
            </strong>

            <br>

            <span>
                ${place.category}
            </span>
        `);
  });
}

// =========================================================
// BÚSQUEDA NOMINATIM
// =========================================================

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
    console.error("Error de búsqueda:", error);

    return null;
  }
}

// =========================================================
// MOSTRAR RESULTADO DE BÚSQUEDA
// =========================================================

function showSearchResult(result) {
  const latitude = parseFloat(result.lat);

  const longitude = parseFloat(result.lon);

  if (searchMarker) {
    map.removeLayer(searchMarker);
  }

  searchMarker = L.marker([latitude, longitude], {
    icon: createMarkerIcon("#ffbd2e", "fa-location-dot"),
  }).addTo(map);

  searchMarker
    .bindPopup(
      `
            <strong>
                ${result.display_name}
            </strong>
        `,
    )
    .openPopup();

  map.setView([latitude, longitude], 15);
}

// =========================================================
// EJECUTAR BÚSQUEDA
// =========================================================

async function performSearch() {
  if (!searchInput) {
    return;
  }

  const query = searchInput.value.trim();

  if (!query) {
    return;
  }

  searchButton.disabled = true;

  const originalHTML = searchButton.innerHTML;

  searchButton.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`;

  const results = await geocodeAddress(query);

  searchButton.disabled = false;

  searchButton.innerHTML = originalHTML;

  if (!results) {
    alert("No se encontró ninguna ubicación.");

    return;
  }

  showSearchResult(results[0]);
}

// =========================================================
// EVENTOS BUSCADOR
// =========================================================

if (searchButton) {
  searchButton.addEventListener("click", performSearch);
}

if (searchInput) {
  searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      performSearch();
    }
  });
}

// =========================================================
// CAMBIAR VISTA
// =========================================================

function changeView(viewName) {
  const views = document.querySelectorAll(".vista");

  views.forEach((view) => {
    view.classList.remove("activa");
  });

  const viewId = `vista${viewName.charAt(0).toUpperCase()}${viewName.slice(1)}`;

  const targetView = document.getElementById(viewId);

  if (targetView) {
    targetView.classList.add("activa");
  }

  menuItems.forEach((item) => {
    item.classList.toggle("active", item.dataset.view === viewName);
  });

  if (viewName === "mapa") {
    setTimeout(() => {
      map.invalidateSize();
    }, 100);
  }
}

// =========================================================
// EVENTOS MENÚ
// =========================================================

menuItems.forEach((item) => {
  item.addEventListener("click", () => {
    const view = item.dataset.view;

    if (!view) {
      return;
    }

    changeView(view);
  });
});

// =========================================================
// CATEGORÍAS
// =========================================================

categoryItems.forEach((category) => {
  category.addEventListener("click", () => {
    categoryItems.forEach((item) => {
      item.classList.remove("active");
    });

    category.classList.add("active");

    const selectedCategory = category.dataset.category;

    filterCategory(selectedCategory);
  });
});

// =========================================================
// FILTRAR CATEGORÍA
// =========================================================

function filterCategory(category) {
  console.log("Categoría seleccionada:", category);
}

// =========================================================
// ZOOM
// =========================================================

if (zoomInButton) {
  zoomInButton.addEventListener("click", () => {
    map.zoomIn();
  });
}

if (zoomOutButton) {
  zoomOutButton.addEventListener("click", () => {
    map.zoomOut();
  });
}

// =========================================================
// CENTRAR MAPA
// =========================================================

function centerMap() {
  map.setView([18.6813, -99.1013], 10);
}

if (mapCenterButton) {
  mapCenterButton.addEventListener("click", centerMap);
}

if (locateButton) {
  locateButton.addEventListener("click", centerMap);
}

// =========================================================
// OBTENER COORDENADAS
// =========================================================

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

// =========================================================
// OBTENER RUTA
// =========================================================

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
      throw new Error("No se pudo consultar OSRM.");
    }

    const data = await response.json();

    if (data.code !== "Ok" || !data.routes || !data.routes.length) {
      return null;
    }

    return data.routes;
  } catch (error) {
    console.error("Error al obtener ruta:", error);

    return null;
  }
}

// =========================================================
// DIBUJAR RUTA
// =========================================================

function drawRoute(routes) {
  if (!routes || !routes.length) {
    return;
  }

  if (routeLayer) {
    map.removeLayer(routeLayer);
  }

  const routeFeatures = routes.map((route, index) => {
    return {
      type: "Feature",

      properties: {
        routeIndex: index,
      },

      geometry: route.geometry,
    };
  });

  routeLayer = L.geoJSON(routeFeatures, {
    style: (feature) => {
      const mainRoute = feature.properties.routeIndex === 0;

      return {
        color: mainRoute ? "#ffd166" : "#6b7d96",

        weight: mainRoute ? 6 : 4,

        opacity: mainRoute ? 0.95 : 0.55,
      };
    },
  }).addTo(map);

  map.fitBounds(routeLayer.getBounds(), {
    padding: [40, 40],
  });

  return routeLayer;
}

// =========================================================
// FORMATEAR DISTANCIA
// =========================================================

function formatDistance(distance) {
  const kilometers = distance / 1000;

  if (kilometers < 1) {
    return `${Math.round(distance)} m`;
  }

  return `${kilometers.toFixed(1)} km`;
}

// =========================================================
// FORMATEAR DURACIÓN
// =========================================================

function formatDuration(duration) {
  const minutes = Math.round(duration / 60);

  const hours = Math.floor(minutes / 60);

  const remainingMinutes = minutes % 60;

  if (hours === 0) {
    return `${remainingMinutes} min`;
  }

  if (remainingMinutes === 0) {
    return `${hours} h`;
  }

  return `${hours} h ${remainingMinutes} min`;
}

// =========================================================
// MODAL AGREGAR LUGAR
// =========================================================

function openModal() {
  if (!modal) {
    return;
  }

  modal.classList.add("visible");
}

function closeModal() {
  if (!modal) {
    return;
  }

  modal.classList.remove("visible");
}

if (addPlaceButton) {
  addPlaceButton.addEventListener("click", openModal);
}

if (closeModalButton) {
  closeModalButton.addEventListener("click", closeModal);
}

if (cancelModalButton) {
  cancelModalButton.addEventListener("click", closeModal);
}

if (modal) {
  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      closeModal();
    }
  });
}

// =========================================================
// GUARDAR LUGAR
// =========================================================

if (placeForm) {
  placeForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = document.getElementById("place-name").value.trim();

    const category = document.getElementById("place-category").value;

    const reference = document.getElementById("place-reference").value.trim();

    const address = document.getElementById("place-address").value.trim();

    const notes = document.getElementById("place-notes").value.trim();

    if (!name) {
      return;
    }

    let coordinates = null;

    if (address) {
      coordinates = await getCoordinates(address);
    }

    const place = {
      id: Date.now(),

      name,

      category,

      reference,

      address,

      notes,

      coordinates,
    };

    savedPlaces.push(place);

    console.log("Lugar guardado:", place);

    if (coordinates) {
      const marker = L.marker([coordinates.latitude, coordinates.longitude], {
        icon: createMarkerIcon("#ffd166", "fa-location-dot"),
      }).addTo(map);

      marker.bindPopup(`
                    <strong>
                        ${name}
                    </strong>

                    <br>

                    <span>
                        ${category}
                    </span>
                `);

      map.setView([coordinates.latitude, coordinates.longitude], 15);
    }

    placeForm.reset();

    closeModal();
  });
}

// =========================================================
// BOTÓN "VER TODAS LAS RUTAS"
// =========================================================

const viewRoutesButton = document.querySelector(".view-routes-button");

if (viewRoutesButton) {
  viewRoutesButton.addEventListener("click", () => {
    changeView("rutas");
  });
}

// =========================================================
// CARGAR UBICACIÓN INICIAL
// =========================================================

async function loadDefaultLocation() {
  const results = await geocodeAddress(DEFAULT_LOCATION);

  if (!results) {
    return;
  }

  const result = results[0];

  map.setView([parseFloat(result.lat), parseFloat(result.lon)], 10);
}

// =========================================================
// INICIALIZACIÓN
// =========================================================

loadExampleMarkers();

loadDefaultLocation();
