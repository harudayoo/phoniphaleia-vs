import Image from 'next/image';

type NothingIconProps = {
  className?: string;
  width?: number;
  height?: number;
};

export default function NothingIcon({
  className = '',
  width = 64,
  height = 64,
}: NothingIconProps) {
  return (
    <div className={className} style={{ width, height }}>
      <Image
        src="/Nothing.png"
        alt="Nothing found"
        width={width}
        height={height}
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        priority
      />
    </div>
  );
}