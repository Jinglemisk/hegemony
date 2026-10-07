/** The settings sheet under the top bar. One setting so far: the turn notice. */
export function SettingsPanel({
  turnNotice,
  onTurnNotice,
}: {
  turnNotice: boolean;
  onTurnNotice: (on: boolean) => void;
}) {
  return (
    <div className="settings">
      <h2 className="settings-title">Settings</h2>
      <div className="setting">
        <span className="setting-words">
          <b id="setting-turn-notice">Turn notice</b>
          <span>
            A card names whose turn it is and waits for Begin. That player’s own cards stay hidden
            until then.
          </span>
        </span>
        <button
          aria-labelledby="setting-turn-notice"
          aria-pressed={turnNotice}
          className="insCheck"
          onClick={() => onTurnNotice(!turnNotice)}
          type="button"
        >
          {turnNotice ? "✓" : null}
        </button>
      </div>
    </div>
  );
}
