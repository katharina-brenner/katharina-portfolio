import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

await mkdir("dist/.openai", { recursive: true });
await mkdir("dist/server", { recursive: true });
await copyFile(".openai/hosting.json", "dist/.openai/hosting.json");

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".webp": "image/webp",
  ".xml": "application/xml; charset=utf-8",
};

async function collectAssets(directory, root = directory) {
  const assets = {};
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name === ".openai" || entry.name === "server" || entry.name === "index.js") {
      continue;
    }

    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      Object.assign(assets, await collectAssets(absolutePath, root));
      continue;
    }

    const publicPath = `/${path.relative(root, absolutePath).split(path.sep).join("/")}`;
    const extension = path.extname(entry.name);
    assets[publicPath] = {
      body: (await readFile(absolutePath)).toString("base64"),
      contentType: contentTypes[extension] || "application/octet-stream",
    };
  }

  return assets;
}

const assets = await collectAssets("dist");
const workerSource = `const assets = ${JSON.stringify(assets)};

function decode(base64) {
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    let pathname = url.pathname;
    let status = 200;
    if (pathname === "/") {
      pathname = "/index.html";
    } else if (pathname.endsWith("/")) {
      const directoryIndex = \`\${pathname}index.html\`;
      if (assets[directoryIndex]) {
        pathname = directoryIndex;
      } else {
        pathname = "/404.html";
        status = 404;
      }
    } else if (!assets[pathname] && !pathname.split("/").pop().includes(".")) {
      const directoryIndex = \`\${pathname}/index.html\`;
      if (assets[directoryIndex]) {
        pathname = directoryIndex;
      } else {
        pathname = "/404.html";
        status = 404;
      }
    }

    let asset = assets[pathname];
    if (!asset) {
      pathname = "/404.html";
      asset = assets[pathname];
      status = 404;
    }
    if (!asset) {
      return new Response("Not found", {
        status: 404,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    const cacheControl = pathname.endsWith(".html")
      || pathname === "/robots.txt"
      || pathname === "/sitemap.xml"
      || pathname === "/site.webmanifest"
      ? "public, max-age=0, must-revalidate"
      : "public, max-age=31536000, immutable";

    return new Response(request.method === "HEAD" ? null : decode(asset.body), {
      status,
      headers: {
        "Content-Type": asset.contentType,
        "Cache-Control": cacheControl,
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "strict-origin-when-cross-origin",
      },
    });
  },
};
`;

await writeFile("dist/server/index.js", workerSource);
await writeFile("dist/index.js", workerSource);
