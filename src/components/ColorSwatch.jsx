import { getColorSwatch } from "../lib/colorSwatches";

export default function ColorSwatch({ name, size = 14 }) {
  const swatch = getColorSwatch(name);
  const style = { width: size, height: size };

  if (swatch.type === "solid") {
    return <span className="color-swatch-dot" style={{ ...style, backgroundColor: swatch.hex }} />;
  }
  if (swatch.type === "duo") {
    return (
      <span className="color-swatch-dot color-swatch-duo" style={style}>
        <span style={{ backgroundColor: swatch.hexA }} />
        <span style={{ backgroundColor: swatch.hexB }} />
      </span>
    );
  }
  return (
    <span
      className="color-swatch-dot color-swatch-multi"
      style={style}
      title="Multicolor / patterned"
    />
  );
}