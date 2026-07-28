import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

await mkdir("dist/.openai", { recursive: true });
await mkdir("dist/server", { recursive: true });
await copyFile(".openai/hosting.json", "dist/.openai/hosting.json");

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
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
    if (pathname === "/") {
      pathname = "/index.html";
    } else if (pathname.endsWith("/")) {
      const directoryIndex = \`\${pathname}index.html\`;
      pathname = assets[directoryIndex] ? directoryIndex : "/index.html";
    } else if (!assets[pathname] && !pathname.split("/").pop().includes(".")) {
      const directoryIndex = \`\${pathname}/index.html\`;
      pathname = assets[directoryIndex] ? directoryIndex : "/index.html";
    }

    const asset = assets[pathname];
    if (!asset) {
      return new Response("Not found", { status: 404 });
    }

    const cacheControl = pathname.endsWith("/index.html")
      ? "public, max-age=0, must-revalidate"
      : "public, max-age=31536000, immutable";

    return new Response(decode(asset.body), {
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
