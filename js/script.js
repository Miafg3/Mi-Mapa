const mapa = L.map("map").setView([18.9218, -99.2342], 13);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(mapa);

const inputBusqueda = document.querySelector("#search-input");
const botonBusqueda = document.querySelector("#search-button");
const botonAgregarLugar = document.querySelector("#add-place-button");
const panelRutas = document.querySelector(".routes-panel");
const botonCerrarRutas = document.querySelector("#close-routes");
const botonMostrarRutas = document.querySelector("#show-routes");

function buscarLugar() {
    const texto = inputBusqueda.value.trim().toLowerCase();

    if (texto === "") {
        return;
    }

    const resultado = lugares.find((lugar) => {
        return lugar.nombre.toLowerCase().includes(texto);
    });

    if (!resultado) {
        alert("No encontramos ese lugar.");

        return;
  }

  mapa.setView([resultado.latitud, resultado.longitud], 16);
  const marcador = marcadoresPorId.get(resultado.id);

    if (marcador) {
        marcador.openPopup();
    }
}

botonBusqueda.addEventListener("click", buscarLugar);

inputBusqueda.addEventListener("keydown", (evento) => {
  if (evento.key === "Enter") {
    buscarLugar();
  }
});

botonAgregarLugar.addEventListener("click", () => {
  alert("Aquí construiremos el formulario para agregar un lugar.");
});


botonCerrarRutas.addEventListener("click", () => {
  panelRutas.style.display = "none";

  botonMostrarRutas.style.display = "flex";
});

botonMostrarRutas.addEventListener("click", () => {
  panelRutas.style.display = "block";

  botonMostrarRutas.style.display = "none";
});
