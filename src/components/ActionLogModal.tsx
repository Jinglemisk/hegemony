import type { HegemonyState } from "../game/types";

export function ActionLogModal({ G, onClose }: { G: HegemonyState; onClose: () => void }) {
  return (
    <div className="modalBackdrop" role="presentation" onMouseDown={onClose}>
      <section
        aria-label="Action log"
        aria-modal="true"
        className="logModal"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="modalHeader">
          <h2>Action Log</h2>
          <button className="iconButton" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="logList">
          {G.log
            .slice()
            .reverse()
            .map((entry) => (
              <p key={entry.id}>
                <span>S{entry.season}</span>
                {entry.message}
              </p>
            ))}
        </div>
      </section>
    </div>
  );
}
