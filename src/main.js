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
let lastScroll = 0;

window.addEventListener(
  "scroll",
  () => {
    const currentScroll = window.scrollY;
    header.classList.toggle("is-scrolled", currentScroll > 24);
    header.classList.toggle("is-hidden", currentScroll > lastScroll && currentScroll > 180);
    lastScroll = currentScroll;
  },
  { passive: true },
);

document.querySelector("[data-year]").textContent = new Date().getFullYear();

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

