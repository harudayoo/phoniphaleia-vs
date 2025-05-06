import React from 'react';
import Image from 'next/image';

interface SystemLogo2Props {
    width?: number | 'auto';
    height?: number | 'auto';
    alt?: string;
    className?: string;
    onClick?: () => void;
    style?: React.CSSProperties;
}

const SystemLogo2: React.FC<SystemLogo2Props> = ({
    width = 800,
    height = 500,
    alt = 'System Logo',
    className = '',
    onClick,
    style = {}
}) => {
    const isAutoWidth = width === 'auto';
    const isAutoHeight = height === 'auto';
    const shouldFill = isAutoWidth || isAutoHeight;
    
    return (
        <Image
            src="/Logo2_v2.png"
            alt={alt}
            {...!isAutoWidth && { width: width as number }}
            {...!isAutoHeight && { height: height as number }}
            className={className}
            style={{ 
                display: 'block',
                objectFit: 'contain',
                cursor: onClick ? 'pointer' : 'default',
                ...style 
            }}
            onClick={onClick}
            fill={shouldFill}
            priority
        />
    );
};

export default SystemLogo2;