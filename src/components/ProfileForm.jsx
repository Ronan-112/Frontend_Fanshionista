import { useEffect, useState } from "react";

const BODY_TYPES = [
  { value: "slim", label: "Slim", desc: "Narrow frame all over — shoulders, waist, and hips are all fairly slender." },
  { value: "athletic", label: "Athletic", desc: "Toned build with shoulders noticeably broader than the waist." },
  { value: "rectangle", label: "Rectangle", desc: "Shoulders, waist, and hips are roughly the same width — not much curve at the waist." },
  { value: "hourglass", label: "Hourglass", desc: "Shoulders and hips are similar width, with a waist that's clearly narrower than both." },
  { value: "pear", label: "Pear", desc: "Hips are noticeably wider than the shoulders." },
  { value: "apple", label: "Apple", desc: "Fuller through the midsection, with a waist wider than the hips." },
  { value: "broad", label: "Broad", desc: "Wide frame overall — shoulders and build are larger than average." },
];

const SKIN_TONES = [
  { value: "fair", label: "Fair", swatch: "#F3D5B5" },
  { value: "wheatish", label: "Wheatish / Medium", swatch: "#C68863" },
  { value: "dusky", label: "Deep / Dusky", swatch: "#6B4226" },
];

const GENDERS = [
  { value: "unisex_masculine", label: "Male" },
  { value: "unisex_feminine", label: "Female" },
  { value: "any", label: "Prefer not to say" },
];

const AGE_GROUPS = [
  { value: "genz", label: "Gen Z (under 25)" },
  { value: "mid", label: "20s–30s" },
  { value: "mature", label: "30+" },
];

const OCCASIONS = [
  { value: "casual", label: "Casual" },
  { value: "formal", label: "Formal" },
  { value: "festive", label: "Festive" },
];

const STYLE_PREFS = [
  { value: "all", label: "Show me everything" },
  { value: "indian_ethnic", label: "Indian ethnic wear" },
  { value: "global", label: "Global / Western" },
  { value: "indo_western", label: "Indo-Western fusion" },
];

export default function ProfileForm({ prefillFromPhoto, onSubmit, isSubmitting }) {
  const [form, setForm] = useState({
    body_type: "rectangle",
    skin_tone: "wheatish",
    age_group: "genz",
    occasion: "casual",
    style_preference: "all",
    gender_presentation: "any",
  });
  const [showBodyGuide, setShowBodyGuide] = useState(false);

  useEffect(() => {
    if (prefillFromPhoto) {
      setForm((prev) => ({
        ...prev,
        body_type: prefillFromPhoto.bodyType ?? prev.body_type,
        skin_tone: prefillFromPhoto.skinTone ?? prev.skin_tone,
      }));
    }
  }, [prefillFromPhoto]);

  const update = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));
  const setBodyType = (value) => setForm((prev) => ({ ...prev, body_type: value }));
  const setSkinTone = (value) => setForm((prev) => ({ ...prev, skin_tone: value }));

  return (
    <form
      className="profile-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form);
      }}
    >
      <div className="field-grid">
        <div className="field field-wide">
          <span className="field-label">Gender</span>
          <div className="swatch-picker">
            {GENDERS.map((o) => (
              <button
                type="button"
                key={o.value}
                className={form.gender_presentation === o.value ? "swatch-option swatch-option-active" : "swatch-option"}
                onClick={() => setForm((prev) => ({ ...prev, gender_presentation: o.value }))}
              >
                <span>{o.label}</span>
              </button>
            ))}
          </div>
          <p className="field-hint">This helps match outfit styles and cuts designed for that fit.</p>
        </div>

        <div className="field field-wide">
          <div className="field-label-row">
            <span className="field-label">Body Shape</span>
            <button
              type="button"
              className="guide-toggle"
              onClick={() => setShowBodyGuide((v) => !v)}
            >
              {showBodyGuide ? "Hide guide" : "Not sure? See guide"}
            </button>
          </div>

          {showBodyGuide && (
            <div className="body-guide">
              {BODY_TYPES.map((o) => (
                <button
                  type="button"
                  key={o.value}
                  className={form.body_type === o.value ? "body-guide-card body-guide-card-active" : "body-guide-card"}
                  onClick={() => setBodyType(o.value)}
                >
                  <span className="body-guide-label">{o.label}</span>
                  <span className="body-guide-desc">{o.desc}</span>
                </button>
              ))}
            </div>
          )}

          <select value={form.body_type} onChange={update("body_type")}>
            {BODY_TYPES.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className="field field-wide">
          <span className="field-label">Skin tone</span>
          <div className="swatch-picker">
            {SKIN_TONES.map((o) => (
              <button
                type="button"
                key={o.value}
                className={form.skin_tone === o.value ? "swatch-option swatch-option-active" : "swatch-option"}
                onClick={() => setSkinTone(o.value)}
              >
                <span className="swatch-circle" style={{ backgroundColor: o.swatch }} />
                <span>{o.label}</span>
              </button>
            ))}
          </div>
          <p className="field-hint">Pick whichever is closest — there's no wrong answer, and you can always change it.</p>
        </div>

        <label className="field">
          <span className="field-label">Age group</span>
          <select value={form.age_group} onChange={update("age_group")}>
            {AGE_GROUPS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">Occasion</span>
          <select value={form.occasion} onChange={update("occasion")}>
            {OCCASIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>

        <label className="field field-wide">
          <span className="analysis-label">Detected body shape</span>
          <select value={form.style_preference} onChange={update("style_preference")}>
            {STYLE_PREFS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
      </div>

      <button type="submit" className="submit-btn" disabled={isSubmitting}>
        {isSubmitting ? "Styling your look…" : "Get my recommendations"}
      </button>
    </form>
  );
}