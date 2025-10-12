import { useState, useRef, useEffect } from 'react';
import Section from './Section';
import { configuration, type AnimalKey } from './configuration';
// import AriaSelecMenu from "./AriaSelectMenu"
import AriaSelecMenu from './NewAriaSelectMenu';
import AriaSelecMenuWeb from './AriaSelectMenuWeb';

type ImageData = {
  src: string;
  srcSet: {
    attribute: string;
  };
  attributes?: Record<string, unknown>;
};

type OptimizedImages = {
  [key: string]: ImageData;
};

type AnimalSectionProps = {
  id?: string;
  optimizedImages: OptimizedImages;
};

export default function AnimalSection({
  id,
  optimizedImages,
}: AnimalSectionProps) {
  const [animal, setAnimalState] = useState<AnimalKey>('chien');

  const setAnimal = (animalKey: string) => {
    setAnimalState(animalKey as AnimalKey);
  };
  const [height, setHeight] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current && setHeight(ref.current.clientHeight);
  }, []);

  const currentAnimal = configuration[animal];
  const currentImage = optimizedImages[currentAnimal.imageKey];

  if (!currentImage) {
    return null; // Ou un placeholder
  }

  return (
    <div
      id={id}
      className="bg-gradient-to-l to-canard from-canard-light overflow-hidden"
    >
      <div className="max-w-4xl mx-auto px-4 py-16 sm:px-6 sm:pt-20 sm:pb-24 lg:max-w-7xl lg:pt-24 lg:px-8">
        <h2 className="text-3xl font-extrabold text-white tracking-tight">
          L'ostéopathie pour qui ?
        </h2>
        <div>
          <AriaSelecMenu initialAnimal="chien" setAnimal={setAnimal} />
          <AriaSelecMenuWeb setAnimal={setAnimal} />
        </div>
        <div
          ref={ref}
          className={`mt-12 grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:mt-16 lg:grid-cols-2 lg:gap-x-8 lg:gap-y-16 `}
          style={{ minHeight: height !== 0 ? height : undefined }}
        >
          <Section {...currentAnimal} imageData={currentImage} />
        </div>
      </div>
    </div>
  );
}
