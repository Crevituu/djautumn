/* =========================================================
   Dj Autumn — Jazz House Selector
   js/main.js

   Dependências (carregadas via CDN no index.html):
   - GSAP + ScrollTrigger  → animações e efeitos de scroll
   - Lenis                 → scroll suave

   Se alguma biblioteca falhar ao carregar, o site continua
   funcionando (sem as animações).

   Índice:
   01. Helpers e estado
   02. Tema dia / noite
   03. Scroll suave e navegação (scrollToId)
   04. Menu de capítulos
   05. Destaque da seção atual no menu
   06. Header e barra de progresso
   07. Player de áudio (Preview)
   08. Lightbox da galeria (zoom + setas)
   09. Vídeo do hero
   10. Imagens ausentes (fallbacks)
   11. Copiar telefone
   12. Reduzir movimento (preferência do sistema)
   13. Efeitos GSAP (hero, texto, parallax, marquee, cards, galeria, cursor)
   14. (removido)
   15. Inicialização
   ========================================================= */

(() => {
  "use strict";

  /* ---------- 01. Helpers e estado ---------- */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const root = document.documentElement;
  const body = document.body;

  const hasGSAP =
    typeof window.gsap !== "undefined" &&
    typeof window.ScrollTrigger !== "undefined";
  const hasLenis = typeof window.Lenis !== "undefined";
  const prefersReduced = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const finePointer = window.matchMedia(
    "(hover: hover) and (pointer: fine)",
  ).matches;

  const pad2 = (n) => String(n).padStart(2, "0");
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  const state = {
    paused: prefersReduced, // animações pausadas
    menuOpen: false,
    lightboxOpen: false,
    chapter: 0,
  };

  let lenis = null;
  const marquees = []; // tweens dos marquees (para pausar)

  /* ---------- 02. Tema dia / noite ---------- */
  function initTheme() {
    const buttons = $$("[data-theme-set]");
    const KEY = "autumn-theme";

    const apply = (theme) => {
      root.setAttribute("data-theme", theme);
      buttons.forEach((btn) => {
        const on = btn.dataset.themeSet === theme;
        btn.classList.toggle("is-active", on);
        btn.setAttribute("aria-pressed", String(on));
      });
    };

    let saved = null;
    try {
      saved = localStorage.getItem(KEY);
    } catch (e) {
      /* storage bloqueado */
    }
    apply(saved === "dia" || saved === "noite" ? saved : "noite");

    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        apply(btn.dataset.themeSet);
        try {
          localStorage.setItem(KEY, btn.dataset.themeSet);
        } catch (e) {
          /* ignora */
        }
      });
    });
  }

  /* ---------- 03. Scroll suave e navegação ---------- */
  function initScroll() {
    if (!hasGSAP || !hasLenis || prefersReduced) return;

    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop(); // liberado na inicialização
  }

  function scrollToId(id) {
    const el = document.getElementById(id);
    if (!el) return;

    if (lenis) {
      lenis.start();
      lenis.scrollTo(el, {
        duration: state.paused ? 0 : 1.6,
        easing: (t) => 1 - Math.pow(1 - t, 4),
        force: true,
      });
    } else {
      el.scrollIntoView({
        behavior: state.paused ? "auto" : "smooth",
        block: "start",
      });
    }
  }

  function initGoto(menuApi) {
    document.addEventListener("click", (e) => {
      const trigger = e.target.closest("[data-goto]");
      if (!trigger) return;
      e.preventDefault();
      const id = trigger.dataset.goto;

      if (state.menuOpen) {
        menuApi.close();
        setTimeout(() => scrollToId(id), 350);
      } else {
        scrollToId(id);
      }
    });
  }

  /* ---------- 04. Menu de capítulos ---------- */
  function initMenu() {
    const btn = $("#menuBtn");
    const menu = $("#menu");
    menu.setAttribute("inert", "");

    const open = () => {
      state.menuOpen = true;
      menu.removeAttribute("inert");
      menu.classList.add("is-open");
      menu.setAttribute("aria-hidden", "false");
      btn.setAttribute("aria-expanded", "true");
      body.classList.add("menu-open");
      if (lenis) lenis.stop();

      if (hasGSAP && !state.paused) {
        gsap.fromTo(
          $$(".menu__list a", menu),
          { yPercent: 110 },
          {
            yPercent: 0,
            duration: 0.9,
            ease: "power4.out",
            stagger: 0.05,
            delay: 0.25,
            overwrite: true,
          },
        );
      }
    };

    const close = () => {
      state.menuOpen = false;
      menu.setAttribute("inert", "");
      menu.classList.remove("is-open");
      menu.setAttribute("aria-hidden", "true");
      btn.setAttribute("aria-expanded", "false");
      if (!state.lightboxOpen) body.classList.remove("menu-open");
      if (lenis && !state.lightboxOpen) lenis.start();
    };

    btn.addEventListener("click", () => (state.menuOpen ? close() : open()));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && state.menuOpen) close();
    });

    return { open, close };
  }

  /* ---------- 05. Navegação por capítulos ---------- */
  function initChapters() {
    const sections = $$("[data-chapter]");
    const menuLinks = $$(".menu__list a");

    // Marca no menu em tela cheia a seção em que o visitante está
    const setChapter = (i) => {
      state.chapter = i;
      menuLinks.forEach((a) =>
        a.classList.toggle("is-current", a.dataset.goto === sections[i].id),
      );
    };

    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((en) => {
            if (en.isIntersecting) setChapter(sections.indexOf(en.target));
          });
        },
        { rootMargin: "-50% 0px -50% 0px" },
      );
      sections.forEach((s) => io.observe(s));
    }

    setChapter(0);
  }

  /* ---------- 06. Header e barra de progresso ---------- */
  function initScrollUI() {
    const header = $("#header");
    const bar = $("#progressBar");
    let lastY = window.scrollY;
    let ticking = false;

    const update = () => {
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = `scaleX(${max > 0 ? clamp(y / max, 0, 1) : 0})`;

      header.classList.toggle("is-scrolled", y > 40);

      // Cabeçalho fixo: não esconde mais ao rolar
      lastY = y;
      ticking = false;
    };

    window.addEventListener(
      "scroll",
      () => {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(update);
        }
      },
      { passive: true },
    );

    update();
  }

  /* ---------- 07. Player de áudio ---------- */
  function initPlayer() {
    const audio = $("#audio");
    const player = $("#player");
    if (!audio || !player) return;

    const tracks = $$(".track");
    const title = $("#playerTitle");
    const meta = $("#playerMeta");
    const fill = $("#playerFill");
    const bar = $("#playerBar");
    const cur = $("#timeCur");
    const dur = $("#timeDur");
    const playBtn = $("#playBtn");
    const playIcon = $("#playIcon");
    const prevBtn = $("#trackPrev");
    const nextBtn = $("#trackNext");
    const now = $("#nowLabel");

    let index = 0;

    const fmt = (s) => {
      if (!isFinite(s)) return "0:00";
      return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
    };

    const load = (i, autoplay) => {
      index = (i + tracks.length) % tracks.length;
      const t = tracks[index];
      audio.src = t.dataset.src;
      title.textContent = t.dataset.title;
      meta.textContent = `${t.dataset.meta} · ${t.dataset.length}`;
      tracks.forEach((el, k) => {
        el.classList.toggle("is-active", k === index);
        el.setAttribute("aria-current", String(k === index));
      });
      fill.style.transform = "scaleX(0)";
      bar.setAttribute("aria-valuenow", "0");
      cur.textContent = "0:00";
      dur.textContent = "0:00";
      now.textContent = "now playing";
      if (autoplay) audio.play().catch(() => {});
    };

    const toggle = () => {
      if (audio.paused) audio.play().catch(() => {});
      else audio.pause();
    };

    const seekTo = (clientX) => {
      const rect = bar.getBoundingClientRect();
      const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
      if (isFinite(audio.duration)) audio.currentTime = ratio * audio.duration;
    };

    audio.addEventListener("play", () => {
      player.classList.add("is-playing");
      playIcon.textContent = "❚❚";
      playBtn.setAttribute("aria-label", "Pausar");
      now.textContent = "now playing";
    });
    audio.addEventListener("pause", () => {
      player.classList.remove("is-playing");
      playIcon.textContent = "▶︎";
      playBtn.setAttribute("aria-label", "Tocar");
    });
    audio.addEventListener("loadedmetadata", () => {
      dur.textContent = fmt(audio.duration);
    });
    audio.addEventListener("timeupdate", () => {
      const ratio = audio.duration ? audio.currentTime / audio.duration : 0;
      fill.style.transform = `scaleX(${clamp(ratio, 0, 1)})`;
      bar.setAttribute("aria-valuenow", String(Math.round(ratio * 100)));
      cur.textContent = fmt(audio.currentTime);
    });
    audio.addEventListener("ended", () => load(index + 1, true));
    audio.addEventListener("error", () => {
      now.textContent = "áudio indisponível";
    });

    playBtn.addEventListener("click", toggle);
    prevBtn.addEventListener("click", () =>
      load(index - 1, !audio.paused || player.classList.contains("is-playing")),
    );
    nextBtn.addEventListener("click", () =>
      load(index + 1, !audio.paused || player.classList.contains("is-playing")),
    );

    tracks.forEach((btn, i) => {
      btn.addEventListener("click", () => {
        if (i === index && audio.src) toggle();
        else load(i, true);
      });
    });

    // barra de progresso: clique, arrastar e teclado
    let seeking = false;
    bar.addEventListener("pointerdown", (e) => {
      seeking = true;
      bar.setPointerCapture(e.pointerId);
      seekTo(e.clientX);
    });
    bar.addEventListener("pointermove", (e) => {
      if (seeking) seekTo(e.clientX);
    });
    const stopSeek = () => {
      seeking = false;
    };
    bar.addEventListener("pointerup", stopSeek);
    bar.addEventListener("pointercancel", stopSeek);
    bar.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight")
        audio.currentTime = Math.min(
          audio.duration || 0,
          audio.currentTime + 5,
        );
      if (e.key === "ArrowLeft")
        audio.currentTime = Math.max(0, audio.currentTime - 5);
    });

    load(0, false);
  }

  /* ---------- 08. Lightbox da galeria ---------- */
  function initLightbox() {
    const box = $("#lightbox");
    const img = $("#lightboxImg");
    const stage = $(".lightbox__stage", box);
    const closeBtn = $("#lightboxClose");
    const zoomValue = $("#zoomValue");
    const count = $("#lbCount");
    const items = $$(".g-item");

    let list = [];
    let pos = 0;
    let scale = 1,
      x = 0,
      y = 0;
    let dragging = false,
      startX = 0,
      startY = 0,
      originX = 0,
      originY = 0;
    let lastFocus = null;

    const clampPan = () => {
      if (scale <= 1) {
        x = 0;
        y = 0;
        return;
      }
      const maxX = (img.offsetWidth * (scale - 1)) / 2;
      const maxY = (img.offsetHeight * (scale - 1)) / 2;
      x = clamp(x, -maxX, maxX);
      y = clamp(y, -maxY, maxY);
    };

    const apply = () => {
      img.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
      zoomValue.textContent = `${Math.round(scale * 100)}%`;
    };

    const setScale = (value) => {
      scale = clamp(value, 1, 4);
      clampPan();
      apply();
    };

    const show = (i) => {
      pos = (i + list.length) % list.length;
      const source = $("img", list[pos]);
      img.src = source.currentSrc || source.src;
      img.alt = source.alt;
      count.textContent = `${pad2(pos + 1)} / ${pad2(list.length)}`;
      scale = 1;
      x = 0;
      y = 0;
      apply();
    };

    const open = (item) => {
      list = items.filter((el) => !el.classList.contains("is-missing"));
      if (!list.length) return;
      lastFocus = document.activeElement;
      show(Math.max(0, list.indexOf(item)));
      box.classList.add("is-open");
      box.setAttribute("aria-hidden", "false");
      state.lightboxOpen = true;
      body.classList.add("menu-open");
      if (lenis) lenis.stop();
      closeBtn.focus();
    };

    const close = () => {
      box.classList.remove("is-open");
      box.setAttribute("aria-hidden", "true");
      state.lightboxOpen = false;
      if (!state.menuOpen) body.classList.remove("menu-open");
      if (lenis && !state.menuOpen) lenis.start();
      if (lastFocus) lastFocus.focus();
    };

    items.forEach((item) => {
      item.addEventListener("click", () => {
        if (item.classList.contains("is-missing")) return;
        open(item);
      });
    });

    closeBtn.addEventListener("click", close);
    $("#lbPrev").addEventListener("click", () => show(pos - 1));
    $("#lbNext").addEventListener("click", () => show(pos + 1));
    stage.addEventListener("click", (e) => {
      if (e.target === stage && scale === 1) close();
    });

    document.addEventListener("keydown", (e) => {
      if (!state.lightboxOpen) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") show(pos - 1);
      if (e.key === "ArrowRight") show(pos + 1);
    });

    $("#zoomIn").addEventListener("click", () => setScale(scale + 0.5));
    $("#zoomOut").addEventListener("click", () => setScale(scale - 0.5));
    $("#zoomReset").addEventListener("click", () => setScale(1));

    stage.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        setScale(scale + (e.deltaY < 0 ? 0.2 : -0.2));
      },
      { passive: false },
    );

    img.addEventListener("dblclick", () => setScale(scale > 1 ? 1 : 2.2));

    stage.addEventListener("pointerdown", (e) => {
      if (scale <= 1) return;
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      originX = x;
      originY = y;
      stage.setPointerCapture(e.pointerId);
      stage.classList.add("is-dragging");
    });
    stage.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      x = originX + (e.clientX - startX);
      y = originY + (e.clientY - startY);
      clampPan();
      apply();
    });
    const stopDrag = () => {
      dragging = false;
      stage.classList.remove("is-dragging");
    };
    stage.addEventListener("pointerup", stopDrag);
    stage.addEventListener("pointercancel", stopDrag);
  }

  /* ---------- 09. Vídeo do hero ---------- */
  function initHeroVideo() {
    const video = $(".hero__video");
    if (!video) return;

    const safePlay = () => {
      const p = video.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    };

    if (prefersReduced) {
      video.removeAttribute("autoplay");
      video.pause();
    }

    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((en) => {
            if (en.isIntersecting && !state.paused) safePlay();
            else video.pause();
          });
        },
        { threshold: 0.05 },
      );
      io.observe(video);
    }
  }

  /* ---------- 10. Imagens ausentes (fallbacks) ---------- */
  function initFallbacks() {
    // Logos: se a imagem não existir, mostra o nome em texto
    $$("img[data-fallback]").forEach((img) => {
      const swap = () => {
        const span = document.createElement("span");
        span.textContent = img.dataset.fallback;
        img.replaceWith(span);
      };
      if (img.complete && img.naturalWidth === 0 && img.getAttribute("src"))
        swap();
      else img.addEventListener("error", swap, { once: true });
    });

    // Galeria: foto ainda não enviada vira um cartão com ♪
    $$(".g-item img").forEach((img) => {
      const item = img.closest(".g-item");
      const mark = () => item.classList.add("is-missing");
      if (img.complete && img.naturalWidth === 0 && img.getAttribute("src"))
        mark();
      else img.addEventListener("error", mark, { once: true });
    });
  }

  /* ---------- 11. Copiar telefone ---------- */
  function initCopy() {
    const btn = $("#copyPhone");
    const label = $("#copyPhoneText");
    if (!btn || !label) return;
    let timer;

    btn.addEventListener("click", async () => {
      const phone = btn.dataset.phone;
      let ok = false;

      try {
        await navigator.clipboard.writeText(phone);
        ok = true;
      } catch (err) {
        const ta = document.createElement("textarea");
        ta.value = phone;
        ta.setAttribute("readonly", "");
        ta.style.cssText = "position:fixed;opacity:0;";
        document.body.appendChild(ta);
        ta.select();
        try {
          ok = document.execCommand("copy");
        } catch (e) {
          ok = false;
        }
        ta.remove();
      }

      label.textContent = ok ? "Número copiado ✓" : phone;
      clearTimeout(timer);
      timer = setTimeout(() => {
        label.textContent = "Copiar número";
      }, 2200);
    });
  }

  /* ---------- 12. Reduzir movimento (preferência do sistema) ---------- */
  function initPause() {
    // Sem botão de pausa: só respeita a preferência "reduzir movimento" do sistema
    if (!state.paused) return;
    root.classList.add("is-paused");
    marquees.forEach((tween) => tween.paused(true));
    $$("video").forEach((v) => v.pause());
  }

  /* ---------- 13. Efeitos GSAP ---------- */
  let heroLines = [];
  let heroFades = [];

  function splitWords(el) {
    const text = el.textContent.trim();
    el.setAttribute("aria-label", text);
    el.textContent = "";
    const inners = [];

    text.split(/\s+/).forEach((word, i, all) => {
      const outer = document.createElement("span");
      outer.className = "word";
      outer.setAttribute("aria-hidden", "true");
      const inner = document.createElement("span");
      inner.className = "word__inner";
      inner.textContent = word;
      outer.appendChild(inner);
      el.appendChild(outer);
      inners.push(inner);
      if (i < all.length - 1) el.appendChild(document.createTextNode(" "));
    });

    return inners;
  }

  function initMotion() {
    if (prefersReduced) gsap.globalTimeline.timeScale(20);

    /* Estados iniciais do hero (ficam atrás do preloader) */
    heroLines = $$(".hero__title .line__inner");
    heroFades = $$('[data-hero="fade"]');
    gsap.set(heroLines, { yPercent: 115 });
    gsap.set(heroFades, { y: 30, opacity: 0 });
    gsap.set(".hero__photo img", { opacity: 0, y: 60, scale: 1.05 });

    /* Títulos: palavras sobem de dentro de uma máscara */
    $$("[data-split]").forEach((el) => {
      const words = splitWords(el);
      gsap.from(words, {
        yPercent: 115,
        duration: 1.1,
        ease: "power4.out",
        stagger: 0.06,
        scrollTrigger: { trigger: el, start: "top 85%", once: true },
      });
    });

    /* Revelação genérica (fade + subida) */
    $$("[data-reveal]").forEach((el) => {
      gsap.from(el, {
        y: 40,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
        clearProps: "transform,opacity",
        scrollTrigger: { trigger: el, start: "top 88%", once: true },
      });
    });

    /* Texto que acende palavra por palavra conforme o scroll */
    $$("[data-highlight]").forEach((el) => {
      const words = el.textContent.trim().split(/\s+/);
      el.textContent = "";
      const spans = words.map((w, i) => {
        const s = document.createElement("span");
        s.className = "hl-word";
        s.textContent = w;
        el.appendChild(s);
        if (i < words.length - 1) el.appendChild(document.createTextNode(" "));
        return s;
      });

      ScrollTrigger.create({
        trigger: el,
        start: "top 80%",
        end: "bottom 55%",
        scrub: true,
        onUpdate: (self) => {
          const n = Math.round(self.progress * spans.length);
          spans.forEach((s, i) => {
            s.style.opacity = i < n ? 1 : "";
          });
        },
      });
    });

    /* Parallax por seção */
    $$("[data-parallax]").forEach((el) => {
      const speed = parseFloat(el.dataset.parallax) || 0.2;
      gsap.to(el, {
        y: () => speed * window.innerHeight,
        ease: "none",
        scrollTrigger: {
          trigger: el.closest("section"),
          start: "top top",
          end: "bottom top",
          scrub: true,
          invalidateOnRefresh: true,
        },
      });
    });

    /* Disco do hero gira mais rápido conforme o scroll */
    gsap.to(".hero__vinyl", {
      rotation: "+=240",
      ease: "none",
      scrollTrigger: {
        trigger: ".hero",
        start: "top top",
        end: "bottom top",
        scrub: true,
      },
    });

    /* Marquees: rodam sozinhos e aceleram com a velocidade do scroll */
    let boost = 0;
    $$("[data-marquee]").forEach((el) => {
      const track = $(".marquee__track", el);
      const toLeft = el.dataset.marquee === "left";
      const tween = gsap.fromTo(
        track,
        { xPercent: toLeft ? 0 : -50 },
        { xPercent: toLeft ? -50 : 0, duration: 32, ease: "none", repeat: -1 },
      );
      marquees.push(tween);
    });
    ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: (self) => {
        boost = Math.min(Math.abs(self.getVelocity()) / 300, 8);
      },
    });
    gsap.ticker.add(() => {
      boost *= 0.92;
      marquees.forEach((t) => t.timeScale(1 + boost));
    });

    /* O Som: cada card encolhe e escurece quando o próximo cobre */
    const cards = $$(".s-card");
    cards.forEach((card, i) => {
      const nextCard = cards[i + 1];
      if (!nextCard) return;
      gsap.to(card, {
        scale: 0.92,
        filter: "brightness(0.55)",
        ease: "none",
        scrollTrigger: {
          trigger: nextCard,
          start: "top 85%",
          end: "top 15%",
          scrub: true,
        },
      });
    });

    /* Galeria: o scroll vertical vira movimento horizontal (desktop) */
    const mm = gsap.matchMedia();
    mm.add("(min-width: 900px)", () => {
      const pin = $("#galleryPin");
      const track = $("#galleryTrack");
      const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);

      gsap.to(track, {
        x: () => -distance(),
        ease: "none",
        scrollTrigger: {
          trigger: pin,
          start: "top top",
          end: () => `+=${distance()}`,
          pin: true,
          scrub: 1,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });
    });

    initCursor();
    initMagnetic();
    initHeroPointer();
  }

  function initCursor() {
    if (!finePointer) return;
    const cursor = $("#cursor");
    const label = $("#cursorLabel");
    const xTo = gsap.quickTo(cursor, "x", { duration: 0.4, ease: "power3" });
    const yTo = gsap.quickTo(cursor, "y", { duration: 0.4, ease: "power3" });
    let shown = false;

    window.addEventListener(
      "mousemove",
      (e) => {
        if (!shown) {
          shown = true;
          cursor.classList.add("is-on");
          gsap.set(cursor, { x: e.clientX, y: e.clientY });
        }
        xTo(e.clientX);
        yTo(e.clientY);
      },
      { passive: true },
    );

    document.addEventListener("mouseover", (e) => {
      const withLabel = e.target.closest("[data-cursor]");
      const link = e.target.closest('a, button, [role="slider"]');

      if (withLabel) {
        label.textContent = withLabel.dataset.cursor;
        cursor.classList.add("is-label");
        cursor.classList.remove("is-link");
      } else {
        label.textContent = "";
        cursor.classList.remove("is-label");
        cursor.classList.toggle("is-link", !!link);
      }
    });

    document.documentElement.addEventListener("mouseleave", () => {
      shown = false;
      cursor.classList.remove("is-on");
    });
  }

  function initMagnetic() {
    if (!finePointer) return;
    $$(".magnetic").forEach((el) => {
      const xTo = gsap.quickTo(el, "x", {
        duration: 0.6,
        ease: "elastic.out(1, 0.6)",
      });
      const yTo = gsap.quickTo(el, "y", {
        duration: 0.6,
        ease: "elastic.out(1, 0.6)",
      });

      el.addEventListener("mousemove", (e) => {
        if (state.paused) return;
        const r = el.getBoundingClientRect();
        xTo((e.clientX - (r.left + r.width / 2)) * 0.3);
        yTo((e.clientY - (r.top + r.height / 2)) * 0.3);
      });
      el.addEventListener("mouseleave", () => {
        xTo(0);
        yTo(0);
      });
    });
  }

  function initHeroPointer() {
    if (!finePointer) return;
    const hero = $(".hero");
    const gridX = gsap.quickTo(".hero__grid", "x", {
      duration: 1.2,
      ease: "power3",
    });
    const gridY = gsap.quickTo(".hero__grid", "y", {
      duration: 1.2,
      ease: "power3",
    });
    const photoX = gsap.quickTo(".hero__photo img", "x", {
      duration: 1.2,
      ease: "power3",
    });

    hero.addEventListener("mousemove", (e) => {
      if (state.paused) return;
      const px = e.clientX / window.innerWidth - 0.5;
      const py = e.clientY / window.innerHeight - 0.5;
      gridX(px * -30);
      gridY(py * -30);
      photoX(px * -18);
    });
  }

  function playIntro() {
    const tl = gsap.timeline({ defaults: { ease: "power4.out" } });
    tl.to(heroLines, { yPercent: 0, duration: 1.4, stagger: 0.12 }, 0.2)
      .to(
        ".hero__photo img",
        { opacity: 1, y: 0, scale: 1, duration: 1.6 },
        0.3,
      )
      .to(heroFades, { y: 0, opacity: 1, duration: 1, stagger: 0.1 }, 0.6);
  }

  /* ---------- 15. Inicialização ---------- */
  function init() {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);

    const year = $("#year");
    if (year) year.textContent = new Date().getFullYear();

    if (hasGSAP) gsap.registerPlugin(ScrollTrigger);

    initTheme();
    initFallbacks();
    initScroll();
    const menuApi = initMenu();
    initGoto(menuApi);
    initChapters();
    initScrollUI();
    initPlayer();
    initLightbox();
    initHeroVideo();
    initCopy();

    if (hasGSAP) initMotion();
    initPause();

    // Sem preloader: libera o scroll e inicia a animação de entrada direto
    body.classList.remove("is-loading");
    window.scrollTo(0, 0);
    if (lenis) lenis.start();
    if (hasGSAP) playIntro();

    // Recalcula posições quando tudo terminar de carregar
    if (hasGSAP) {
      let refreshTimer;
      const refresh = () => {
        clearTimeout(refreshTimer);
        refreshTimer = setTimeout(() => ScrollTrigger.refresh(), 150);
      };
      window.addEventListener("load", refresh);
      $$("img").forEach((img) => {
        if (!img.complete)
          img.addEventListener("load", refresh, { once: true });
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
