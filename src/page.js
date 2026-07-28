const page = document.body.dataset.page;

const routes = [
  { id: "work", index: "01", label: "Work", href: "/work/" },
  { id: "approach", index: "02", label: "Approach", href: "/approach/" },
  { id: "publications", index: "03", label: "Publications", href: "/publications/" },
  { id: "open-source", index: "04", label: "Open source", href: "/open-source/" },
];

const navigation = routes
  .map(({ id, index, label, href }) => {
    const current = page === id ? ' class="is-active" aria-current="page"' : "";
    return `<a href="${href}" data-nav-link${current}><span>${index}</span> ${label}</a>`;
  })
  .join("");

const mobileNavigation = [
  ...routes.map((route) => ({ ...route, label: route.id === "work" ? "Selected work" : route.label })),
  { id: "contact", index: "05", label: "Contact", href: "/contact/" },
]
  .map(({ id, index, label, href }) => {
    const current = page === id ? ' class="is-active" aria-current="page"' : "";
    return `<a href="${href}" data-mobile-link${current}><span>${index}</span>${label}</a>`;
  })
  .join("");

document.querySelector("[data-shell-header]").outerHTML = `
  <header class="site-header" data-header>
    <a class="wordmark" href="/" aria-label="Katharina Julia Brenner, home">
      <span class="wordmark-mark" aria-hidden="true"><span>KJB</span></span>
      <span class="wordmark-role">Process systems</span>
    </a>
    <nav class="desktop-nav" aria-label="Main navigation">${navigation}</nav>
    <a class="header-cta${page === "contact" ? " is-active" : ""}" href="/contact/"${page === "contact" ? ' aria-current="page"' : ""}>
      Let’s connect <span aria-hidden="true">↗</span>
    </a>
    <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="mobile-menu" data-menu-toggle>
      <span>Menu</span><i aria-hidden="true"></i>
    </button>
    <div class="scroll-progress" aria-hidden="true"><span data-scroll-progress></span></div>
  </header>
  <nav class="mobile-menu" id="mobile-menu" aria-label="Mobile navigation" aria-hidden="true" inert data-mobile-menu>
    <div class="mobile-menu-meta"><span>Navigation</span><span>Munich · DE</span></div>
    ${mobileNavigation}
  </nav>
`;

document.querySelector("[data-shell-footer]").outerHTML = `
  <footer>
    <span>© <span data-year></span> Katharina Julia Brenner</span>
    <span>Science × systems × progress</span>
    <a href="#main">Back to top ↑</a>
  </footer>
`;

import("./main.js");
