import React from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

type Loader1Props = {
  size?: number | string;
  className?: string;
};

const Loader1: React.FC<Loader1Props> = ({ size = 80, className = '' }) => (
  <div
    className={className}
    style={{
      width: typeof size === 'number' ? `${size}px` : size,
      height: typeof size === 'number' ? `${size}px` : size,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
    data-testid="loader1"
  >
    <DotLottieReact
      src="https://lottie.host/d81b0871-8e8b-4674-a58e-9d5a23e8925d/lbPxf71kZi.lottie"
      loop
      autoplay
      style={{
        width: '100%',
        height: '100%',
      }}
    />
  </div>
);

export default Loader1;