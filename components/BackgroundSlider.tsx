"use client";

import { useState, useEffect } from "react";

interface Props {
  backgroundImages: string[];
}

const BackgroundSlider = ({ backgroundImages }: Props) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [, setNextImageIndex] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex(
        (prevIndex) => (prevIndex + 1) % backgroundImages.length,
      );
      setNextImageIndex(
        (prevIndex) => (prevIndex + 1) % backgroundImages.length,
      );
    }, 5000);

    return () => clearInterval(interval);
  }, [backgroundImages.length]);

  return (
    <>
      {backgroundImages.map((image, index) => (
        <div
          key={index}
          className="absolute inset-0 bg-cover mix-blend-multiply bg-center transition-opacity duration-1000"
          style={{
            backgroundImage: `url(${image})`,
            opacity: index === currentImageIndex ? 1 : 0,
            zIndex: index === currentImageIndex ? 1 : 0,
          }}
        />
      ))}
    </>
  );
};
export default BackgroundSlider;
