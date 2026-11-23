import type { ButtonHTMLAttributes, MouseEvent, Ref } from "react";

/**
 * The shell's drawn controls, never a browser widget. Every one is a real
 * <button>: at least 32 design px, an ochre focus ring, a lift under the pointer,
 * a press. `disabled` sets aria-disabled instead of the attribute, so the control
 * keeps its focus and its tooltip (the blocked reason) and shows hatched; its
 * click is swallowed. Wrap a control in <Tooltip> for its tooltip.
 */
type ControlProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "disabled"> & {
  /** Unavailable: focusable, hatched, and its click does nothing. */
  disabled?: boolean;
  /** The button itself, for a popover to anchor to. */
  ref?: Ref<HTMLButtonElement>;
};

function Control({
  kind,
  disabled = false,
  className,
  onClick,
  type = "button",
  ...rest
}: ControlProps & { kind: string }) {
  const guard = (event: MouseEvent<HTMLButtonElement>) => {
    if (disabled) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  };
  return (
    <button
      {...rest}
      aria-disabled={disabled || undefined}
      className={`ch-ctl ${kind}${className ? ` ${className}` : ""}`}
      onClick={guard}
      type={type}
    />
  );
}

/** The primary: red lacquer with a gilt rim. One per surface — the action's own verb. */
export function Lacquer(props: ControlProps) {
  return <Control {...props} kind="ch-lacquer" />;
}

/** The secondary: a parchment plaque in bronze (Cancel, a tile, a toggle with aria-pressed). */
export function Plaque(props: ControlProps) {
  return <Control {...props} kind="ch-plaque" />;
}

/** A small round bronze knob (a stepper's ▲ ▼). It has no words, so `label` names it. */
export function Knob({ label, ...props }: ControlProps & { label: string }) {
  return <Control {...props} aria-label={label} kind="ch-knob" />;
}

/** The bronze close disc in a panel's head. `label` names what it closes ("Close Samos"). */
export function CloseDisc({
  label = "Close",
  ...props
}: Omit<ControlProps, "children"> & { label?: string }) {
  return (
    <Control {...props} aria-label={label} kind="ch-knob ch-close">
      <span aria-hidden="true">×</span>
    </Control>
  );
}
