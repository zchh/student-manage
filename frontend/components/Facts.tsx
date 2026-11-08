import { ReactNode } from "react";

export function Facts({ items }: { items: [string, ReactNode][] }) {
  return (
    <p className="facts">
      {items.map(([key, value]) => <span key={key}><strong>{key}</strong>: {value}</span>)}
    </p>
  );
}
