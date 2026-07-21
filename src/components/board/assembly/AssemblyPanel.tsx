import { useEffect, useRef, useState } from "react";
import { PLAYER_COLORS, PLAYER_NAMES } from "../../../game/data";
import { getResolutionCard } from "../../../game/assembly";
import type { AssemblyResult } from "../../../game/assembly";
import { victoryStandings } from "../../../game/victory";
import { useGameUi } from "../GameUiContext";
import { AssemblyBema } from "./AssemblyBema";
import { AssemblyColonnade } from "./AssemblyColonnade";
import { AssemblyFoot, type AssemblyMenu } from "./AssemblyFoot";
import { UrnIcon } from "./AssemblyIcons";

const STEPS = [
  { key: "proposal", numeral: "Ⅰ", label: "Proposal" },
  { key: "voting", numeral: "Ⅱ", label: "Voting" },
  { key: "closing", numeral: "Ⅲ", label: "Standing" }
] as const;

/**
 * The Assembly — a floating panel sized to the SEA GAP, not a full-screen takeover
 * (owner ruling, 2026-07-20).
 *
 * It covers the map only: the top bar, both rails, the ledger, the chronicle and the
 * dock all stay live and reachable around it. That is the whole point — you want to
 * check your cities, pops and market *before* you vote, and a takeover would have
 * spent its extra space re-stating context the chrome already shows. So this panel
 * carries only what is genuinely assembly-specific: the four politicians and their
 * stelae, the card under vote, and the assembly's own verbs.
 *
 * It mounts off `G.assembly` like the yearly omen mounts off `G.yearOmen` — engine
 * state, not UI intent, so no click can open or dismiss it.
 */
export function AssemblyPanel({
  ledgerOpen,
  consultOpen
}: {
  ledgerOpen: boolean;
  consultOpen: boolean;
}) {
  const { G, viewerId } = useGameUi();
  const session = G.assembly;
  const [menu, setMenu] = useState<AssemblyMenu>(null);

  // Any change of hands or of viewer closes an open picker: a menu left hanging across
  // seats would let one player's half-made choice land in the next player's turn.
  useEffect(() => {
    setMenu(null);
  }, [session?.activePlayer, session?.phase, session?.ballotIndex, viewerId]);

  // The engine advances to the next ballot card the instant a vote resolves, so there
  // was no beat to read the outcome. This holds the just-decided result on screen for
  // a couple of seconds — the "passed / failed / vetoed" feedback the playtest wanted.
  // Keyed by the results length so each new verdict re-triggers it, and it survives the
  // last card's phase → closing transition because it lives on the always-mounted panel.
  const resultCount = session?.results.length ?? 0;
  const [flash, setFlash] = useState<{ result: AssemblyResult; key: number } | null>(null);
  const seenResults = useRef(resultCount);

  useEffect(() => {
    if (resultCount > seenResults.current && session) {
      setFlash({ result: session.results[resultCount - 1], key: resultCount });
    }
    seenResults.current = resultCount;
  }, [resultCount, session]);

  useEffect(() => {
    if (!flash) {
      return;
    }
    const timer = window.setTimeout(() => setFlash((current) => (current?.key === flash.key ? null : current)), 2600);
    return () => window.clearTimeout(timer);
  }, [flash]);

  if (!session) {
    return null;
  }

  const voice = victoryStandings(G).find((standing) => standing.card.metric === "voice");

  return (
    <div className="asmSlot" data-consult-open={consultOpen} data-ledger-open={ledgerOpen}>
      <section aria-labelledby="assembly-title" aria-modal="false" className="assembly" role="dialog">
        <div className="asm-head">
          <div className="asm-urn">
            <UrnIcon />
          </div>
          <div className="asm-t" id="assembly-title">
            The Assembly
            <span>
              {ordinal(G.assembliesHeld)} of the game · spring of Year {session.year}
            </span>
          </div>

          <div className="asm-steps">
            {STEPS.map((step, index) => (
              <div className="asmStepWrap" key={step.key}>
                {index > 0 ? <span className="arw">→</span> : null}
                <div className={`astep${step.key === session.phase ? " on" : ""}`}>
                  <span className="d">{step.numeral}</span>
                  <span className="l">{step.label}</span>
                </div>
              </div>
            ))}
          </div>

          <div
            className="asm-voice"
            title="The 6th victory card: patron of the most politicians. It recomputes every turn and flips hands like the other five."
          >
            <span className="k">Voice</span>
            {voice?.holder ? (
              <>
                <span className="dot" style={{ background: PLAYER_COLORS[voice.holder] }} />
                <span className="n">{PLAYER_NAMES[voice.holder]}</span>
              </>
            ) : (
              <span className="n asmVoiceNone">unheld</span>
            )}
          </div>
        </div>

        <div className="asm-body">
          <AssemblyColonnade G={G} />
          <AssemblyBema G={G} session={session} />
        </div>

        {/* Anchored to the panel, not the (scrolling) body, so it sits just above the
            dock and survives the last card's phase → closing transition. */}
        {flash ? <ResultFlash result={flash.result} /> : null}

        <AssemblyFoot G={G} menu={menu} onMenu={setMenu} session={session} />
      </section>
    </div>
  );
}

/** The transient verdict banner shown under the vote bar for ~2.5s after a card resolves. */
function ResultFlash({ result }: { result: AssemblyResult }) {
  const name =
    result.item.kind === "repeal"
      ? `Repeal ${getResolutionCard(result.item.cardId)?.name ?? result.item.cardId}`
      : result.item.card.name;
  const verdict = result.vetoedBy ? "vetoed" : result.passed ? "passed" : "failed";

  return (
    <div className={`asmResultFlash ${verdict}`} role="status">
      <span className="asmResultFlashName">{name}</span>
      <span className="asmResultFlashVerdict">{verdict}</span>
      {result.vetoedBy ? null : (
        <span className="asmResultFlashTally">
          {result.yea}–{result.nay}
        </span>
      )}
    </div>
  );
}

function ordinal(count: number): string {
  const suffix = count % 100 >= 11 && count % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][count % 10] ?? "th";
  return `${count}${suffix}`;
}
