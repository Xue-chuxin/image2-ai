"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { Loader2 } from "lucide-react";

type GeneratedPreviewImage = {
  id: string;
  url: string;
  thumbnailUrl?: string | null;
};

function withRetryToken(url: string, attempt: number) {
  if (!attempt) {
    return url;
  }

  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}retry=${attempt}`;
}

export function GeneratedImagePreview({
  image,
  alt,
  className,
}: {
  image: GeneratedPreviewImage;
  alt: string;
  className?: string;
}) {
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [useOriginal, setUseOriginal] = useState(false);
  const [failed, setFailed] = useState(false);
  const hasThumbnail = Boolean(image.thumbnailUrl && image.thumbnailUrl !== image.url);
  const displayUrl = !useOriginal && image.thumbnailUrl ? image.thumbnailUrl : image.url;
  const imageSrc = useMemo(() => withRetryToken(displayUrl, attempt), [attempt, displayUrl]);

  useEffect(() => {
    setAttempt(0);
    setLoaded(false);
    setUseOriginal(false);
    setFailed(false);
  }, [image.id, image.thumbnailUrl, image.url]);

  function retryLoad() {
    if (hasThumbnail && !useOriginal && attempt >= 3) {
      setUseOriginal(true);
      setAttempt(0);
      return;
    }

    if (attempt >= 8) {
      setFailed(true);
      return;
    }

    window.setTimeout(() => {
      setAttempt((current) => current + 1);
    }, Math.min(700 + attempt * 350, 2400));
  }

  return (
    <div className={clsx("generated-image-preview", loaded && "is-loaded", failed && "is-failed", className)}>
      {!loaded ? (
        <div className="generated-image-preview__loading">
          {failed ? null : <Loader2 className="animate-spin" size={18} />}
          <span>{failed ? "图片暂时不可访问" : useOriginal ? "正在加载原图" : "图片保存中"}</span>
        </div>
      ) : null}
      <img
        src={imageSrc}
        alt={alt}
        decoding="async"
        loading="eager"
        onLoad={() => setLoaded(true)}
        onError={retryLoad}
      />
      {image.thumbnailUrl && image.url !== image.thumbnailUrl ? (
        <a className="generated-image-preview__open" href={image.url} target="_blank" rel="noreferrer">
          查看原图
        </a>
      ) : null}
    </div>
  );
}
