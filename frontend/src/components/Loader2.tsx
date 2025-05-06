import React from "react";

type Loader2Props = {
    className?: string;
    style?: React.CSSProperties;
    width?: number | string;
    height?: number | string;
};

const Loader2: React.FC<Loader2Props> = ({
    className = "",
    style = {},
    width = "100%",
    height = "100%",
}) => (
    <div
        className={className}
        style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            width,
            height,
            ...style,
        }}
        aria-busy="true"
        aria-label="Loading"
    >
        <iframe
            src="/Loader-2.webm"
            title="Loading animation"
            width="100%"
            height="100%"
            style={{
                border: "none",
                background: "transparent",
                pointerEvents: "none",
                width: "100%",
                height: "100%",
            }}
            allowFullScreen={false}
            tabIndex={-1}
        />
    </div>
);

export default Loader2;