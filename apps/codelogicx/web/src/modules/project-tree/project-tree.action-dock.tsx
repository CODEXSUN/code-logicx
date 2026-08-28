import { AnimatePresence, motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";

export type ProjectTreeAction = {
  icon: LucideIcon;
  label: string;
  onSelect(): void;
  primary?: boolean;
};

const spring = { damping: 15, mass: 0.18, stiffness: 220 };

export function ProjectTreeActionDock({ actions }: { actions: ProjectTreeAction[] }) {
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  return (
    <nav
      aria-label="Project item actions"
      className="flex h-20 items-end gap-3 rounded-2xl bg-card/95 px-4 pb-3 shadow-sm backdrop-blur"
      onMouseLeave={() => setFocusedIndex(null)}
    >
      {actions.map((action, index) => (
        <DockButton
          action={action}
          focusedIndex={focusedIndex}
          index={index}
          key={action.label}
          onFocusChange={setFocusedIndex}
        />
      ))}
    </nav>
  );
}

function DockButton({
  action,
  focusedIndex,
  index,
  onFocusChange
}: {
  action: ProjectTreeAction;
  focusedIndex: number | null;
  index: number;
  onFocusChange(index: number | null): void;
}) {
  const distance = focusedIndex === null ? Number.POSITIVE_INFINITY : Math.abs(focusedIndex - index);
  const active = distance === 0;
  const adjacent = distance === 1;
  const Icon = action.icon;
  return (
    <motion.button
      animate={{ scale: active ? 1.16 : adjacent ? 1.05 : 1, y: active ? -10 : adjacent ? -4 : 0 }}
      aria-label={action.label}
      className={`relative grid size-12 shrink-0 place-items-center rounded-xl text-muted-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring ${
        action.primary ? "bg-foreground text-background" : "bg-muted/80 hover:text-foreground"
      }`}
      onBlur={() => onFocusChange(null)}
      onClick={action.onSelect}
      onFocus={() => onFocusChange(index)}
      onMouseEnter={() => onFocusChange(index)}
      transition={spring}
      type="button"
    >
      <Icon className="size-5" />
      <AnimatePresence>
        {active ? (
          <motion.span
            animate={{ opacity: 1, y: 0 }}
            className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-card px-2.5 py-1.5 text-xs font-medium text-foreground shadow-sm"
            exit={{ opacity: 0, y: 3 }}
            initial={{ opacity: 0, y: 3 }}
          >
            {action.label}
          </motion.span>
        ) : null}
      </AnimatePresence>
    </motion.button>
  );
}
