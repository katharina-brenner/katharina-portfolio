const projectGraphData = {
  systems: {
    code: "SYSTEM / 00",
    title: "Connected process model",
    path: "M34 224 C92 224 112 188 170 188 S254 206 316 156 S408 126 462 126 S550 76 606 76",
    points: [[34, 224], [170, 188], [316, 156], [462, 126], [606, 76]],
    labels: ["Inputs", "Operations", "Decisions"],
  },
  facility: {
    code: "PROCESS / 01",
    title: "Facility model",
    path: "M34 224 C92 216 126 190 178 192 S260 164 314 170 S394 120 444 128 S542 76 606 88",
    points: [[34, 224], [178, 192], [314, 170], [444, 128], [606, 88]],
    labels: ["Inputs", "Balances", "Scale"],
  },
  biota: {
    code: "BIOTA / 02",
    title: "Yield search",
    path: "M34 220 C92 184 134 218 184 176 S270 192 322 136 S416 152 470 104 S554 94 606 58",
    points: [[34, 220], [184, 176], [322, 136], [470, 104], [606, 58]],
    labels: ["Conditions", "Yield", "Optimize"],
  },
  acatian: {
    code: "ACATIAN / 03",
    title: "Scenario space",
    path: "M34 226 C98 224 132 202 188 206 S274 172 330 180 S418 140 474 146 S552 106 606 112",
    points: [[34, 226], [188, 206], [330, 180], [474, 146], [606, 112]],
    labels: ["Flowsheet", "Economics", "Compare"],
  },
  hackathon: {
    code: "NETWORK / 04",
    title: "Collaboration graph",
    path: "M34 202 C94 196 126 132 184 146 S270 212 326 164 S410 82 474 108 S550 154 606 78",
    points: [[34, 202], [184, 146], [326, 164], [474, 108], [606, 78]],
    labels: ["Stanford", "TUM", "Berkeley"],
  },
  trainer: {
    code: "SIMULATOR / 05",
    title: "Dynamic culture",
    path: "M34 212 C72 152 110 244 150 184 S230 118 270 176 S344 226 390 144 S470 78 512 132 S570 184 606 96",
    points: [[34, 212], [150, 184], [270, 176], [390, 144], [512, 132], [606, 96]],
    labels: ["Batch", "Fed-batch", "Continuous"],
  },
  microcarrier: {
    code: "PLANNER / 06",
    title: "Culture projection",
    path: "M34 230 C104 226 132 214 184 198 S270 168 326 142 S420 112 474 86 S550 68 606 52",
    points: [[34, 230], [184, 198], [326, 142], [474, 86], [606, 52]],
    labels: ["Seed", "Expand", "Harvest"],
  },
  lanes: {
    code: "LANE / 01",
    title: "Signal profile",
    path: "M34 206 C78 204 92 110 138 112 S190 222 236 218 S286 82 332 86 S382 184 428 180 S488 126 526 128 S568 76 606 74",
    points: [[34, 206], [138, 112], [236, 218], [332, 86], [428, 180], [526, 128], [606, 74]],
    labels: ["Mark", "Measure", "Export"],
  },
};

document.querySelectorAll("[data-project-graph]").forEach((element) => {
  const graph = projectGraphData[element.dataset.projectGraph];
  if (!graph) return;

  const points = graph.points
    .map(([x, y], index) => `<circle cx="${x}" cy="${y}" r="${index === graph.points.length - 1 ? 6 : 4}" />`)
    .join("");
  const labels = graph.labels.map((label) => `<span>${label}</span>`).join("");

  element.innerHTML = `
    <div class="project-graph-shell" aria-hidden="true">
      <div class="project-graph-header"><span>${graph.code}</span><span>Model output</span></div>
      <div class="project-graph-stage">
        <strong class="project-graph-title">${graph.title}</strong>
        <svg viewBox="0 0 640 280" focusable="false">
          <g class="project-graph-grid">
            <path d="M34 52H606M34 108H606M34 164H606M34 220H606" />
            <path d="M34 36V244M177 36V244M320 36V244M463 36V244M606 36V244" />
          </g>
          <path class="project-graph-area" d="${graph.path} L606 244 L34 244 Z" />
          <path class="project-graph-baseline" d="M34 220H606" />
          <path class="project-graph-line" pathLength="1" d="${graph.path}" />
          <g class="project-graph-points">${points}</g>
        </svg>
        <span class="project-graph-reticle"></span>
      </div>
      <div class="project-graph-footer">${labels}</div>
    </div>
    <span class="project-graph-open" aria-hidden="true">Open ↗</span>
  `;
});

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (!reducedMotion && window.matchMedia("(pointer: fine)").matches) {
  document.querySelectorAll("[data-project-graph]").forEach((visual) => {
    visual.addEventListener("pointermove", (event) => {
      const bounds = visual.getBoundingClientRect();
      const normalizedX = (event.clientX - bounds.left) / bounds.width;
      const normalizedY = (event.clientY - bounds.top) / bounds.height;
      const moveX = (normalizedX - 0.5) * 14;
      const moveY = (normalizedY - 0.5) * 10;

      visual.style.setProperty("--graph-x", `${moveX}px`);
      visual.style.setProperty("--graph-y", `${moveY}px`);
      visual.style.setProperty("--graph-cursor-x", `${normalizedX * 100}%`);
      visual.style.setProperty("--graph-cursor-y", `${normalizedY * 100}%`);
      visual.classList.add("is-tracking");
    }, { passive: true });

    visual.addEventListener("pointerleave", () => {
      visual.style.setProperty("--graph-x", "0px");
      visual.style.setProperty("--graph-y", "0px");
      visual.classList.remove("is-tracking");
    }, { passive: true });
  });
}

