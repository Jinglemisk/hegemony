import type { EffectPresentation } from "../../../ui/effects";
import { Ico } from "../../frame/parts";
import type { LossLine } from "./lossLines";
import { CeremonyBlow } from "./CeremonyBlow";
import { ModalShell } from "./ModalShell";

/**
 * The card a seat reads after a loss it did not choose (a riot's result, a revolt):
 * the hunger card's frame with no picker. One blow, then one line for each thing it
 * cost, then where the turn goes next. The engine has already passed the turn; the
 * card stays until the seat endures it.
 */
export function LossCard({
  kicker,
  title,
  voice,
  blow,
  blowIcon,
  lines,
  commit,
  onCommit,
  foot,
}: {
  kicker: string;
  title: string;
  voice?: string;
  blow: EffectPresentation;
  blowIcon: string;
  lines: LossLine[];
  commit: string;
  onCommit: () => void;
  foot: { next: string; when: string };
}) {
  return (
    <ModalShell
      backdropClassName="eventModalBackdrop"
      ceremony="wound"
      className="fateCard lossCard"
      labelledBy="loss-title"
    >
      <header className="hungerHead">
        <span className="fateKicker label">{kicker}</span>
        <h2 className="display display-xl" id="loss-title">
          {title}
        </h2>
        {voice ? <p className="fateVoice body-em">{voice}</p> : null}
      </header>

      <CeremonyBlow
        className="blowBand"
        icon={<Ico path={blowIcon} size="disc" />}
        presentation={blow}
      />

      {lines.length ? (
        <ul className="lossLines">
          {lines.map((line) => (
            <li className={line.muted ? "is-muted" : undefined} key={line.key}>
              <Ico path={line.icon} size="ui" />
              <span>{line.text}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="hungerFoot caption">
        <span>{foot.next}</span>
        <span>{foot.when}</span>
      </p>
      <button className="ceremonyCommit verb verb-lg" onClick={onCommit} type="button">
        {commit}
      </button>
    </ModalShell>
  );
}
