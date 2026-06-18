"use client";

import { useState } from "react";

export type HomeScenarioItem = {
  title: string;
  description: string;
  audience: string;
  input: string;
  output: string;
};

export function HomeScenarioTabs({ scenarios }: { scenarios: HomeScenarioItem[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeScenario = scenarios[activeIndex] || scenarios[0];

  if (!activeScenario) {
    return null;
  }

  return (
    <div className="front-site-scenario-shell">
      <div className="front-site-scenario-left">
        <div className="front-site-section-head">
          <span className="front-site-eyebrow">适用场景</span>
          <h2>适合需要持续产图的业务场景</h2>
          <p>不是一次性玩具，而是能沉淀提示词、作品和运营配置的生产入口。</p>
        </div>
        <div className="front-site-scenario-nav" role="tablist" aria-label="适用场景目录">
          {scenarios.map(({ title }, index) => {
            const isActive = index === activeIndex;

            return (
              <button
                key={title}
                type="button"
                className={isActive ? "is-active" : ""}
                role="tab"
                aria-selected={isActive}
                aria-controls="front-site-scenario-panel"
                onClick={() => setActiveIndex(index)}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{title}</strong>
              </button>
            );
          })}
        </div>
      </div>
      <div className="front-site-scenario-list">
        <article id="front-site-scenario-panel" role="tabpanel">
          <strong>{String(activeIndex + 1).padStart(2, "0")}</strong>
          <div>
            <h3>{activeScenario.title}</h3>
            <p>{activeScenario.description}</p>
            <dl className="front-site-scenario-meta">
              <div>
                <dt>适合谁</dt>
                <dd>{activeScenario.audience}</dd>
              </div>
              <div>
                <dt>输入</dt>
                <dd>{activeScenario.input}</dd>
              </div>
              <div>
                <dt>产出</dt>
                <dd>{activeScenario.output}</dd>
              </div>
            </dl>
          </div>
        </article>
      </div>
    </div>
  );
}
