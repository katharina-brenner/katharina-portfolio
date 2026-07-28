const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
