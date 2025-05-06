import React from 'react';
import Image from 'next/image';

interface SystemLogo1Props {
    width?: number | 'auto';
    height?: number | 'auto';
    alt?: string;
    className?: string;
    onClick?: () => void;
    style?: React.CSSProperties;
}

const SystemLogo1: React.FC<SystemLogo1Props> = ({
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
            src="/Logo1_v1.png"
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

export default SystemLogo1;