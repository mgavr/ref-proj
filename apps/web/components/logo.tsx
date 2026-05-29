/**
 * Brand mark used in the top-left of each page.
 * A small dark squircle with the accent dot inside — geometric,
 * Linear-leaning, recognizable at 24px.
 */
export function Logo(): React.JSX.Element {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-ink">
        <div className="h-2 w-2 rounded-sm bg-accent" />
      </div>
      <span className="font-sans text-[14px] font-medium tracking-tightish text-ink">
        ref-proj
      </span>
    </div>
  );
}
