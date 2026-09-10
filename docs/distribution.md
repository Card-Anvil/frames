# Distributing frames

How a frame gets from the person who made it to the person using it, and what
that path can and cannot do. Written down because one of its properties was
measured rather than assumed, and it decides the shape of anything built on top.

## The path today

A frame author works in a repository — [frame-template] is one set up for it —
and presses **Release**. That builds a `.cardframe` per frame and publishes them
to a GitHub release, together with `frame-index.json` describing the set.

Two URLs matter, and both are fixed, need no API call, and need no
authentication:

```
https://github.com/<owner>/<repo>/releases/latest/download/frame-index.json
https://github.com/<owner>/<repo>/releases/latest/download/<slug>-<version>.cardframe
```

`latest` resolves to the newest **published** release, which is why the release
workflow publishes rather than drafts, and why a package release in this
repository is created with `--latest=false` — it must not take that slot.

A user installs a frame by downloading the `.cardframe` and dropping it into
Card Anvil. That works everywhere, because the browser is not fetching it: the
user is.

## What a browser can read, and what it cannot

⚠ **This is measured, not inferred. Re-measure before trusting it — GitHub can
change it.** Last checked 2026-09-10, with `Origin: https://cardanvil.com`:

| Request                                                              | `Access-Control-Allow-Origin` |
| -------------------------------------------------------------------- | ----------------------------- |
| `api.github.com/repos/<o>/<r>/releases/latest`                       | `*`                           |
| `api.github.com/repos/<o>/<r>/releases/assets/<id>` → 302            | `*`                           |
| `github.com/<o>/<r>/releases/download/<tag>/<file>` → 302            | **none**                      |
| the 200 those redirect to, on `release-assets.githubusercontent.com` | **none**                      |
| `raw.githubusercontent.com/<o>/<r>/<ref>/<path>`                     | `*`                           |

So: **a browser can read release metadata but cannot read release bytes.** Both
download paths end at a host that sends no CORS header, so `fetch` fails on the
final hop regardless of which one you start from — the `*` on the API's redirect
is worthless, because the redirect is followed to a host without one.

Two consequences, and neither is a detail:

- **A marketplace cannot be a purely static site.** It can list frames from
  metadata alone, but any feature that reads a bundle — verifying a checksum,
  showing what layouts it really contains, installing in one click from the web —
  needs something server-side to fetch the bytes on the browser's behalf. On
  Cloudflare Workers, which is where cardanvil.com already runs, that is a small
  proxy rather than new infrastructure.
- **Installing a frame from a URL in the web app needs that same proxy.** The
  desktop app does not: Tauri fetches through Rust, which is not subject to CORS.
  Anything that works in `tauri-dev` and not in a browser is likely to be this.

`raw.githubusercontent.com` is readable, so a file **committed** to a repository
can be fetched from a browser directly. That is a real option for small metadata
— the marketplace index below — and not for frame art, which is far too large to
put in git.

## The planned marketplace

Not built. The shape it is designed around:

1. A public repository holds one entry per frame — the author, the repository the
   frames live in, and whatever describes them for browsing. Adding a frame is a
   pull request against it, which makes review a normal part of the process and
   costs no infrastructure.
2. cardanvil.com reads that repository as its database, resolving each entry to
   the author's `frame-index.json` for the current versions and download URLs.
3. Installing is still a `.cardframe` reaching the app — from a download, or from
   a click that goes through the proxy above.

What that buys: no server holding frame art, no upload path to police, and every
frame staying under its author's control. Deleting a release removes the frame,
which is as it should be.

What it costs, and what to decide before building it:

- **The index is only as fresh as the last poll.** GitHub's API is rate-limited
  per IP unauthenticated, so aggregation belongs on a schedule and in a cache,
  not in a page load.
- **`manifest.author` is unauthenticated** — whatever the author typed. Binding a
  frame id to a repository in the marketplace entry is what makes it mean
  anything, and it is why an id is documented as permanent. The updater already
  carries a minisign public key, so signing bundles is possible if it becomes
  worth it; "the user chose this file" does not need it, "a marketplace served it
  to them" might.
- **An id collision between two authors** has to be settled by the marketplace,
  since nothing in the format prevents it. First registration winning is the
  obvious rule, and it needs to be written down before there is a second one.

## Versions, and which is which

Four version numbers live near each other and answer different questions:

| Version                 | What it says                                    | Where                            |
| ----------------------- | ----------------------------------------------- | -------------------------------- |
| `contractVersion`       | What a loader must understand to read the frame | `frame.json`, `frame-index.json` |
| `@cardanvil/frame-kit`  | Which authoring tools you have                  | the npm package                  |
| The frame's own version | Which build of the art this is                  | the release tag, `frame.json`    |
| `formatVersion`         | The shape of `frame-index.json` itself          | `frame-index.json`               |

They move independently on purpose. `frame-kit` changes for authoring reasons
that do not touch the format; a frame is rebuilt without the contract moving.
See the [contract rules](../README.md#packaging-a-frame) for what a major and a
minor mean.

## See also

- [`README.md`](../README.md) — authoring a frame, and the bundle format
- [`packages/frame-kit/README.md`](../packages/frame-kit/README.md) — the contract package
- [frame-template] — a repository set up to build and release frames
- Card Anvil's `docs/third-party-frames.md` — what happens once a bundle reaches
  the app: installing, linking a folder, and every check a bundle goes through

[frame-template]: https://github.com/Card-Anvil/frame-template
