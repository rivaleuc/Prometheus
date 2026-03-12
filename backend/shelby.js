// ─── shelby.js — Shelby Protocol client ──────────────────
const https = require("https");

const HOST = process.env.SHELBY_HOST || "api.shelbynet.shelby.xyz";

function shelbyRequest({ method, path, buffer, headers = {} }) {
  return new Promise((resolve, reject) => {
    const payload = Buffer.isBuffer(buffer) ? buffer : null;
    const options = {
      hostname: HOST,
      path: `/shelby${path}`,
      method,
      headers: {
        "Content-Length": payload ? payload.length : 0,
        ...(payload ? { "Content-Type": "application/octet-stream" } : {}),
        ...headers,
      },
    };

    const req = https.request(options, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve({
        status: res.statusCode,
        headers: res.headers,
        body: Buffer.concat(chunks),
        text: Buffer.concat(chunks).toString(),
      }));
    });

    req.on("error", reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error("Shelby timeout")); });
    if (payload) req.write(payload);
    req.end();
  });
}

// PUT blob to Shelby
async function uploadBlob(account, blobName, buffer) {
  const path = `/v1/blobs/${account}/${encodeURIComponent(blobName)}`;
  const res = await shelbyRequest({ method: "PUT", path, buffer });
  if (res.status !== 204 && res.status !== 200) {
    throw new Error(`Shelby upload failed: HTTP ${res.status} — ${res.text}`);
  }
  return { ok: true, blobName };
}

// GET blob from Shelby → pipe to Express response
function streamBlob(account, blobName, expressRes) {
  return new Promise((resolve, reject) => {
    const path = `/shelby/v1/blobs/${account}/${encodeURIComponent(blobName)}`;
    const options = {
      hostname: HOST,
      path,
      method: "GET",
      headers: { "Content-Length": 0 },
    };

    const req = https.request(options, (shelbyRes) => {
      if (shelbyRes.statusCode === 200) {
        expressRes.setHeader("Content-Type",
          shelbyRes.headers["content-type"] || "application/octet-stream");
        if (shelbyRes.headers["content-length"]) {
          expressRes.setHeader("Content-Length", shelbyRes.headers["content-length"]);
        }
        shelbyRes.pipe(expressRes);
        shelbyRes.on("end", resolve);
      } else {
        let d = "";
        shelbyRes.on("data", (c) => (d += c));
        shelbyRes.on("end", () => reject(new Error(`Shelby HTTP ${shelbyRes.statusCode}: ${d}`)));
      }
    });

    req.on("error", reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error("Stream timeout")); });
    req.end();
  });
}

// Create micropayment session (server-sponsored)
async function createSession(userIdentity) {
  // Create micropayment channel if needed
  const channelRes = await shelbyRequest({
    method: "POST",
    path: "/v1/sessions/micropaymentchannels",
    headers: { "Content-Type": "application/json", "Content-Length": 2 },
    buffer: Buffer.from("{}"),
  });

  const channelId = channelRes.headers["x-channel-id"] ||
    (() => { try { return JSON.parse(channelRes.text)?.channelId; } catch { return "default"; } })();

  const sessionRes = await shelbyRequest({
    method: "POST",
    path: "/v1/sessions",
    headers: { "Content-Type": "application/json" },
    buffer: Buffer.from(JSON.stringify({ userIdentity, micropaymentUpdate: channelId || "default" })),
  });

  if (sessionRes.status === 201) {
    const { sessionId } = JSON.parse(sessionRes.text);
    return sessionId;
  }
  throw new Error(`Session creation failed: ${sessionRes.status} — ${sessionRes.text}`);
}

module.exports = { uploadBlob, streamBlob, createSession };
