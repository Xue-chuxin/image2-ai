"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

function isLoadedImageElement(image: HTMLImageElement | null) {
  return Boolean(image?.complete && image.naturalWidth > 0);
}

export function GeneratedImagePreview({
  image,
  alt,
  className,
  preferOriginal = false,
  loadingLabel = "图片保存中",
  originalLoadingLabel = "正在加载原图",
  failedLabel = "图片暂时不可访问",
}: {
  image: GeneratedPreviewImage;
  alt: string;
  className?: string;
  preferOriginal?: boolean;
  loadingLabel?: string;
  originalLoadingLabel?: string;
  failedLabel?: string;
}) {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [useOriginal, setUseOriginal] = useState(false);
  const [failed, setFailed] = useState(false);
  const hasThumbnail = Boolean(image.thumbnailUrl && image.thumbnailUrl !== image.url);
  const displayUrl = !preferOriginal && !useOriginal && image.thumbnailUrl ? image.thumbnailUrl : image.url;
  const imageSrc = useMemo(() => withRetryToken(displayUrl, attempt), [attempt, displayUrl]);

  const syncLoadedFromElement = useCallback(() => {
    if (isLoadedImageElement(imageRef.current)) {
      setLoaded(true);
      setFailed(false);
    }
  }, []);

  useEffect(() => {
    setAttempt(0);
    setLoaded(false);
    setUseOriginal(false);
    setFailed(false);
  }, [image.id, image.thumbnailUrl, image.url]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(syncLoadedFromElement);
    return () => window.cancelAnimationFrame(frame);
  }, [imageSrc, syncLoadedFromElement]);

  function retryLoad() {
    if (hasThumbnail && !preferOriginal && !useOriginal) {
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
          <span>{failed ? failedLabel : useOriginal ? originalLoadingLabel : loadingLabel}</span>
        </div>
      ) : null}
      <img
        ref={imageRef}
        src={imageSrc}
        alt={alt}
        decoding="async"
        loading="eager"
        onLoad={() => {
          setLoaded(true);
          setFailed(false);
        }}
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
