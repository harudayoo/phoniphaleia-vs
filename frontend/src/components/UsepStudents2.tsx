import React from 'react';
import Image, { ImageProps } from 'next/image';

interface UsepStudent2Props extends Omit<ImageProps, 'src' | 'alt'> {
    alt?: string;
    className?: string;
    width?: number | `${number}`;
    height?: number | `${number}`;
    style?: React.CSSProperties;
}

const UsepStudent2: React.FC<UsepStudent2Props> = ({
    alt = 'USEP Student',
    className,
    width = 200,
    height = 200,
    style,
    ...props
}) => (
    <Image
        src="/usep-student2.png"
        alt={alt}
        className={className}
        width={width}
        height={height}
        style={{
            objectFit: 'contain',
            width: '100%',
            height: '100%',
            ...style,
        }}
        {...props}
    />
);

export default UsepStudent2;
