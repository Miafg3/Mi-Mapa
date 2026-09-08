document.addEventListener("DOMContentLoaded", () => {
  const modalContainer = document.createElement("div");
  document.body.appendChild(modalContainer);

  fetch("components/agregar-lugar/agregar-lugar.html")
    .then((response) => response.text())
    .then((htmlContent) => {
      modalContainer.innerHTML = htmlContent;
      inicializarEventosModal();
    })
    .catch((err) => console.error("Error cargando el formulario modal:", err));
});

function inicializarEventosModal() {
  const addPlaceButton = document.getElementById("add-place-button");
  const modalLugar = document.getElementById("modalLugar");
  const btnCerrarModal = document.getElementById("btnCerrarModal");
  const btnCancelar = document.getElementById("btnCancelar");
  const formNuevoLugar = document.getElementById("formNuevoLugar");
  const selectoresColor = document.querySelectorAll(".icon-btn");

  let modalMap = null;

  if (!modalLugar) return;

  if (addPlaceButton) {
    addPlaceButton.addEventListener("click", () => {
      modalLugar.classList.add("mostrar");

      setTimeout(() => {
        if (!modalMap) {
          modalMap = L.map("map-modal", {
            zoomControl: false,
          }).setView([18.9217, -99.2347], 14);

          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
          }).addTo(modalMap);

          L.marker([18.9217, -99.2347])
            .addTo(modalMap)
            .bindPopup("<b>Mercado Adolfo López</b>")
            .openPopup();
        } else {
          modalMap.invalidateSize();
        }
      }, 250);
    });
  }

  const cerrar = () => modalLugar.classList.remove("mostrar");
  if (btnCerrarModal) btnCerrarModal.addEventListener("click", cerrar);
  if (btnCancelar) btnCancelar.addEventListener("click", cerrar);

  window.addEventListener("click", (e) => {
    if (e.target === modalLugar) cerrar();
  });

  if (formNuevoLugar) {
    formNuevoLugar.addEventListener("submit", (e) => {
      e.preventDefault();
      alert("¡Lugar guardado exitosamente en Mi Mapa!");
      cerrar();
    });
  }

  selectoresColor.forEach((boton) => {
    boton.addEventListener("click", () => {
      selectoresColor.forEach((b) => b.classList.remove("activo"));
      boton.classList.add("activo");
    });
  });
}
