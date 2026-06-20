"use client";

import { useCallback, useEffect, useState } from "react";
import { Megaphone, X } from "lucide-react";
import type { HomePopupSettings } from "@/lib/settings";

const allowedTags = new Set([
  "a",
  "article",
  "aside",
  "audio",
  "b",
  "blockquote",
  "br",
  "caption",
  "code",
  "del",
  "details",
  "div",
  "em",
  "figcaption",
  "figure",
  "footer",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "hr",
  "i",
  "img",
  "li",
  "main",
  "mark",
  "ol",
  "p",
  "pre",
  "section",
  "small",
  "source",
  "span",
  "strong",
  "summary",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "time",
  "tr",
  "u",
  "ul",
  "video",
]);

const blockedTags = new Set(["base", "button", "embed", "form", "iframe", "input", "link", "meta", "object", "script", "select", "style", "template", "textarea"]);
const globalAttrs = new Set(["aria-hidden", "aria-label", "class", "role", "title"]);
const booleanAttrs = new Set(["controls", "loop", "muted", "playsinline"]);
const tagAttrs: Record<string, Set<string>> = {
  a: new Set(["href", "rel", "target"]),
  audio: new Set(["controls", "loop", "muted", "preload", "src"]),
  img: new Set(["alt", "height", "loading", "src", "width"]),
  li: new Set(["value"]),
  ol: new Set(["start", "type"]),
  source: new Set(["media", "src", "type"]),
  td: new Set(["colspan", "rowspan"]),
  th: new Set(["colspan", "rowspan", "scope"]),
  time: new Set(["datetime"]),
  ul: new Set(["type"]),
  video: new Set(["controls", "height", "loop", "muted", "playsinline", "poster", "preload", "src", "width"]),
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderInlineMarkdown(value: string) {
  const codeSnippets: string[] = [];
  let html = escapeHtml(value).replace(/`([^`]+)`/g, (_, code: string) => {
    const index = codeSnippets.push(`<code>${code}</code>`) - 1;
    return `@@CODE_${index}@@`;
  });

  html = html
    .replace(/!\[([^\]]*)]\(([^)\s]+)\)/g, '<img src="$2" alt="$1" />')
    .replace(/\[([^\]]+)]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/_([^_]+)_/g, "<em>$1</em>");

  return html.replace(/@@CODE_(\d+)@@/g, (_, index: string) => codeSnippets[Number(index)] || "");
}

function markdownToHtml(markdown: string) {
  const html: string[] = [];
  const paragraph: string[] = [];
  let listType: "ol" | "ul" | null = null;
  let codeBlock: string[] | null = null;

  function flushParagraph() {
    if (!paragraph.length) return;
    html.push(`<p>${renderInlineMarkdown(paragraph.join(" "))}</p>`);
    paragraph.length = 0;
  }

  function closeList() {
    if (!listType) return;
    html.push(`</${listType}>`);
    listType = null;
  }

  for (const rawLine of markdown.replace(/\r\n/g, "\n").split("\n")) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (codeBlock) {
      if (trimmed.startsWith("```")) {
        html.push(`<pre><code>${escapeHtml(codeBlock.join("\n"))}</code></pre>`);
        codeBlock = null;
      } else {
        codeBlock.push(line);
      }
      continue;
    }

    if (trimmed.startsWith("```")) {
      flushParagraph();
      closeList();
      codeBlock = [];
      continue;
    }

    if (!trimmed) {
      flushParagraph();
      closeList();
      continue;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      closeList();
      const level = heading[1].length;
      html.push(`<h${level}>${renderInlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }

    if (/^([-*_])\1{2,}$/.test(trimmed)) {
      flushParagraph();
      closeList();
      html.push("<hr />");
      continue;
    }

    const quote = trimmed.match(/^>\s?(.+)$/);
    if (quote) {
      flushParagraph();
      closeList();
      html.push(`<blockquote>${renderInlineMarkdown(quote[1])}</blockquote>`);
      continue;
    }

    const unordered = trimmed.match(/^[-*+]\s+(.+)$/);
    const ordered = trimmed.match(/^\d+[.)]\s+(.+)$/);
    if (unordered || ordered) {
      flushParagraph();
      const nextListType = ordered ? "ol" : "ul";
      if (listType !== nextListType) {
        closeList();
        listType = nextListType;
        html.push(`<${listType}>`);
      }
      html.push(`<li>${renderInlineMarkdown((unordered || ordered)?.[1] || "")}</li>`);
      continue;
    }

    paragraph.push(trimmed);
  }

  if (codeBlock) {
    html.push(`<pre><code>${escapeHtml(codeBlock.join("\n"))}</code></pre>`);
  }
  flushParagraph();
  closeList();

  return html.join("");
}

function isSafeUrl(value: string, allowMedia = false) {
  const clean = value.trim();
  if (!clean) return false;
  if (clean.startsWith("/") || clean.startsWith("#")) return true;

  try {
    const url = new URL(clean, window.location.origin);
    if (url.protocol === "http:" || url.protocol === "https:") return true;
    if (!allowMedia && (url.protocol === "mailto:" || url.protocol === "tel:")) return true;
    return false;
  } catch {
    return false;
  }
}

function sanitizeHtml(input: string) {
  const document = new DOMParser().parseFromString(`<div>${input}</div>`, "text/html");
  const root = document.body.firstElementChild;
  if (!root) return "";

  function sanitizeAttrs(element: Element, tagName: string) {
    const allowedAttrs = tagAttrs[tagName] || new Set<string>();

    Array.from(element.attributes).forEach((attr) => {
      const name = attr.name.toLowerCase();
      const value = attr.value;
      const isAllowed = globalAttrs.has(name) || allowedAttrs.has(name);

      if (!isAllowed || name.startsWith("on")) {
        element.removeAttribute(attr.name);
        return;
      }

      if (["href", "poster", "src"].includes(name) && !isSafeUrl(value, name !== "href")) {
        element.removeAttribute(attr.name);
        return;
      }

      if (booleanAttrs.has(name) && value && value !== name) {
        element.setAttribute(name, name);
      }
    });

    if (tagName === "a") {
      const href = element.getAttribute("href");
      if (href) {
        element.setAttribute("target", "_blank");
        element.setAttribute("rel", "noreferrer");
      }
    }

    if (tagName === "img" && element.getAttribute("src")) {
      element.setAttribute("loading", "lazy");
    }
  }

  function sanitizeChildren(parent: Node) {
    Array.from(parent.childNodes).forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) return;
      if (child.nodeType !== Node.ELEMENT_NODE) {
        child.parentNode?.removeChild(child);
        return;
      }

      const element = child as Element;
      const tagName = element.tagName.toLowerCase();

      if (blockedTags.has(tagName)) {
        element.remove();
        return;
      }

      sanitizeChildren(element);

      if (!allowedTags.has(tagName)) {
        element.replaceWith(...Array.from(element.childNodes));
        return;
      }

      sanitizeAttrs(element, tagName);
    });
  }

  sanitizeChildren(root);
  return root.innerHTML;
}

function hashContent(value: string) {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }
  return (hash >>> 0).toString(36);
}

function readDismissed(key: string) {
  try {
    return sessionStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function saveDismissed(key: string) {
  try {
    sessionStorage.setItem(key, "1");
  } catch {
    // Ignore storage failures so closing the modal never blocks the page.
  }
}

export function HomeAnnouncementModal({ settings }: { settings: HomePopupSettings }) {
  const [isOpen, setIsOpen] = useState(false);
  const [dismissKey, setDismissKey] = useState("");
  const [renderedContent, setRenderedContent] = useState("");

  useEffect(() => {
    if (!settings.enabled || !settings.content.trim()) {
      setIsOpen(false);
      setRenderedContent("");
      setDismissKey("");
      return;
    }

    const rawHtml = settings.contentFormat === "html" ? settings.content : markdownToHtml(settings.content);
    const safeHtml = sanitizeHtml(rawHtml);
    if (!safeHtml.trim()) {
      setIsOpen(false);
      setRenderedContent("");
      setDismissKey("");
      return;
    }

    const nextDismissKey = `home-announcement-dismissed:${hashContent(`${settings.title}|${settings.contentFormat}|${settings.content}`)}`;
    setRenderedContent(safeHtml);
    setDismissKey(nextDismissKey);
    setIsOpen(!readDismissed(nextDismissKey));
  }, [settings.content, settings.contentFormat, settings.enabled, settings.title]);

  const closeModal = useCallback(() => {
    if (dismissKey) {
      saveDismissed(dismissKey);
    }
    setIsOpen(false);
  }, [dismissKey]);

  useEffect(() => {
    if (!isOpen) return undefined;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeModal();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeModal]);

  if (!isOpen || !renderedContent) {
    return null;
  }

  return (
    <div className="home-announcement" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) closeModal();
    }}>
      <section className="home-announcement__panel" role="dialog" aria-modal="true" aria-labelledby="home-announcement-title">
        <header className="home-announcement__header">
          <span className="home-announcement__icon" aria-hidden="true">
            <Megaphone className="h-5 w-5" />
          </span>
          <h2 id="home-announcement-title">{settings.title || "公告"}</h2>
          <button type="button" className="home-announcement__close" aria-label="关闭弹窗" onClick={closeModal}>
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="home-announcement__body">
          <div className="home-announcement__content" dangerouslySetInnerHTML={{ __html: renderedContent }} />
        </div>
        <footer className="home-announcement__footer">
          <button type="button" className="home-announcement__confirm" onClick={closeModal}>
            我知道了
          </button>
        </footer>
      </section>
    </div>
  );
}
