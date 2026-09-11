document.addEventListener("DOMContentLoaded", () => {
  const vistaRutas = document.getElementById("vistaRutas");

  if (!vistaRutas) {
    console.error("No se encontró #vistaRutas.");
    return;
  }

  fetch("components/mis-rutas/mis-rutas.html")
    .then((response) => {
      if (!response.ok) {
        throw new Error("No se pudo cargar mis-rutas.html");
      }

      return response.text();
    })
    .then((html) => {
      vistaRutas.innerHTML = html;

      inicializarMisRutas();
    })
    .catch((error) => {
      console.error("Error cargando Mis rutas:", error);
    });
});

function inicializarMisRutas() {
  const btnIrMapa = document.getElementById("btnIrMapa");
  const btnNuevaRuta = document.getElementById("btnNuevaRuta");

  if (btnIrMapa) {
    btnIrMapa.addEventListener("click", () => {
      document.dispatchEvent(
        new CustomEvent("mostrar-vista", {
          detail: {
            vista: "mapa",
          },
        }),
      );
    });
  }

  if (btnNuevaRuta) {
    btnNuevaRuta.addEventListener("click", () => {
      document.dispatchEvent(
        new CustomEvent("mostrar-vista", {
          detail: {
            vista: "mapa",
          },
        }),
      );
    });
  }
}