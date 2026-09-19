# The Governor — public context release

This is the deliberately small public boundary for **The Governor** by Ethan Bishop. It is published from a history-free GitHub repository and GitHub Pages site. It is not derived by making the private book repository public.

The repository contains no private source history, third-party analytics script, credential, or tunnel secret.

## Release inventory

Only these book-derived context artifacts are permitted:

| File | Purpose | SHA-256 |
| --- | --- | --- |
| `context/governor-master-context-v1.2.1.md` | Master operating kernel | `aac0af6363c7e9fabb4f67e6c38d006b6383ca3afdce0b4d01197de9f9f1deb4` |
| `context/governor-compact-context-v1.2.1.md` | Compact task kernel | `f56029bf2a8c6923f6de5c714439b250e9bc4339b7cb4a5a5e8a6db62676f266` |
| `context/governor-master-context-v1.2.1.json` | Release manifest | `22be10267e8d49cb399df0bacc17b796b130322ce5be35c367422f552c6140cc` |

The full manuscript, reader data, raw conversation archive, transfer-evaluation files, credentials, and logs are intentionally excluded. There is intentionally no license file; copyright is retained and no reuse license is granted.

## Verify before publication

Node.js 22 or newer is sufficient; there are no third-party packages to install.

```sh
npm test
npm run build
```

The tests enforce an exact repository-file allowlist, check the two Markdown artifacts against the hashes and byte counts in the manifest, verify the manifest’s approved hash, scan for common secret forms, preserve the no-index policy, and prove that `_site` contains only the ten approved runtime files.

Any unexpected file causes the release to fail. Do not weaken the allowlist to make a failure disappear; decide deliberately whether that file belongs in public, then review the boundary again.

## Configure the full reader

The Pages site stays online independently of the full reader. The full Master Manuscript v10 reader is expected to run from the Windows laptop and may be offline when that machine sleeps or is under maintenance.

After the named HTTPS reader address exists, edit only `reader.json`:

```json
{
  "readerUrl": "https://reader.example.com/",
  "countLandingVisits": true,
  "edition": "Master Manuscript v10",
  "hosting": "Windows laptop",
  "availabilityNote": "The complete reader is served from a Windows laptop and may be offline while that machine is asleep or under maintenance."
}
```

The verifier and browser code reject HTTP addresses, embedded usernames/passwords, query strings, and fragments. Put access control at the tunnel or reverse proxy; never place a share key in the URL.

When `countLandingVisits` is `true`, the landing page makes one credential-free, no-referrer request to `https://reader.example.com/__hit/github-pages.gif`. It emits no request when the reader URL is blank or invalid. The Windows endpoint must aggregate the count without cookies and without retaining raw IP addresses; keep this setting `false` until that endpoint and its privacy behavior are verified.

## Release a later context packet

1. Start from verified files in the private book repository.
2. Copy only the new versioned master Markdown, compact Markdown, and manifest JSON into `context/`.
3. Update the fixed release declaration in `config/release.json`, the visible landing-page counts and hashes, and the verifier’s fixed allowlists.
4. Run `npm test` and `npm run build`.
5. Inspect `_site/` before any commit or upload.
6. Publish an immutable GitHub release with the same three files so download counts remain tied to a versioned artifact.

Do not copy the whole private `public/context` directory: it contains other versions, aliases, and evaluation material outside this public boundary.

## Publication boundary

GitHub Pages publishes the verified `_site` artifact from a dedicated `gh-pages` branch. The source branch remains inspectable, and the Pages branch contains only the ten approved runtime files. Versioned download buttons point to the immutable GitHub release so each artifact keeps a cumulative download count.

Repository traffic and release download counts can be reviewed in GitHub Insights. The landing page includes no third-party analytics or cookies; its optional first-party counter is disabled until the Windows reader URL is configured and counting is explicitly enabled.