const revealElements = document.querySelectorAll(".reveal");

if (reducedMotion) {
  revealElements.forEach((element) => element.classList.add("is-visible"));
} else {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -60px" },
  );

  revealElements.forEach((element, index) => {
    element.style.setProperty("--reveal-delay", `${(index % 3) * 70}ms`);
    revealObserver.observe(element);
  });
}

const header = document.querySelector("[data-header]");
const progress = document.querySelector("[data-scroll-progress]");
const navLinks = [...document.querySelectorAll("[data-nav-link]")];
const trackedSections = navLinks
  .map((link) => {
    const href = link.getAttribute("href");
    return href?.startsWith("#") ? document.querySelector(href) : null;
  })
  .filter(Boolean);
let scrollTicking = false;

const updateScrollInterface = () => {
  const currentScroll = window.scrollY;
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const ratio = scrollable > 0 ? Math.min(currentScroll / scrollable, 1) : 0;

  header?.classList.toggle("is-scrolled", currentScroll > 24);
  if (progress) progress.style.transform = `scaleX(${ratio})`;
  scrollTicking = false;
};

window.addEventListener("scroll", () => {
  if (scrollTicking) return;
  scrollTicking = true;
  window.requestAnimationFrame(updateScrollInterface);
}, { passive: true });

updateScrollInterface();

if (trackedSections.length) {
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (!visible) return;

      navLinks.forEach((link) => {
        const isActive = link.getAttribute("href") === `#${visible.target.id}`;
        link.classList.toggle("is-active", isActive);
        if (isActive) {
          link.setAttribute("aria-current", "location");
        } else {
          link.removeAttribute("aria-current");
        }
      });
    },
    { rootMargin: "-24% 0px -62% 0px", threshold: [0, 0.2, 0.5] },
  );

  trackedSections.forEach((section) => sectionObserver.observe(section));
}

document.querySelectorAll("[data-year]").forEach((year) => {
  year.textContent = new Date().getFullYear();
});

const menuToggle = document.querySelector("[data-menu-toggle]");
const mobileMenu = document.querySelector("[data-mobile-menu]");
const mobileLinks = document.querySelectorAll("[data-mobile-link]");

const setMenuOpen = (isOpen) => {
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  mobileMenu.setAttribute("aria-hidden", String(!isOpen));
  mobileMenu.toggleAttribute("inert", !isOpen);
  mobileMenu.classList.toggle("is-open", isOpen);
  document.body.classList.toggle("menu-open", isOpen);
};

menuToggle?.addEventListener("click", () => {
  setMenuOpen(menuToggle.getAttribute("aria-expanded") !== "true");
});

mobileLinks.forEach((link) => {
  link.addEventListener("click", () => setMenuOpen(false));
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setMenuOpen(false);
});

window.addEventListener("resize", () => {
  if (window.innerWidth > 820) setMenuOpen(false);
}, { passive: true });

const vessel = document.querySelector(".process-vessel");

if (vessel && !reducedMotion) {
  window.addEventListener(
    "pointermove",
    (event) => {
      const x = (event.clientX / window.innerWidth - 0.5) * 12;
      const y = (event.clientY / window.innerHeight - 0.5) * 12;
      vessel.style.setProperty("--pointer-x", `${x}px`);
      vessel.style.setProperty("--pointer-y", `${y}px`);
    },
    { passive: true },
  );
}

document.querySelectorAll("[data-facility-film]").forEach((facility) => {
  if (reducedMotion) return;

  facility.addEventListener("pointermove", (event) => {
    const bounds = facility.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 18;
    const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 12;
    facility.style.setProperty("--facility-x", `${x}px`);
    facility.style.setProperty("--facility-y", `${y}px`);
  }, { passive: true });

  facility.addEventListener("pointerleave", () => {
    facility.style.setProperty("--facility-x", "0px");
    facility.style.setProperty("--facility-y", "0px");
  }, { passive: true });
});

document.querySelectorAll('a[target="_blank"]').forEach((link) => {
  const accessibleLabel = link.getAttribute("aria-label");

  if (accessibleLabel) {
    if (!accessibleLabel.toLowerCase().includes("new tab")) {
      link.setAttribute("aria-label", `${accessibleLabel} (opens in a new tab)`);
    }
    return;
  }

  if (link.querySelector("[data-new-tab-note]")) return;

  const note = document.createElement("span");
  note.className = "visually-hidden";
  note.dataset.newTabNote = "";
  note.textContent = " (opens in a new tab)";
  link.append(note);
});
