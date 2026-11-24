import test from "node:test";
import assert from "node:assert/strict";
import { deployPages } from "./deploy-pages.mjs";

const env = {
  PAGES_ARTIFACT_ID: "12345",
  GITHUB_REPOSITORY: "example/site",
  GH_TOKEN: "test-token",
  ACTIONS_ID_TOKEN_REQUEST_TOKEN: "test-runtime",
  ACTIONS_ID_TOKEN_REQUEST_URL: "https://identity.example/token",
  GITHUB_SHA: "test-commit",
};
function fixture(statuses = ["deployment_in_progress", "succeed"]) {
  const calls = [],
    outputs = [];
  return {
    calls,
    outputs,
    options: {
      env,
      pause: async () => {},
      output: async (value) => outputs.push(value),
      request: async (url, options) => {
        calls.push({ url, options });
        const body =
          url === env.ACTIONS_ID_TOKEN_REQUEST_URL
            ? { value: "test-identity" }
            : options.method === "POST"
              ? { id: "deployment-42", page_url: "https://www.archisfera.net/" }
              : { status: statuses.shift() };
        return { ok: true, status: 200, json: async () => body };
      },
    },
  };
}
test("deploys exact uploaded artifact and waits for success without artifact discovery", async () => {
  const f = fixture();
  assert.equal(await deployPages(f.options), "https://www.archisfera.net/");
  const create = f.calls.find((call) => call.options.method === "POST");
  assert.deepEqual(JSON.parse(create.options.body), {
    artifact_id: 12345,
    pages_build_version: "test-commit",
    oidc_token: "test-identity",
  });
  assert(!f.calls.some((call) => call.url.includes("artifacts")));
  assert.deepEqual(f.outputs, ["page_url=https://www.archisfera.net/\n"]);
});
test("rejects missing upload ID before any network call", async () => {
  const f = fixture();
  await assert.rejects(deployPages({ ...f.options, env: { ...env, PAGES_ARTIFACT_ID: "" } }), /artifact ID/);
  assert.equal(f.calls.length, 0);
});
test("reports failed deployment without publishing success output", async () => {
  const f = fixture(["deployment_failed"]);
  await assert.rejects(deployPages(f.options), /deployment_failed/);
  assert.deepEqual(f.outputs, []);
});
test("bounds a deployment that never finishes", async () => {
  const f = fixture(["deployment_in_progress", "deployment_in_progress"]);
  await assert.rejects(deployPages({ ...f.options, attempts: 2 }), /timed out/);
  assert.deepEqual(f.outputs, []);
});
