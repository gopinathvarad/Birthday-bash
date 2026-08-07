import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const serverDirectory = resolve("dist", "server");
const serverEntry = resolve(serverDirectory, "index.js");

const workerSource = `const worker = {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404 || !["GET", "HEAD"].includes(request.method)) {
      return response;
    }

    const url = new URL(request.url);
    if (/\\.[^/]+$/.test(url.pathname)) return response;

    const fallback = new Request(new URL("/index.html", request.url), request);
    return env.ASSETS.fetch(fallback);
  },
};

export default worker;
`;

await mkdir(serverDirectory, { recursive: true });
await writeFile(serverEntry, workerSource, "utf8");
