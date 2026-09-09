document.addEventListener("DOMContentLoaded", () => {
    const modalContainer = document.createElement("div");
    document.body.appendChild(modalContainer);

    fetch("components/agregar-lugar/agregar-lugar.html")
        .then(response => response.text())
        .then(htmlContent => {
            modalContainer.innerHTML = htmlContent;
            inicializarEventosModal();
        })
        .catch(err => console.error("Error cargando el formulario modal:", err));
});

function inicializarEventosModal() {
    const addPlaceButton = document.getElementById("add-place-button");
    const modalLugar = document.getElementById("modalLugar");
    const btnCerrarModal = document.getElementById("btnCerrarModal");
    const btnCancelar = document.getElementById("btnCancelar");
    const formNuevoLugar = document.getElementById("formNuevoLugar");
    const selectoresColor = document.querySelectorAll(".icon-btn");

    let modalMap = null;
    let colorSeleccionado = "naranja";
    let iconoSeleccionado = "fa-cart-shopping";

    if (!modalLugar) return;

    if (addPlaceButton) {
        addPlaceButton.addEventListener("click", () => {
            modalLugar.classList.add("mostrar");

            setTimeout(() => {
                if (!modalMap) {
                    modalMap = L.map("map-modal", { zoomControl: false }).setView([18.9217, -99.2347], 14);
                    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(modalMap);
                    
                    L.marker([18.9217, -99.2347]).addTo(modalMap)
                    .bindPopup("<b>Ubicación seleccionada</b>").openPopup();
                } else {
                    modalMap.invalidateSize();
                }
            },  250);
        });
    }

    selectoresColor.forEach(boton => {
        boton.addEventListener("click", () => {
            selectoresColor.forEach(b => b.classList.remove("activo"));
            boton.classList.add("activo");

            const clases = Array.from(boton.classList);
            colorSeleccionado = clases.find(clase => clase !== 'icon-btn' && clase !== 'activo');
            
            const iconoElemento = boton.querySelector("i");
            if (iconoElemento) {
                const clasesIcono = Array.from(iconoElemento.classList);
                iconoSeleccionado = clasesIcono.find(clase => clase.startsWith("fa-"));
            }
        });
    });

    if (formNuevoLugar) {
        formNuevoLugar.addEventListener("submit", (e) => {
        e.preventDefault();

            const nombre = document.getElementById("modal-nombre").value.trim() || "Lugar sin nombre";
            const categoria = document.getElementById("modal-categoria").value;
            const referencia = document.getElementById("modal-referencia").value.trim();
            const direccion = document.getElementById("modal-direccion").value.trim();
            const notas = document.getElementById("modal-notas").value.trim();
            const esFavorito = document.getElementById("modal-favorito").checked;

            if (typeof map !== 'undefined' && map !== null) {
                
                const coordenadasDestino = map.getCenter(); 

                const pinPersonalizado = L.divIcon({
                    html: `<div class="icon-btn ${colorSeleccionado}" style="width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:2px solid #fff;"><i class="fa-solid ${iconoSeleccionado}" style="color:#fff; font-size:14px;"></i></div>`,
                    className: '',
                    iconSize: '',
                    iconAnchor: '',
                    popupAnchor: [0, -17]
                });

                const popupContenido = `
                    <div style="font-family: sans-serif; color: #111827; min-width: 180px;">
                        <strong style="font-size: 14px; display: block; margin-bottom: 4px;">${esFavorito ? '⭐ ' : ''}${nombre}</strong>
                        <span style="font-size: 11px; text-transform: uppercase; font-weight: bold; color: #64748b; display:block; margin-bottom: 6px;">🏷️ ${categoria || 'General'}</span>
                        ${direccion ? `<p style="margin: 2px 0; font-size: 12px;"><b>Dir:</b> ${direccion}</p>` : ''}
                        ${referencia ? `<p style="margin: 2px 0; font-size: 12px;"><b>Ref:</b> ${referencia}</p>` : ''}
                        ${notas ? `<p style="margin: 6px 0 0 0; font-size: 12px; font-style: italic; color: #475569; border-top: 1px solid #e2e8f0; padding-top: 4px;">"${notas}"</p>` : ''}
                    </div>
                `;

                L.marker([coordenadasDestino.lat, coordenadasDestino.lng], { icon: pinPersonalizado })
                    .addTo(map)
                    .bindPopup(popupContenido)
                    .openPopup();

                map.panTo([coordenadasDestino.lat, coordenadasDestino.lng]);
            }

            formNuevoLugar.reset();
            selectoresColor.forEach(b => b.classList.remove("activo"));
            document.querySelector(".icon-btn.naranja")?.classList.add("activo");
            colorSeleccionado = "naranja";
            iconoSeleccionado = "fa-cart-shopping";

            cerrar();
        });
    }

    const cerrar = () => modalLugar.classList.remove("mostrar");
    if (btnCerrarModal) btnCerrarModal.addEventListener("click", cerrar);
    if (btnCancelar) btnCancelar.addEventListener("click", cerrar);

    window.addEventListener("click", (e) => {
        if (e.target === modalLugar) cerrar();
    });
}