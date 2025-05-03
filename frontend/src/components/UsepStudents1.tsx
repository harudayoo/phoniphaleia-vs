import React from 'react';
import Image, { ImageProps } from 'next/image';

interface UsepStudent1Props extends Omit<ImageProps, 'src' | 'alt'> {
    alt?: string;
    className?: string;
    width?: number | `${number}`;
    height?: number | `${number}`;
    style?: React.CSSProperties;
}
const UsepStudent1: React.FC<UsepStudent1Props> = ({
    alt = 'USEP Student',
    className,
    width = 200,
    height = 200,
    style,
    ...props
}) => (
    <Image
        src="/usep-student1.png"
        alt={alt}
        className={className}
        width={width}
        height={height}
        style={{
            objectFit: 'cover',
            width: '100%',
            height: '100%',
            ...style,
        }}
        {...props}
    />
);

export default UsepStudent1;
