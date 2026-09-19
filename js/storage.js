// ALMACENAMIENTO DE MI MAPA

const STORAGE_KEYS = {
    places: "miMapa_places",
    routes: "miMapa_routes",
    activity: "miMapa_activity",
};

// OBTENER DATOS

function getStoredData(key) {
    const data = localStorage.getItem(key);

    if (!data) {
        return [];
    }

    try {
        return JSON.parse(data);
    } catch (error) {
        console.error("Error al leer datos:", error);
        return [];
    }
}

// GUARDAR DATOS

function setStoredData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

// LUGARES

function getPlaces() {
    return getStoredData(STORAGE_KEYS.places);
}

function savePlaces(places) {
    setStoredData(STORAGE_KEYS.places, places);
}

function addPlace(place) {
    const places = getPlaces();
    places.unshift(place);
    savePlaces(places);
}

// RUTAS

function getRoutes() {
    return getStoredData(STORAGE_KEYS.routes);
}

function saveRoutes(routes) {
    setStoredData(STORAGE_KEYS.routes, routes);
}

function addRoute(route) {
    const routes = getRoutes();
    routes.unshift(route);
    saveRoutes(routes);
}

// ACTIVIDAD

function getActivity() {
    return getStoredData(STORAGE_KEYS.activity);
}

function addActivity(activity) {
    const activities = getActivity();
    activities.unshift(activity);
    setStoredData(STORAGE_KEYS.activity, activities.slice(0, 50));
}

// ELIMINAR LUGAR

function deletePlace(placeId) {
    const places = getPlaces();
    const updatedPlaces = places.filter((place) => place.id !== placeId);
    savePlaces(updatedPlaces);
}

// ELIMINAR RUTA

function deleteRoute(routeId) {
    const routes = getRoutes();
    const updatedRoutes = routes.filter((route) => route.id !== routeId);
    saveRoutes(updatedRoutes);
}