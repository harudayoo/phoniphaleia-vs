import React from 'react';
import Image from 'next/image';

interface SystemLogoNoTextProps {
    width?: number | string;
    height?: number | string;
    className?: string;
    alt?: string;
}

const SystemLogoNoText: React.FC<SystemLogoNoTextProps> = ({
    width = 'auto',
    height = 'auto',
    className = '',
    alt = 'System Logo'
}) => {
    const isAuto = width === 'auto' || height === 'auto';
    
    if (isAuto) {
        return (
            <div style={{ position: 'relative', display: 'inline-block', width, height }} className={className}>
                <Image
                    src="/LogoNoText.png"
                    alt={alt}
                    fill
                    style={{ objectFit: 'contain' }}
                />
            </div>
        );
    }
    
    return (
        <Image
            src="/LogoNoText.png"
            alt={alt}
            width={typeof width === 'number' ? width : 100}
            height={typeof height === 'number' ? height : 100}
            className={className}
            style={{ display: 'inline-block', objectFit: 'contain' }}
        />
    );
};

export default SystemLogoNoText;