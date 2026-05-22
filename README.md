![Hegemony Codex Banana-generated interface art](assets/codex-showcase/light-hero-tableau.png)

<div align="center">

# Hegemony

Become the board's hegemon through economy, diplomacy, politics and luck.

</div>

Hegemony is a Catan-inspired, Imperator: Rome-inspired strategy board game prototype where players found capitals, expand colonies, collect resources, manage population pressure, and compete for control across a stylized ancient world.

## Features

- 37-tile inland hex map.
- Capital and colony setup phases.
- Basic hotseat gameplay loop.
- Automatic turn-start income collection and RTS-style resource tracking.
- Gameplay colony founding and colony-to-city upgrades.
- Four buildable structure types.
- Population capacity and overcapacity happiness pressure.
- Shared colony tiles with split income.
- Action log, tile inspector, holdings roster, and income preview.

## Current Status

The prototype is in Phase 1: local core gameplay. It proves the loop of placing
initial settlements, collecting income, expanding colonies, upgrading cities,
building basic structures, and managing early population pressure.

The next rules milestone is not more raw economy by default. The game needs a
light pressure-and-scoring layer so expansion and building choices have stakes:
temporary 10-season scoring, happiness consequences, and a first influence sink.

## Development

- Install packages: `npm install`
- Start the dev server: `npm run dev`
- Run type checks: `npm run check`
- Run a production build: `npm run build`

## Coming Soon

Temporary scoring, happiness events, influence actions, online play, assembly
voting, politicians, national ideas, luxury goods, trade, and final victory
conditions.
