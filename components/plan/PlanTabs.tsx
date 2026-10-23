"use client";

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";

export interface PlanTab {
  id: string;
  label: string;
  content: ReactNode;
}

interface PlanTabsProps {
  tabs: PlanTab[];
}

export function PlanTabs({ tabs }: PlanTabsProps) {
  const [activeId, setActiveId] = useState(tabs[0]?.id ?? "");
  const [announcement, setAnnouncement] = useState("");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function selectTab(index: number, focus = true) {
    const target = tabs[index];
    if (!target) return;
    setActiveId(target.id);
    setAnnouncement(`${target.label} tab selected`);
    if (focus) tabRefs.current[index]?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number | null = null;

    if (event.key === "ArrowRight") {
      nextIndex = (index + 1) % tabs.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (index - 1 + tabs.length) % tabs.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = tabs.length - 1;
    }

    if (nextIndex === null) return;
    event.preventDefault();
    selectTab(nextIndex);
  }

  return (
    <div>
      <div className="tablist no-print" role="tablist" aria-label="Plan sections">
        {tabs.map((tab, index) => {
          const selected = tab.id === activeId;
          return (
            <button
              key={tab.id}
              ref={(element) => {
                tabRefs.current[index] = element;
              }}
              id={`tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              className="tab"
              onClick={() => selectTab(index, false)}
              onKeyDown={(event) => handleKeyDown(event, index)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {tabs.map((tab, index) => {
        const selected = tab.id === activeId;
        return (
          <section
            key={tab.id}
            id={`panel-${tab.id}`}
            role="tabpanel"
            aria-labelledby={`tab-${tab.id}`}
            tabIndex={0}
            hidden={!selected}
            className="plan-panel"
            data-tab-index={index}
          >
            {tab.content}
          </section>
        );
      })}

      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
    </div>
  );
}
