import { ImageZoom } from "fumadocs-ui/components/image-zoom";

type SetupScreenshotProps = {
  src: string;
  darkSrc?: string;
  alt: string;
  width: number;
  height: number;
  caption: string;
};

export function SetupScreenshot({
  src,
  darkSrc,
  alt,
  width,
  height,
  caption,
}: SetupScreenshotProps) {
  return (
    <figure className="setup-screenshot">
      <div className={darkSrc ? "dark:hidden" : undefined}>
        <ImageZoom src={src} alt={alt} width={width} height={height} loading="lazy" />
      </div>
      {darkSrc && (
        <div className="hidden dark:block">
          <ImageZoom src={darkSrc} alt={alt} width={width} height={height} loading="lazy" />
        </div>
      )}
      <figcaption>{caption}</figcaption>
    </figure>
  );
}
