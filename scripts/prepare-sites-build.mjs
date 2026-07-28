import { copyFile, mkdir, writeFile } from "node:fs/promises";

await mkdir("dist/.openai", { recursive: true });
await mkdir("dist/server", { recursive: true });
await copyFile(".openai/hosting.json", "dist/.openai/hosting.json");

const workerSource = `async function fromAssets(request, env, pathname) {
  const url = new URL(request.url);
  for (const prefix of ["/dist", ""]) {
    url.pathname = prefix + pathname;
    const response = await env.ASSETS.fetch(new Request(url, request));
    if (response.status !== 404) return response;
  }
  return env.ASSETS.fetch(request);
}

export default {
  async fetch(request, env) {
    if (!env?.ASSETS?.fetch) {
      return new Response("Static asset binding is unavailable.", { status: 500 });
    }

    const url = new URL(request.url);
    let pathname = url.pathname;
    if (pathname.endsWith("/")) {
      pathname += "index.html";
    } else if (!pathname.split("/").pop().includes(".")) {
      pathname += "/index.html";
    }

    return fromAssets(request, env, pathname);
  },
};
`;

await writeFile("dist/server/index.js", workerSource);
await writeFile("dist/index.js", workerSource);

