# Trade screens (2026-10-21)

A mockup of player trade's screens, built on a claude.ai Design canvas. The owner approved the
look on 2026-10-21. The canvas is a private mirror:
https://claude.ai/artifact/DRte5TPvVWRxv4RvNt7RDW. This folder is the source of truth.

## Boards

- `Main.dc.html`: a playable 1440×900 game screen.
  - Make an offer from the Trade disc. Answers fill the offer's disc on the alarms row; then settle.
  - Theron's offers, to the table or to you: accept, decline, or counter on the card itself.
  - The bar under the board switches between the full and the compact offer card.
- `Cards.dc.html`: A, the full offer card, in four moments.
- `Compose.dc.html`: B, the compact offer card.
  - Seat discs sit under the title; picking none means the table.
  - I RECEIVE and YOU RECEIVE sit on either side of a red → and a green ←.
  - A + opens a resource picker; each picked resource becomes a − n + chip.
- `Ring.dc.html`: the countdown ring as a reusable alarm disc. It sweeps for seconds and is
  split into segments for turns.
- `Icons.dc.html`: two Assembly icons to choose between, the curia and the open amphitheatre.

## What the owner approved

The [trade plan](../../../../plans/player-trade.md) carries these as D11, D12 and D14.

- An offer is a disc on the alarms row. It has a ring in the owner's glaze, the owner's seat
  badge, and a mark once you have answered. No answer card takes over the screen.
- Offers can go to chosen seats. Offers stay visible to every seat; only the chosen seats can
  answer.
- The compact card, and a counter that edits the same card in place.
- A handshake for Trade. For the Assembly, a curia and an open amphitheatre; the owner called
  the amphitheatre perfect.
- The mockup's ring drains over 20 seconds and shakes when time is low. That is for networked
  play: hotseat has no clock, and the ring fills one segment per answer.

## Files

- `*.dc.html` and `canvas.json` are the canvas source. The artboards are byte for byte; the
  index is only reformatted by Prettier. They need the canvas host, which serves
  `support.js`, so they do not open on their own in a browser. To restore
  the canvas, publish them as `project/<name>` to a Design canvas, upload the icons again,
  and swap in the new `/_blob/` ids.
- `icons/` holds the three new icons, drawn in the [Painted bronze](../../bronze-icons.md)
  style. The handshake is the game's `market/handshake` since trade's first PR; the curia and
  the amphitheatre wait for the owner's pick of an Assembly icon.

| Canvas asset                              | File                                     |
| ----------------------------------------- | ---------------------------------------- |
| `/_blob/896825a4a3655d98c5f8e677f2379303` | `icons/handshake.svg`                    |
| `/_blob/cc83ee838dc5ca3f1e1e4057d15b2622` | `icons/curia.svg`                        |
| `/_blob/0dab6f05b543ae50f339b6eaf26be7a2` | `icons/theatre.svg`                      |
| `/_blob/19c711ffc7e71194b0f5218ee9417f09` | `assets/icons/bronze/resources/wood.svg` |
| `/_blob/a46e27705bb2a3047f32e0ed6af80581` | `…/resources/stone.svg`                  |
| `/_blob/e2c1fcadbe305d3570038a4e2597a992` | `…/resources/food.svg`                   |
| `/_blob/0bd651d7a6c21be478bfc1e0f3254c83` | `…/resources/gold.svg`                   |
| `/_blob/66665ca9c08ef3ab7c134e9598e18f5b` | `…/resources/influence.svg`              |
| `/_blob/8f632b7d181fc35325f1c607e7d6bb13` | `…/resources/luxury.svg`                 |
| `/_blob/8fb71fa5ca72be0b2c9e884ad2e6f310` | `…/resources/happiness.svg`              |
| `/_blob/db7abfa7a02440bb1911671ba37e3dec` | `…/pops/pop-gain.svg`                    |
| `/_blob/0bc350e2accd8b6e626eee9d80292821` | `…/pops/crowd.svg`                       |
| `/_blob/c0ac25dfe93de637f2a2c5b8a84dc6d8` | `…/pops/move.svg`                        |
| `/_blob/c4f5697f41537ca258ba832aee988521` | `…/settlements/found.svg`                |
| `/_blob/2b37720b6ce75a2b62d2eb9fa223205f` | `…/buildings/build.svg`                  |
| `/_blob/c63ec6e270de26b038cf92d4d09a309e` | `…/unrest/calm-verb.svg`                 |
| `/_blob/19696f7b5431e66d5fbf5836a8e8e57e` | `…/unrest/starvation.svg`                |
| `/_blob/f9f16abd84064f64c447c75ebbce33fc` | `…/events/year.svg`                      |
| `/_blob/14969e3869a4ad49b6ad2eb5d9967794` | `…/events/end-turn.svg`                  |
| `/_blob/30e9169d2b2e046f7347d95df831d95a` | `…/market/income-suppressed.svg`         |
