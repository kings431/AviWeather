import { useCallback } from 'react';
import Particles from 'react-tsparticles';
import { loadFull } from 'tsparticles';

const BASE_URL = import.meta.env.BASE_URL;

// Add a style override to guarantee the background is fixed and does not affect layout
const particleStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  pointerEvents: 'none',
  zIndex: 0,
};

export default function ParticleBackground() {
  const particlesInit = useCallback(async (engine: any) => {
    await loadFull(engine);
  }, []);

  return (
    <Particles
      id="tsparticles"
      style={particleStyle}
      init={particlesInit}
      options={{
        fullScreen: { enable: false }, // We'll handle full screen with our style
        particles: {
          number: { value: 10, density: { enable: true, value_area: 800 } },
          move: { enable: true, speed: 0.15, direction: 'none', outModes: 'out' },
          opacity: { value: 0.13 },
          size: { value: 48, random: { enable: true, minimumValue: 32 } },
          shape: {
            type: ['image'],
            image: [
              { src: `${BASE_URL}/icons/sun.svg`, width: 48, height: 48 },
              { src: `${BASE_URL}/icons/cloud.svg`, width: 48, height: 48 },
              { src: `${BASE_URL}/icons/wind.svg`, width: 48, height: 48 },
              { src: `${BASE_URL}/icons/rain.svg`, width: 48, height: 48 },
            ],
          },
        },
        detectRetina: true,
      }}
    />
  );
} 