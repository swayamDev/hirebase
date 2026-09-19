import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "Hirebase - the AI-native CRM for recruitment agencies";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          backgroundColor: "#151310",
          color: "#f5f1e8",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "20px",
              height: "20px",
              borderRadius: "9999px",
              backgroundColor: "#9b7fe0",
            }}
          />
          <div style={{ fontSize: "40px", fontWeight: 700, letterSpacing: "-0.02em" }}>
            Hirebase
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            maxWidth: "900px",
          }}
        >
          <div
            style={{
              fontSize: "60px",
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
            }}
          >
            The AI-native CRM for recruitment agencies
          </div>
          <div style={{ fontSize: "28px", color: "#b3ada0" }}>
            Match talent fast with AI assistance.
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
