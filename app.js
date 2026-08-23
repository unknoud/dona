(() => {
  const encodedPIN = "MjYyNQ==";
  const correctPin = atob(encodedPIN);

  const app = document.getElementById("app");
  const pinScreen = document.getElementById("pinScreen");
  const openPin = document.getElementById("openPin");
  const logoutButton = document.getElementById("logoutButton");
  const pinDots = [...document.querySelectorAll("#pinDots span")];
  const pinError = document.getElementById("pinError");
  const pinCard = document.querySelector(".pin-card");
  const pinInput = document.getElementById("pinInput");
  const pinHeart = document.getElementById("pinHeart");
  const gallery = document.getElementById("galleryTrack");
  const audio = document.getElementById("ambientAudio");
  const audioButton = document.getElementById("audioButton");
  const photoCards = [...document.querySelectorAll(".photo-card")];
  const likeButton = document.getElementById("likeButton");
  const likeToast = document.getElementById("likeToast");

  let pin = "";

  const timeFormat = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
  const dateFormat = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long"
  });

  function updateClock() {
    const now = new Date();
    document.getElementById("lockTime").textContent = timeFormat.format(now);
    document.getElementById("dashboardTime").textContent = timeFormat.format(now);
    const date = dateFormat.format(now);
    document.getElementById("lockDate").textContent = date.charAt(0).toUpperCase() + date.slice(1);
  }

  function pulseHeart(className = "beat") {
    pinHeart.classList.remove("beat", "error");
    void pinHeart.offsetWidth;
    pinHeart.classList.add(className);
    window.setTimeout(() => pinHeart.classList.remove(className), className === "error" ? 420 : 360);
  }

  function renderPin() {
    pinDots.forEach((dot, index) => {
      dot.classList.toggle("filled", index < pin.length);
      dot.classList.toggle("active", index === pin.length && pin.length < 4);
    });
  }

  function setPin(value) {
    const cleanValue = value.replace(/\D/g, "").slice(0, 4);
    if (cleanValue.length > pin.length) pulseHeart("beat");
    pin = cleanValue;
    pinInput.value = pin;
    pinError.classList.remove("show");
    renderPin();

    if (pin.length === 4) verifyPin();
  }

  function clearPin(delay = 0) {
    window.setTimeout(() => {
      pin = "";
      pinInput.value = "";
      renderPin();
      if (pinScreen.classList.contains("open")) pinInput.focus({ preventScroll: true });
    }, delay);
  }

  function showPin() {
    pinScreen.classList.add("open");
    pinScreen.setAttribute("aria-hidden", "false");
    pinHeart.classList.remove("success", "error");
    pinError.classList.remove("show");
    clearPin();
    window.setTimeout(() => pinInput.focus({ preventScroll: true }), 120);
  }

  function hidePin() {
    pinScreen.classList.remove("open");
    pinScreen.setAttribute("aria-hidden", "true");
    pinHeart.classList.remove("success", "error");
    clearPin();
  }

  function unlock() {
    app.classList.remove("locked");
    app.classList.add("unlocked");
    pinScreen.classList.remove("open");
    pinScreen.setAttribute("aria-hidden", "true");
    document.getElementById("dashboard").setAttribute("aria-hidden", "false");
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function lock() {
    app.classList.remove("unlocked");
    app.classList.add("locked");
    document.getElementById("dashboard").setAttribute("aria-hidden", "true");
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (!audio.paused) audio.pause();
    updateAudioButton();
  }

  function verifyPin() {
    if (pin.length !== 4) return;

    if (pin === correctPin) {
      pinError.classList.remove("show");
      pinHeart.classList.remove("beat", "error");
      pinHeart.classList.add("success");
      window.setTimeout(unlock, 650);
      return;
    }

    pinError.classList.add("show");
    pinHeart.classList.remove("beat");
    pulseHeart("error");
    pinCard.classList.remove("shake");
    void pinCard.offsetWidth;
    pinCard.classList.add("shake");
    clearPin(380);
  }

  openPin.addEventListener("click", (event) => {
    event.stopPropagation();
    showPin();
  });

  document.getElementById("lockScreen").addEventListener("click", () => {
    if (!pinScreen.classList.contains("open")) showPin();
  });

  pinScreen.addEventListener("click", (event) => {
    if (event.target === pinScreen) hidePin();
  });

  logoutButton.addEventListener("click", lock);


  let unlockRevealTimer = null;
  openPin.addEventListener("mousemove", () => {
    openPin.classList.add("reveal");
    clearTimeout(unlockRevealTimer);
    unlockRevealTimer = setTimeout(() => openPin.classList.remove("reveal"), 1050);
  });
  openPin.addEventListener("mouseleave", () => {
    clearTimeout(unlockRevealTimer);
    unlockRevealTimer = setTimeout(() => openPin.classList.remove("reveal"), 420);
  });

  pinInput.addEventListener("input", (event) => setPin(event.target.value));
  pinInput.addEventListener("keydown", (event) => {
    if (event.key === "Escape") hidePin();
    if (event.key === "Enter" && pin.length === 4) verifyPin();
  });

  // Si el foco se pierde, escribir un número sigue funcionando sin mostrar un teclado visual.
  document.addEventListener("keydown", (event) => {
    if (!pinScreen.classList.contains("open")) return;
    if (event.key === "Escape") {
      hidePin();
      return;
    }
    if (document.activeElement === pinInput) return;

    if (/^[0-9]$/.test(event.key)) {
      event.preventDefault();
      pinInput.focus({ preventScroll: true });
      setPin(pin + event.key);
    } else if (event.key === "Backspace") {
      event.preventDefault();
      setPin(pin.slice(0, -1));
    }
  });

  pinCard.addEventListener("click", (event) => {
    event.stopPropagation();
    pinInput.focus({ preventScroll: true });
  });

  // Galeria contínua: roda do mouse/trackpad + arraste suave, sem saltos por foto.
  let galleryVelocity = 0;
  let galleryRaf = null;
  let lastFrameTime = 0;

  function maxGalleryScroll() {
    return Math.max(0, gallery.scrollWidth - gallery.clientWidth);
  }

  function galleryMomentumFrame(time) {
    if (!lastFrameTime) lastFrameTime = time;
    const dt = Math.min(32, time - lastFrameTime) / 16.6667;
    lastFrameTime = time;

    if (Math.abs(galleryVelocity) < 0.035) {
      galleryVelocity = 0;
      galleryRaf = null;
      lastFrameTime = 0;
      return;
    }

    const max = maxGalleryScroll();
    const next = gallery.scrollLeft + galleryVelocity * dt;
    const clamped = Math.max(0, Math.min(max, next));
    gallery.scrollLeft = clamped;

    if (clamped !== next) galleryVelocity *= 0.28;
    galleryVelocity *= Math.pow(0.875, dt);
    galleryRaf = requestAnimationFrame(galleryMomentumFrame);
  }

  function startGalleryMomentum() {
    if (!galleryRaf) galleryRaf = requestAnimationFrame(galleryMomentumFrame);
  }

  gallery.addEventListener("wheel", (event) => {
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    if (Math.abs(delta) < 0.1) return;

    const max = maxGalleryScroll();
    const movingBack = delta < 0;
    const atStart = gallery.scrollLeft <= 0.5;
    const atEnd = gallery.scrollLeft >= max - 0.5;
    if ((movingBack && atStart) || (!movingBack && atEnd)) return;

    event.preventDefault();

    // Normaliza rodas tradicionais e preserva a precisão do trackpad.
    let normalized = delta;
    if (event.deltaMode === 1) normalized *= 14;
    if (event.deltaMode === 2) normalized *= gallery.clientWidth * 0.85;
    normalized = Math.max(-130, Math.min(130, normalized));

    galleryVelocity += normalized * 0.23;
    galleryVelocity = Math.max(-42, Math.min(42, galleryVelocity));
    startGalleryMomentum();
  }, { passive: false });

  let draggingGallery = false;
  let dragStartX = 0;
  let dragStartScroll = 0;
  let dragLastX = 0;
  let dragLastTime = 0;

  gallery.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    draggingGallery = true;
    dragStartX = event.clientX;
    dragStartScroll = gallery.scrollLeft;
    dragLastX = event.clientX;
    dragLastTime = performance.now();
    galleryVelocity = 0;
    if (galleryRaf) {
      cancelAnimationFrame(galleryRaf);
      galleryRaf = null;
      lastFrameTime = 0;
    }
    gallery.classList.add("dragging");
    gallery.setPointerCapture(event.pointerId);
  });

  gallery.addEventListener("pointermove", (event) => {
    if (!draggingGallery || event.pointerType !== "mouse") return;
    const x = event.clientX;
    const now = performance.now();
    const dx = x - dragStartX;
    gallery.scrollLeft = dragStartScroll - dx;

    const frameDt = Math.max(8, now - dragLastTime);
    galleryVelocity = -(x - dragLastX) * (16.6667 / frameDt);
    dragLastX = x;
    dragLastTime = now;
  });

  function endGalleryDrag(event) {
    if (!draggingGallery) return;
    draggingGallery = false;
    gallery.classList.remove("dragging");
    if (event && gallery.hasPointerCapture(event.pointerId)) gallery.releasePointerCapture(event.pointerId);
    galleryVelocity = Math.max(-38, Math.min(38, galleryVelocity));
    startGalleryMomentum();
  }

  gallery.addEventListener("pointerup", endGalleryDrag);
  gallery.addEventListener("pointercancel", endGalleryDrag);
  // Evita arrastrar imágenes y bloquea el menú contextual dentro de la galería.
  photoCards.forEach((card) => {
    const image = card.querySelector("img");
    if (image) {
      image.draggable = false;
      image.addEventListener("dragstart", (event) => event.preventDefault());
    }
    card.addEventListener("dragstart", (event) => event.preventDefault());
    card.addEventListener("contextmenu", (event) => event.preventDefault());
  });

  // Brilho segue o mouse sem inclinar a foto; o movimento fica mais natural.
  photoCards.forEach((card) => {
    let raf = null;
    card.addEventListener("pointermove", (event) => {
      if (event.pointerType === "touch") return;
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const rect = card.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;
        card.style.setProperty("--mx", `${(x * 100).toFixed(1)}%`);
        card.style.setProperty("--my", `${(y * 100).toFixed(1)}%`);
      });
    });
    card.addEventListener("pointerleave", () => {
      if (raf) cancelAnimationFrame(raf);
      card.style.setProperty("--mx", "50%");
      card.style.setProperty("--my", "50%");
    });
  });

  let toastTimer = null;
  likeButton.addEventListener("click", () => {
    likeButton.classList.remove("like-pop");
    void likeButton.offsetWidth;
    likeButton.classList.add("like-pop", "liked");
    likeButton.setAttribute("aria-pressed", "true");

    likeToast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => likeToast.classList.remove("show"), 1700);
    setTimeout(() => likeButton.classList.remove("like-pop"), 620);
  });

  function updateAudioButton() {
    const icon = audioButton.querySelector("i");
    icon.className = audio.paused ? "fa-solid fa-play" : "fa-solid fa-pause";
    audioButton.setAttribute("aria-label", audio.paused ? "Reproduzir música" : "Pausar música");
  }

  audio.volume = 0.5;
  audioButton.addEventListener("click", async () => {
    try {
      if (audio.paused) await audio.play();
      else audio.pause();
    } catch (error) {
      console.warn("O navegador bloqueou a reprodução automática.", error);
    }
    updateAudioButton();
  });
  audio.addEventListener("play", updateAudioButton);
  audio.addEventListener("pause", updateAudioButton);

  updateClock();
  window.setInterval(updateClock, 1000);
  updateAudioButton();
})();
