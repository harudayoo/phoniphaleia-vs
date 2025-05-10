import React from 'react';

type LoaderProps = {
  size?: number | string;
  className?: string;
  style?: React.CSSProperties;
};

const Loader1: React.FC<LoaderProps> = ({ 
  size = 80, 
  className = '',
  style = {}
}) => (
  <div
    className={className}
    style={{
      width: typeof size === 'number' ? `${size}px` : size,
      height: typeof size === 'number' ? `${size}px` : size,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      ...style
    }}
    data-testid="loader1"
    aria-busy="true"
    aria-label="Loading"
  >
    <video
      src="/Hand-Loader.webm"
      autoPlay
      loop
      muted
      playsInline
      preload="auto"
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        pointerEvents: 'none'
      }}
    />
  </div>
);

export default Loader1;