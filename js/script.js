/* =========================================================
   DJ AUTUMN - interações
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  const header = document.getElementById("siteHeader");
  const navToggle = document.getElementById("navToggle");
  const mainNav = document.getElementById("mainNav");
  const yearEl = document.getElementById("year");
  const cursor = document.querySelector(".cursor-glow");

  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- header: muda ao rolar ---------- */
  const onScrollHeader = () => {
    if (header) header.classList.toggle("scrolled", window.scrollY > 40);
  };
  onScrollHeader();
  window.addEventListener("scroll", onScrollHeader, { passive: true });

  /* ---------- menu mobile ---------- */
  if (navToggle && mainNav) {
    navToggle.addEventListener("click", () => {
      const isOpen = mainNav.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
    });
    mainNav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        mainNav.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---------- reveal ao rolar (IntersectionObserver) ---------- */
  const revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.18, rootMargin: "0px 0px -8% 0px" },
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("in-view"));
  }

  /* ---------- parallax suave nos vetores de fundo ---------- */
  const decoEls = Array.from(document.querySelectorAll(".deco"));
  let ticking = false;

  const applyParallax = () => {
    const scrollY = window.scrollY;
    decoEls.forEach((el) => {
      const speed = parseFloat(el.dataset.speed || 0.15);
      const offset = scrollY * speed * -1;
      el.style.transform = `${el.classList.contains("deco-branch--right") ? "scaleX(-1) " : ""}translateY(${offset}px)`;
    });
    ticking = false;
  };

  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        window.requestAnimationFrame(applyParallax);
        ticking = true;
      }
    },
    { passive: true },
  );
  applyParallax();

  /* ---------- cursor glow ambiente (desktop) ---------- */
  const isFinePointer = window.matchMedia("(pointer: fine)").matches;
  if (cursor && isFinePointer) {
    window.addEventListener("pointermove", (e) => {
      cursor.classList.add("active");
      cursor.style.left = e.clientX + "px";
      cursor.style.top = e.clientY + "px";
    });
    document.addEventListener("pointerleave", () =>
      cursor.classList.remove("active"),
    );
  }

  /* ---------- widget fixo do disco ---------- */
  const vinylWidget = document.getElementById("vinylWidget");
  const vinylToggle = document.getElementById("vinylToggle");
  const vinylRadio = document.getElementById("vinylRadio"); // opcional
  const vinylVideo = vinylWidget
    ? vinylWidget.querySelector(".vinyl-video")
    : null;

  // pausa todos os mixes (usado quando a rádio do disco começa a tocar)
  const pauseAllMixes = () => {
    document.querySelectorAll(".mix-card audio").forEach((a) => a.pause());
  };

  const toggleVinyl = () => {
    if (!vinylWidget) return;

    const isPaused = vinylWidget.classList.toggle("paused");

    if (vinylRadio) {
      if (isPaused) {
        vinylRadio.pause();
      } else {
        pauseAllMixes();
        vinylRadio.muted = false;
        vinylRadio
          .play()
          .catch((err) => console.log("Erro ao tocar áudio:", err));
      }
    }

    if (vinylVideo) {
      if (isPaused) vinylVideo.pause();
      else vinylVideo.play().catch(() => {});
    }
  };

  if (vinylToggle) {
    vinylToggle.addEventListener("click", toggleVinyl);
    vinylToggle.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggleVinyl();
      }
    });
  }

  /* ---------- botões de play dos mixes: tocam/pausam o áudio ---------- */
  const mixButtons = Array.from(document.querySelectorAll(".mix-play"));

  const setButtonState = (btn, playing) => {
    btn.classList.toggle("is-playing", playing);
    btn.textContent = playing ? "❚❚" : "▶";
    btn.setAttribute("aria-label", playing ? "Pausar" : "Tocar");
    const card = btn.closest(".mix-card");
    if (card) card.classList.toggle("is-playing", playing);
  };

  mixButtons.forEach((btn) => {
    const card = btn.closest(".mix-card");
    const audio = card ? card.querySelector("audio") : null;
    if (!audio) return;

    btn.addEventListener("click", () => {
      if (audio.paused) {
        // pausa qualquer outro mix que esteja tocando
        document.querySelectorAll(".mix-card audio").forEach((other) => {
          if (other !== audio && !other.paused) other.pause();
        });

        // pausa a rádio do disco fixo, para não tocar duas coisas juntas
        if (vinylRadio && !vinylRadio.paused) {
          vinylRadio.pause();
          if (vinylWidget) vinylWidget.classList.add("paused");
          if (vinylVideo) vinylVideo.pause();
        }

        audio.play().catch((err) => {
          console.log("Erro ao tocar áudio:", err);
          setButtonState(btn, false);
        });
      } else {
        audio.pause();
      }
    });

    /* ----- barra de progresso (criada aqui, sem mexer no HTML) ----- */
    const info = card.querySelector(".mix-info");
    if (info) {
      const progress = document.createElement("div");
      progress.className = "mix-progress";
      progress.innerHTML = `
        <div class="mix-bar" role="slider" tabindex="0"
             aria-label="Posição da música" aria-valuemin="0"
             aria-valuemax="100" aria-valuenow="0">
          <div class="mix-bar-fill"></div>
        </div>
        <span class="mix-time">0:00 / --:--</span>`;
      info.appendChild(progress);

      const bar = progress.querySelector(".mix-bar");
      const fill = progress.querySelector(".mix-bar-fill");
      const time = progress.querySelector(".mix-time");

      const fmt = (s) => {
        if (!isFinite(s)) return "--:--";
        const m = Math.floor(s / 60);
        const sec = String(Math.floor(s % 60)).padStart(2, "0");
        return `${m}:${sec}`;
      };

      const updateProgress = () => {
        const pct = audio.duration
          ? (audio.currentTime / audio.duration) * 100
          : 0;
        fill.style.width = pct + "%";
        bar.setAttribute("aria-valuenow", String(Math.round(pct)));
        time.textContent = `${fmt(audio.currentTime)} / ${fmt(audio.duration)}`;
      };

      audio.addEventListener("timeupdate", updateProgress);
      audio.addEventListener("loadedmetadata", updateProgress);
      audio.addEventListener("ended", updateProgress);

      // se o arquivo não carregar (caminho errado, formato, servidor), avisa na tela
      audio.addEventListener("error", () => {
        time.textContent = "Erro ao carregar o áudio";
        console.error(
          "Falha no áudio:",
          audio.currentSrc || audio.src,
          audio.error,
        );
        setButtonState(btn, false);
      });

      // tocar/clicar ou ARRASTAR na barra pula para aquele ponto (mouse e toque)
      let scrubbing = false;

      const seekFromEvent = (e) => {
        if (!isFinite(audio.duration)) return;
        const rect = bar.getBoundingClientRect();
        const ratio = Math.min(
          Math.max((e.clientX - rect.left) / rect.width, 0),
          1,
        );
        audio.currentTime = ratio * audio.duration;
        updateProgress();
      };

      bar.addEventListener("pointerdown", (e) => {
        scrubbing = true;
        bar.setPointerCapture(e.pointerId);
        seekFromEvent(e);
      });
      bar.addEventListener("pointermove", (e) => {
        if (scrubbing) seekFromEvent(e);
      });
      const stopScrub = () => {
        scrubbing = false;
      };
      bar.addEventListener("pointerup", stopScrub);
      bar.addEventListener("pointercancel", stopScrub);

      // setas ← → avançam/voltam 5s
      bar.addEventListener("keydown", (e) => {
        if (!isFinite(audio.duration)) return;
        if (e.key === "ArrowRight")
          audio.currentTime = Math.min(audio.currentTime + 5, audio.duration);
        if (e.key === "ArrowLeft")
          audio.currentTime = Math.max(audio.currentTime - 5, 0);
      });
    }

    // mantém o botão sincronizado com o estado real do áudio
    audio.addEventListener("play", () => setButtonState(btn, true));
    audio.addEventListener("pause", () => setButtonState(btn, false));
    audio.addEventListener("ended", () => setButtonState(btn, false));
  });

  /* ---------- galeria: lightbox unificado, com navegação entre fotos ---------- */
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightboxImg");
  const lightboxCaption = document.getElementById("lightboxCaption");
  const lightboxClose = document.getElementById("lightboxClose");
  const lightboxPrev = document.getElementById("lightboxPrev");
  const lightboxNext = document.getElementById("lightboxNext");
  const lightboxCounter = document.getElementById("lightboxCounter");

  const galleryItems = Array.from(
    document.querySelectorAll(".gallery-item[data-full]"),
  );

  let currentIndex = -1;

  const renderSlide = (index) => {
    if (!lightbox || !lightboxImg || galleryItems.length === 0) return;

    currentIndex = (index + galleryItems.length) % galleryItems.length;
    const item = galleryItems[currentIndex];

    lightboxImg.src = item.dataset.full;
    lightboxImg.alt = item.dataset.caption || "";
    if (lightboxCaption)
      lightboxCaption.textContent = item.dataset.caption || "";
    if (lightboxCounter) {
      lightboxCounter.textContent = `${currentIndex + 1} / ${galleryItems.length}`;
    }

    const hasMultiple = galleryItems.length > 1;
    if (lightboxPrev) lightboxPrev.hidden = !hasMultiple;
    if (lightboxNext) lightboxNext.hidden = !hasMultiple;
  };

  const openLightbox = (index) => {
    if (!lightbox) return;
    renderSlide(index);
    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  };

  const closeLightbox = () => {
    if (!lightbox) return;
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  };

  const showPrev = () => renderSlide(currentIndex - 1);
  const showNext = () => renderSlide(currentIndex + 1);

  galleryItems.forEach((btn, index) => {
    btn.addEventListener("click", () => openLightbox(index));
  });

  if (lightboxClose) lightboxClose.addEventListener("click", closeLightbox);
  if (lightboxPrev) {
    lightboxPrev.addEventListener("click", (e) => {
      e.stopPropagation();
      showPrev();
    });
  }
  if (lightboxNext) {
    lightboxNext.addEventListener("click", (e) => {
      e.stopPropagation();
      showNext();
    });
  }

  if (lightbox) {
    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox) closeLightbox();
    });
  }

  window.addEventListener("keydown", (e) => {
    if (!lightbox || !lightbox.classList.contains("is-open")) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") showPrev();
    if (e.key === "ArrowRight") showNext();
  });

  if (lightboxImg) {
    let touchStartX = null;
    lightboxImg.addEventListener(
      "touchstart",
      (e) => {
        touchStartX = e.changedTouches[0].clientX;
      },
      { passive: true },
    );
    lightboxImg.addEventListener(
      "touchend",
      (e) => {
        if (touchStartX === null) return;
        const deltaX = e.changedTouches[0].clientX - touchStartX;
        if (Math.abs(deltaX) > 40) {
          if (deltaX > 0) showPrev();
          else showNext();
        }
        touchStartX = null;
      },
      { passive: true },
    );
  }

  /* ---------- formulário de contato (feedback local, sem backend) ---------- */
  const form = document.getElementById("contactForm");
  const note = document.getElementById("formNote");
  if (form && note) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      note.textContent =
        "Mensagem pronta para envio - conecte este formulário ao seu backend/e-mail preferido.";
      form.reset();
    });
  }
});
