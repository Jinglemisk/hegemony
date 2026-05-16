# Hegemony

Browser prototype for a Catan-inspired, Imperator: Rome-inspired strategy board game.

## Local Development

Install dependencies:

```sh
npm install
```

Run the hotseat client:

```sh
npm run dev
```

Open:

```txt
http://127.0.0.1:5173/
```

Run checks:

```sh
npm run check
npm run build
```

## Important Docs

- [Rules Archive](docs/rules-archive.md): organized manual-style version of the rough PDF rules plus current clarifications.
- [v0.1 Rules Spec](docs/v0.1-rules-spec.md): current implementation contract for the first playable browser prototype.

## Current Scope

The current app is a hotseat prototype with:

- 37-tile inland hex map.
- Capital setup phase.
- Colony setup phase.
- Basic gameplay phase.
- Income collection.
- Four basic buildings.
- Resource, pop, and unrest tracking foundations.

Deferred systems include online server architecture, events, assembly voting, politicians, national ideas, luxury goods, trade, and victory conditions.
