function initializeAddPlaceComponent() {
  const overlay = document.getElementById("add-place-overlay");
  const form = document.getElementById("add-place-form");
  const closeButton = document.getElementById("add-place-close");
  const cancelButton = document.getElementById("cancel-add-place");
  const markerOptions = document.querySelectorAll(".marker-option");
  const message = document.getElementById("form-message");

  if (!overlay || !form) {
    return;
  }

  let selectedMarker = {
    color: "#ef4444",

    icon: "📍",
  };

  function open() {
    overlay.classList.add("visible");

    document.body.style.overflow = "hidden";

    setTimeout(function () {
      const nameInput = document.getElementById("place-name");

      if (nameInput) {
        nameInput.focus();
      }
    }, 100);
  }

  function close() {
    overlay.classList.remove("visible");

    document.body.style.overflow = "";
  }

  closeButton.addEventListener("click", close);

  cancelButton.addEventListener("click", close);

  overlay.addEventListener("click", function (event) {
    if (event.target === overlay) {
      close();
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && overlay.classList.contains("visible")) {
      close();
    }
  });

  markerOptions.forEach(function (option) {
    option.addEventListener("click", function () {
      markerOptions.forEach(function (item) {
        item.classList.remove("selected");
      });

      option.classList.add("selected");

      selectedMarker = {
        color: option.dataset.color,
        icon: option.dataset.icon,
      };
    });
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    const formData = new FormData(form);

    const place = {
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),

      name: formData.get("name").trim(),
      category: formData.get("category"),
      reference: formData.get("reference").trim(),
      address: formData.get("address").trim(),
      notes: formData.get("notes").trim(),
      favorite: formData.get("favorite") === "on",
      color: selectedMarker.color,
      icon: selectedMarker.icon,
      createdAt: new Date().toISOString(),
    };

    if (!place.name || !place.address) {
      showError("El nombre y la dirección son obligatorios.");

      return;
    }

    const saveButton = form.querySelector(".save-place-button");

    saveButton.disabled = true;
    saveButton.style.opacity = "0.6";

    showMessage("Guardando lugar...");

    const event = new CustomEvent("mi-mapa:guardar-lugar", {
      detail: place,
    });

    document.dispatchEvent(event);

    savePlaceLocally(place);

    showSuccess("Lugar guardado correctamente.");

    setTimeout(function () {
      form.reset();

      markerOptions.forEach(function (item) {
        item.classList.remove("selected");
      });

      if (markerOptions[0]) {
        markerOptions[0].classList.add("selected");
      }

      selectedMarker = {
        color: "#ef4444",
        icon: "📍",
      };

      saveButton.disabled = false;
      saveButton.style.opacity = "";

      close();
    }, 700);
  });

  function savePlaceLocally(place) {
    const stored = localStorage.getItem("miMapaLugares");

    let places = [];

    if (stored) {
      try {
        places = JSON.parse(stored);
      } catch (error) {
        places = [];
      }
    }

    places.push(place);
    localStorage.setItem("miMapaLugares", JSON.stringify(places));
  }

  function showMessage(text) {
    message.textContent = text;
    message.className = "form-message";
  }

  function showError(text) {
    message.textContent = text;
    message.className = "form-message error";
  }

  function showSuccess(text) {
    message.textContent = text;
    message.className = "form-message success";
  }

  window.miMapaAgregarLugar = {
    open,
    close,
  };
}

initializeAddPlaceComponent();
