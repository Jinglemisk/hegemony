import { useEffect, useRef, useState } from "react";
import { getResolutionCard } from "../../../game/assembly";
import type { AssemblyResult } from "../../../game/assembly";
import type { HegemonyState, PlayerId } from "../../../game/types";
import { useGameUi } from "../GameUiContext";
import { AssemblyColonnade } from "./AssemblyColonnade";
import { AssemblyFloor } from "./AssemblyFloor";
import { AssemblyFoot, type AssemblyMenu } from "./AssemblyFoot";
import { AssemblyHead } from "./AssemblyHead";
import { AssemblySeats } from "./AssemblySeats";
import { useSceneContainment } from "./useSceneContainment";

/**
 * The Assembly — a FULL-BLEED TAKEOVER (owner ruling, 2026-08-15).
 *
 * This ruling REPLACES the 2026-07-20 one that used to be recorded here, which
 * sized the Assembly to the sea gap as a `min(900px, 100%)` card floating inside
 * live chrome. That ruling predated the design showcase; the showcase draws the
 * house sitting as a full 1440×900 night scene, and the owner has now ruled for
 * the showcase. The scene covers the viewport, the vignette darkens the WHOLE app
 * — top bar, both rails, the command dock — and the colonnade gets its designed
 * width. The game stops being a map for as long as the house sits.
 *
 * What the old ruling was protecting — glancing at your holdings before you vote —
 * is paid for differently now: the standing laws are on the floor beside the card
 * under debate, and every seat is a plaque you can take, so the hotseat never
 * needs the roster in the bar the scene just covered.
 *
 * Three horizontal registers, never two columns of boxes:
 *
 *   the head   who is sitting, where in the sitting you are, who holds Voice
 *   the floor  the colonnade you draw from, the card in front of the house,
 *              and the laws already standing
 *   the seats  four people, what each of them has done, and — for whoever is
 *              acting — everything they may do about it
 *
 * It mounts off `G.assembly` like the yearly omen mounts off `G.yearOmen` —
 * engine state, not UI intent, so no click can open or dismiss it.
 */
export function AssemblyPanel({ onTakeSeat }: { onTakeSeat: (playerID: PlayerId) => void }) {
  const { G, viewerId } = useGameUi();
  const session = G.assembly;
  const [menu, setMenu] = useState<AssemblyMenu>(null);
  const sceneRef = useRef<HTMLDivElement>(null);

  useSceneContainment(sceneRef, Boolean(session));

  // Any change of hands or of viewer closes an open picker: a menu left hanging across
  // seats would let one player's half-made choice land in the next player's turn.
  useEffect(() => {
    setMenu(null);
  }, [session?.activePlayer, session?.phase, session?.ballotIndex, viewerId]);

  // The engine advances to the next ballot card the instant a vote resolves, so there
  // was no beat to read the outcome. This holds the just-decided result on screen for
  // a couple of seconds — the "passed / failed / vetoed" feedback the playtest wanted.
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
    const timer = window.setTimeout(
      () => setFlash((current) => (current?.key === flash.key ? null : current)),
      2600,
    );
    return () => window.clearTimeout(timer);
  }, [flash]);

  if (!session) {
    return null;
  }

  return (
    <div
      aria-labelledby="assembly-title"
      // The scene covers the app for the mouse; `aria-modal` and the containment
      // hook are what make that true for the keyboard and the screen reader too.
      // It declared itself NON-modal while sitting on top of everything, which is
      // the one thing a takeover must never say.
      aria-modal="true"
      className="asmScene onDark"
      ref={sceneRef}
      role="dialog"
      tabIndex={-1}
    >
      <div className="asmStage">
        <AssemblyHead G={G} session={session} />

        {/* The colonnade is where you CHOOSE a deck. During the ballot it is
            neither drawn from nor read, and the reference vote scene has none. */}
        {session.phase === "proposal" ? <AssemblyColonnade G={G} /> : null}

        <AssemblyFloor G={G} session={session} />
        <AssemblySeats G={G} onTakeSeat={onTakeSeat} session={session} />
        <AssemblyFoot G={G} menu={menu} onMenu={setMenu} session={session} />
      </div>

      {flash ? <ResultFlash G={G} result={flash.result} /> : null}
    </div>
  );
}

/** The transient verdict banner shown over the floor for ~2.5s after a card resolves. */
function ResultFlash({ G, result }: { G: HegemonyState; result: AssemblyResult }) {
  const name =
    result.item.kind === "repeal"
      ? `Repeal ${getResolutionCard(G.definition.content, result.item.cardId)?.name ?? result.item.cardId}`
      : result.item.card.name;
  const verdict = result.vetoedBy ? "vetoed" : result.passed ? "passed" : "failed";

  return (
    <div className={`asmFlash is-${verdict}`} role="status">
      <span className="asmFlashName verb-lg">{name}</span>
      <span className="asmFlashVerdict label">{verdict}</span>
      {result.vetoedBy ? null : (
        <span className="asmFlashTally stat num">
          {result.yea}–{result.nay}
        </span>
      )}
    </div>
  );
}
