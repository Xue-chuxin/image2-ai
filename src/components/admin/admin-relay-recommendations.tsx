"use client";

import { useState, type CSSProperties } from "react";
import { Tag } from "tdesign-react";
import { JumpIcon } from "tdesign-icons-react";
import type { RelayRecommendation } from "@/lib/relay-recommendations";

type RelayCardStyle = CSSProperties & {
  "--relay-accent": string;
  "--relay-accent-soft": string;
};

export function AdminRelayRecommendations({ items }: { items: RelayRecommendation[] }) {
  const [failedLogoIds, setFailedLogoIds] = useState<Record<string, boolean>>({});

  return (
    <section className="admin-td-grid">
      <div className="admin-dashboard-hero admin-relay-hero">
        <div>
          <h3>中转站推荐</h3>
          <p>把常用的 OpenAI 兼容中转站集中放在后台，管理员可以直接点击 Logo 跳转查看价格、模型和可用性。</p>
        </div>
        <div className="admin-dashboard-meta">
          <Tag theme="primary" variant="light">
            {items.length} 个入口
          </Tag>
          <Tag theme="success" variant="light">
            Logo 跳转
          </Tag>
        </div>
      </div>

      <div className="admin-relay-grid">
        {items.map((item) => (
          <a
            key={item.id}
            className="admin-relay-card"
            href={item.href}
            target="_blank"
            rel="noreferrer"
            style={{ "--relay-accent": item.accent, "--relay-accent-soft": item.accentSoft } as RelayCardStyle}
            aria-label={`打开 ${item.name}`}
          >
            <div className="admin-relay-logo" aria-hidden="true">
              {failedLogoIds[item.id] ? (
                <span>{item.initials}</span>
              ) : (
                <img
                  src={item.logoSrc}
                  alt=""
                  loading="lazy"
                  onError={() => setFailedLogoIds((current) => ({ ...current, [item.id]: true }))}
                />
              )}
            </div>
            <div className="admin-relay-copy">
              <div className="admin-relay-title-row">
                <h3>{item.name}</h3>
                <JumpIcon />
              </div>
              <p>{item.description}</p>
              <div className="admin-relay-tags">
                {item.tags.map((tag) => (
                  <Tag key={tag} variant="light">
                    {tag}
                  </Tag>
                ))}
              </div>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
