---
title: License
sidebar_position: 2
---

PVE Panel is open source under the **MIT License**.

**Copyright © 2026 Sebastian Flint** (original author of
[sebastianflint/pve-panel](https://github.com/sebastianflint/pve-panel))<br />
**Copyright © 2026 hawaianblue21 pve-panel** (changes made in this fork)

This repository is a fork. The changes made in the fork are released under the same MIT
License, and the original copyright notice and license text stay included in every copy.

## What the MIT License allows

| You may | Condition | No guarantee |
|---|---|---|
| use it privately and commercially | keep the copyright notice and the license text in every copy or substantial part | the software comes **as is**, without any warranty |
| change it and build on it | | the authors are not liable for damages |
| share and sell it, also as part of closed-source products or services | | |

Running PVE Panel for your customers, changing it for your own environment or building
a product on it is all allowed. You don't have to publish your changes (but pull
requests are welcome).

Because PVE Panel controls servers, networks and access, read
[Security model](../security/security-model.md) and test customer isolation before using it
in production. The license's "no warranty" clause applies in full.

## The license text

The binding text is the [LICENSE](https://github.com/hawaianblue21/pve-panel/blob/main/LICENSE)
file in the repository:

```text
MIT License

Copyright (c) 2026 Sebastian Flint
Copyright (c) 2026 hawaianblue21 pve-panel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Third-party components

PVE Panel builds on open-source libraries, which keep their own licenses. Their
license files are included in `node_modules` and therefore in the Docker image.

| Component | Used for | License |
|---|---|---|
| Fastify and its plugins (cookie, jwt, rate-limit, static, websocket) | web servers | MIT |
| noVNC | browser console | MPL-2.0 |
| SimpleWebAuthn | passkeys | MIT |
| openid-client | single sign-on (OIDC) | MIT |
| Nodemailer | email | MIT-0 |
| undici, ws | Proxmox API, console proxy | MIT |
| bcryptjs, qrcode | passwords, 2FA QR codes | MIT |
| dotenv | `.env` file | BSD-2-Clause |
| Node.js (Docker image) | runtime | MIT, with bundled components under their own licenses |

All other production packages use MIT, ISC, BSD, Apache-2.0, BlueOak-1.0.0, 0BSD
or similar permissive licenses; none uses a GPL or AGPL license.

noVNC is served unchanged from its package. MPL-2.0 only requires that changes to
noVNC's own files be published under MPL-2.0; it doesn't affect the rest of the panel.

The fonts (IBM Plex Sans, Space Grotesk, JetBrains Mono) are loaded from Google Fonts and
are under the SIL Open Font License; they are not part of the repository.
