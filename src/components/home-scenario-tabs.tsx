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
  const inputItems = splitScenarioText(activeScenario?.input);
  const outputItems = splitScenarioText(activeScenario?.output);
  const workflowItems = ["描述整理", "提示词润色", "任务生成", "作品归档"];

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
        <article id="front-site-scenario-panel" className="front-site-scenario-panel" role="tabpanel">
          <div className="front-site-scenario-panel-head">
            <strong>{String(activeIndex + 1).padStart(2, "0")}</strong>
            <div>
              <h3>{activeScenario.title}</h3>
              <p>{activeScenario.description}</p>
            </div>
          </div>
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
          <div className="front-site-scenario-detail-grid">
            <section>
              <span>生产路径</span>
              <ol>
                {workflowItems.map((item, index) => (
                  <li key={item}>
                    <small>{String(index + 1).padStart(2, "0")}</small>
                    {item}
                  </li>
                ))}
              </ol>
            </section>
            <section>
              <span>输入与产出</span>
              <div className="front-site-scenario-chip-group">
                <div>
                  <small>输入要点</small>
                  <p>
                    {inputItems.map((item) => (
                      <em key={item}>{item}</em>
                    ))}
                  </p>
                </div>
                <div>
                  <small>可交付内容</small>
                  <p>
                    {outputItems.map((item) => (
                      <em key={item}>{item}</em>
                    ))}
                  </p>
                </div>
              </div>
            </section>
          </div>
        </article>
      </div>
    </div>
  );
}

function splitScenarioText(value?: string) {
  return (value || "")
    .split(/[、,，]/)
    .map((item) => item.trim())
    .filter(Boolean);
}
