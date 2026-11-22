import type { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * A slot cut into a panel: `open` is an empty socket, `filled` a raised plaque in
 * it, `worked` a gilt one. With `onClick` it is a button (an open slot to fill),
 * otherwise a plain box.
 */
export function Socket({
  state,
  children,
  className,
  onClick,
  ...rest
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  state: "open" | "filled" | "worked";
  children?: ReactNode;
}) {
  const classes = `ch-socket${className ? ` ${className}` : ""}`;
  return onClick ? (
    <button {...rest} className={classes} data-state={state} onClick={onClick} type="button">
      {children}
    </button>
  ) : (
    <div className={classes} data-state={state}>
      {children}
    </div>
  );
}

/**
 * A meter of `n` sockets, one per place: the first `worked` gilt, up to `value`
 * filled with glaze, the rest empty. `label` names it for a screen reader
 * ("People 1 of 3").
 */
export function SocketMeter({
  n,
  value,
  worked = 0,
  label,
}: {
  n: number;
  value: number;
  worked?: number;
  label: string;
}) {
  return (
    <span
      aria-label={label}
      aria-valuemax={n}
      aria-valuemin={0}
      aria-valuenow={value}
      className="ch-meter"
      role="meter"
    >
      {Array.from({ length: n }, (_, i) => (
        <i data-fill={i < worked ? "gold" : i < value ? "glaze" : undefined} key={i} />
      ))}
    </span>
  );
}
