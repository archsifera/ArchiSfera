import { appendFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

// Use the upload action's exact artifact ID. Do not rediscover artifacts through
// the Actions results service: its list can lag behind a successful upload.
export async function deployPages({
  env = process.env,
  request = fetch,
  pause = (ms) => new Promise((r) => setTimeout(r, ms)),
  output = async (value) => appendFile(env.GITHUB_OUTPUT, value),
  attempts = 120,
} = {}) {
  const artifact = env.PAGES_ARTIFACT_ID;
  if (!/^\d+$/.test(artifact || "")) throw new Error("Missing Pages artifact ID from upload step");
  if (!/^[\w.-]+\/[\w.-]+$/.test(env.GITHUB_REPOSITORY || "")) throw new Error("Invalid repository");
  if (!env.GH_TOKEN || !env.ACTIONS_ID_TOKEN_REQUEST_TOKEN || !env.ACTIONS_ID_TOKEN_REQUEST_URL)
    throw new Error("Missing workflow credentials");
  const api = `${env.GITHUB_API_URL || "https://api.github.com"}/repos/${env.GITHUB_REPOSITORY}/pages/deployments`;
  const headers = {
    Authorization: `Bearer ${env.GH_TOKEN}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };
  async function json(url, options) {
    const response = await request(url, options);
    const body = await response.json();
    if (!response.ok)
      throw new Error(`GitHub request failed (${response.status}): ${body.message || "Unknown error"}`);
    return body;
  }
  const identity = await json(env.ACTIONS_ID_TOKEN_REQUEST_URL, {
    headers: { Authorization: `Bearer ${env.ACTIONS_ID_TOKEN_REQUEST_TOKEN}` },
  });
  if (!identity.value) throw new Error("GitHub did not issue a workflow identity token");
  const deployment = await json(api, {
    method: "POST",
    headers,
    body: JSON.stringify({
      artifact_id: Number(artifact),
      pages_build_version: env.GITHUB_SHA,
      oidc_token: identity.value,
    }),
  });
  if (!deployment.id) throw new Error("GitHub did not return a Pages deployment ID");
  for (let index = 0; index < attempts; index++) {
    const state = await json(`${api}/${encodeURIComponent(deployment.id)}`, { headers });
    if (state.status === "succeed") {
      if (!/^https?:\/\//.test(deployment.page_url || "")) throw new Error("Missing deployed page URL");
      await output(`page_url=${deployment.page_url}\n`);
      return deployment.page_url;
    }
    if (state.status !== "deployment_in_progress" && state.status !== "queued")
      throw new Error(`Pages deployment failed: ${state.status}`);
    if (index < attempts - 1) await pause(5000);
  }
  throw new Error("Pages deployment timed out");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  deployPages()
    .then((url) => console.log(`Published ${url}`))
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
