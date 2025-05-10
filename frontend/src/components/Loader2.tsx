import React from "react";

type LoaderProps = {
  size?: number | string;
  className?: string;
  style?: React.CSSProperties;
};

const Loader2: React.FC<LoaderProps> = ({
  size = 130,
  className = "",
  style = {}
}) => (
  <div
    className={className}
    style={{
      width: typeof size === 'number' ? `${size}px` : size,
      height: typeof size === 'number' ? `${size}px` : size,
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      ...style
    }}
    data-testid="loader2"
    aria-busy="true"
    aria-label="Loading"
  >
    <video
      src="/Loader-2.webm"
      autoPlay
      loop
      muted
      playsInline
      preload="auto"
      style={{
        width: "100%",
        height: "100%",
        objectFit: "contain",
        pointerEvents: "none"
      }}
    />
  </div>
);

export default Loader2;