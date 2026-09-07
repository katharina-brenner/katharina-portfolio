import { readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(process.argv[2] || ".");
const publicRoot = process.argv[2] ? root : path.join(root, "public");
const origin = "https://katharinabrenner.com";
const pages = [
  ["index.html", `${origin}/`],
  ["work/index.html", `${origin}/work/`],
  ["work/cultivated-meat-process-model/index.html", `${origin}/work/cultivated-meat-process-model/`],
  ["work/bioreactor-technical-analysis/index.html", `${origin}/work/bioreactor-technical-analysis/`],
  ["approach/index.html", `${origin}/approach/`],
  ["publications/index.html", `${origin}/publications/`],
  ["open-source/index.html", `${origin}/open-source/`],
  ["services/index.html", `${origin}/services/`],
  ["contact/index.html", `${origin}/contact/`],
];

const failures = [];
const seenTitles = new Map();
const seenDescriptions = new Map();

function capture(html, pattern) {
  return html.match(pattern)?.[1]?.replace(/\s+/g, " ").trim() || "";
}

for (const [file, expectedCanonical] of pages) {
  const html = await readFile(path.join(root, file), "utf8");
  const title = capture(html, /<title>([\s\S]*?)<\/title>/i);
  const description = capture(html, /<meta\s+name="description"\s+content="([^"]+)"/i);
  const canonical = capture(html, /<link\s+rel="canonical"\s+href="([^"]+)"/i);
  const ogUrl = capture(html, /<meta\s+property="og:url"\s+content="([^"]+)"/i);
  const h1Count = (html.match(/<h1\b/gi) || []).length;
  const robots = capture(html, /<meta\s+name="robots"\s+content="([^"]+)"/i);
  const jsonLdBlocks = [...html.matchAll(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi)];

  if (!title || title.length > 70) failures.push(`${file}: title is missing or longer than 70 characters`);
  if (!description || description.length < 100 || description.length > 170) failures.push(`${file}: meta description should be 100-170 characters`);
  if (canonical !== expectedCanonical) failures.push(`${file}: canonical URL does not match ${expectedCanonical}`);
  if (ogUrl !== canonical) failures.push(`${file}: og:url does not match its canonical URL`);
  if (h1Count !== 1) failures.push(`${file}: expected one h1, found ${h1Count}`);
  if (!robots.includes("index") || !robots.includes("follow")) failures.push(`${file}: page is not explicitly indexable`);
  if (!jsonLdBlocks.length) failures.push(`${file}: missing JSON-LD structured data`);

  for (const [, block] of jsonLdBlocks) {
    try {
      JSON.parse(block);
    } catch (error) {
      failures.push(`${file}: invalid JSON-LD (${error.message})`);
    }
  }

  if (seenTitles.has(title)) failures.push(`${file}: title duplicates ${seenTitles.get(title)}`);
  if (seenDescriptions.has(description)) failures.push(`${file}: description duplicates ${seenDescriptions.get(description)}`);
  seenTitles.set(title, file);
  seenDescriptions.set(description, file);
}

const sitemap = await readFile(path.join(publicRoot, "sitemap.xml"), "utf8");
for (const [, canonical] of pages) {
  if (!sitemap.includes(`<loc>${canonical}</loc>`)) failures.push(`sitemap.xml: missing ${canonical}`);
}

const robots = await readFile(path.join(publicRoot, "robots.txt"), "utf8");
if (!robots.includes(`Sitemap: ${origin}/sitemap.xml`)) failures.push("robots.txt: missing the canonical sitemap URL");

const notFound = await readFile(path.join(publicRoot, "404.html"), "utf8");
if (!/<meta\s+name="robots"\s+content="noindex, follow"/i.test(notFound)) failures.push("404.html: missing noindex, follow");

if (failures.length) {
  console.error(`SEO validation failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}

console.log(`SEO validation passed for ${pages.length} canonical pages.`);
