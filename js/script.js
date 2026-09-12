/* =========================================================
   DJ AUTUMN — interações
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
    header.classList.toggle("scrolled", window.scrollY > 40);
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
    window.addEventListener("pointerleave", () =>
      cursor.classList.remove("active"),
    );
  }

  /* ---------- widget fixo do disco: clique alterna áudio e animação ---------- */
  const vinylWidget = document.getElementById("vinylWidget");
  const vinylToggle = document.getElementById("vinylToggle");
  const vinylRadio = document.getElementById("vinylRadio");
  const vinylVideo = vinylWidget
    ? vinylWidget.querySelector(".vinyl-video")
    : null;

  const toggleVinyl = () => {
    if (!vinylWidget) return;

    // Alterna a classe visual de pausa
    const isPaused = vinylWidget.classList.toggle("paused");

    // Controla a Rádio Audio
    if (vinylRadio) {
      if (isPaused) {
        vinylRadio.pause();
      } else {
        vinylRadio.muted = false; // Desmuta no primeiro clique do usuário
        vinylRadio
          .play()
          .catch((err) => console.log("Erro ao tocar áudio:", err));
      }
    }

    // Controla o vídeo de fundo do disco (se houver)
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

  /* ---------- botões de play dos mixes (feedback visual) ---------- */
  document.querySelectorAll(".mix-play").forEach((btn) => {
    btn.addEventListener("click", () => {
      const isPlaying = btn.classList.toggle("is-playing");
      btn.textContent = isPlaying ? "❚❚" : "▶";
      btn.setAttribute("aria-label", isPlaying ? "Pausar" : "Tocar");
    });
  });

  /* ---------- galeria: lightbox ao clicar em uma foto ---------- */
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightboxImg");
  const lightboxCaption = document.getElementById("lightboxCaption");
  const lightboxClose = document.getElementById("lightboxClose");
  const galleryButtons = document.querySelectorAll(".gallery-item[data-full]");

  const openLightbox = (src, caption) => {
    if (!lightbox || !lightboxImg) return;
    lightboxImg.src = src;
    lightboxImg.alt = caption || "";
    lightboxCaption.textContent = caption || "";
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

  galleryButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      openLightbox(btn.dataset.full, btn.dataset.caption);
    });
  });

  if (lightboxClose) lightboxClose.addEventListener("click", closeLightbox);
  if (lightbox) {
    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox) closeLightbox();
    });
  }
  window.addEventListener("keydown", (e) => {
    if (
      e.key === "Escape" &&
      lightbox &&
      lightbox.classList.contains("is-open")
    )
      closeLightbox();
  });

  /* ---------- formulário de contato (feedback local, sem backend) ---------- */
  const form = document.getElementById("contactForm");
  const note = document.getElementById("formNote");
  if (form && note) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      note.textContent =
        "Mensagem pronta para envio — conecte este formulário ao seu backend/e-mail preferido.";
      form.reset();
    });
  }
});
