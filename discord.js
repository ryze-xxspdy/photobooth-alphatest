/* Relays a finished strip to Discord.
   The webhook URL lives in the DISCORD_WEBHOOK environment variable on
   Vercel, so it is never visible in the page source. */

export const config = { runtime: "edge" };

const BOT_NAME = "smora 📸";
const MESSAGE  = "Fresh from the booth ✨";
const MAX_BYTES = 8 * 1024 * 1024;

export default async function handler(req) {
  if (req.method !== "POST") {
    return json({ ok: false, error: "Use POST" }, 405);
  }

  const hook = process.env.DISCORD_WEBHOOK;
  if (!hook) {
    // No webhook configured — the booth still works, nothing is sent.
    return json({ ok: false, error: "No webhook configured" }, 501);
  }

  let file;
  try {
    const form = await req.formData();
    file = form.get("file");
  } catch {
    return json({ ok: false, error: "Could not read the upload" }, 400);
  }

  if (!file || typeof file === "string") {
    return json({ ok: false, error: "No image in the request" }, 400);
  }
  if (file.size > MAX_BYTES) {
    return json({ ok: false, error: "Image is too large" }, 413);
  }
  if (file.type && !file.type.startsWith("image/")) {
    return json({ ok: false, error: "Only images are accepted" }, 415);
  }

  const out = new FormData();
  out.append("file", file, `strip-${Date.now()}.png`);
  out.append("payload_json", JSON.stringify({
    username: BOT_NAME,
    content: MESSAGE,
    allowed_mentions: { parse: [] }
  }));

  try {
    const res = await fetch(hook, { method: "POST", body: out });
    if (!res.ok) {
      return json({ ok: false, error: `Discord replied ${res.status}` }, 502);
    }
    return json({ ok: true });
  } catch {
    return json({ ok: false, error: "Could not reach Discord" }, 502);
  }
}

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" }
  });
}
