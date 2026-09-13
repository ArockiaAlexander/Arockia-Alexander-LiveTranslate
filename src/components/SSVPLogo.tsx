import React, { useState } from 'react';

interface SSVPLogoProps {
  className?: string;
  size?: number;
}

export function SSVPLogo({ className = "w-12 h-12", size }: SSVPLogoProps) {
  const [imgSrc, setImgSrc] = useState<string>('/assets/ssvp-logo.jpeg');
  const style = size ? { width: `${size}px`, height: `${size}px` } : undefined;

  return (
    <img
      src={imgSrc}
      alt="Society of St. Vincent de Paul - National Council of India"
      className={`${className} shrink-0 object-contain rounded-full drop-shadow-md border border-slate-100`}
      style={style}
      onError={() => {
        if (imgSrc !== '/ssvp-logo.svg') {
          setImgSrc('/ssvp-logo.svg');
        }
      }}
    />
  );
}
