# smora — photo booth

A single-page photo booth. Camera runs entirely in the browser; nothing is
uploaded unless someone presses **Save to my device**.

## Files

| File | What it is |
|---|---|
| `index.html` | The page and all styling |
| `app.js` | Booth logic — camera, strip drawing, stickers, admin |
| `api/discord.js` | Vercel function that forwards a saved strip to Discord |
| `strips.json` | Extra strip layouts that ship with the site (starts empty) |
| `vercel.json` | Security headers |

## Deploy to Vercel

1. Push this folder to a GitHub repo.
2. In Vercel: **Add New → Project → Import** the repo. Framework preset: **Other**. Deploy.
3. Open **Project → Settings → Environment Variables** and add:

   | Name | Value |
   |---|---|
   | `DISCORD_WEBHOOK` | your webhook URL |

   Apply it to Production, Preview and Development, then **Redeploy**.

Get the webhook from Discord: *Server Settings → Integrations → Webhooks → New
Webhook → Copy Webhook URL*.

The webhook stays on the server. It is never in the page source, so nobody can
copy it out of your site.

If you skip step 3 the booth still works — saving just writes the file to the
device and nothing goes to Discord.

## How saving works

There is no separate "send to Discord" button any more. Pressing **Save to my
device** does both things: the PNG downloads, and the exact same PNG is posted
to your Discord channel.

## Adding strip layouts

Tap the **smora** logo five times (or open `/?admin=1`), enter the passcode, and
the strip manager opens.

- Set columns, rows, photo size, border, gap, footer and corner radius. The
  preview updates live.
- Optionally upload a transparent PNG **overlay** — drawn over the whole strip,
  for borders, doodles or a logo. Keep it the same proportions as the preview.
- **Add this strip** saves it to the browser you are using.

To give every visitor your layouts, press **Export as file**, then replace
`strips.json` in the repo with the downloaded file and redeploy.

Change the passcode in `app.js`:

```js
const CONFIG = {
  name: "smora",
  adminPass: "smora2026",   // ← change this
  ...
};
```

The passcode only keeps guests out of the panel on a shared booth device. It is
in the client code, so treat it as a soft lock, not real security.

## Local preview

```bash
npx serve .
```

Then open the printed URL. Cameras need `https://` or `localhost`, so opening
`index.html` by double-clicking will not give you a camera. The Discord relay
only runs on Vercel (or via `vercel dev`).
