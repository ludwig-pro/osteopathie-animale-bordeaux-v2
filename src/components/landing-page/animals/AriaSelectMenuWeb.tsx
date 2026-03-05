import type { KeyboardEvent } from 'react';
import type { AnimalKey } from './configuration';

const ANIMAL_TABS: Array<{ key: AnimalKey; label: string }> = [
  { key: 'chien', label: 'Le chien' },
  { key: 'chat', label: 'Le chat' },
  { key: 'cheval', label: 'Le cheval' },
  { key: 'vache', label: 'La vache' },
  { key: 'nac', label: 'N.A.C.' },
];

type AriaSelecMenuWebProps = {
  idPrefix: string;
  selectedAnimal: AnimalKey;
  setAnimal: (animal: AnimalKey) => void;
};

export default function AriaSelecMenuWeb({
  idPrefix,
  selectedAnimal,
  setAnimal,
}: AriaSelecMenuWebProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const currentIndex = ANIMAL_TABS.findIndex(
      ({ key }) => key === selectedAnimal
    );

    if (currentIndex === -1) {
      return;
    }

    let nextIndex = currentIndex;

    if (event.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % ANIMAL_TABS.length;
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + ANIMAL_TABS.length) % ANIMAL_TABS.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = ANIMAL_TABS.length - 1;
    } else {
      return;
    }

    event.preventDefault();

    const nextAnimal = ANIMAL_TABS[nextIndex]?.key;
    if (!nextAnimal) {
      return;
    }

    setAnimal(nextAnimal);
    document.getElementById(`${idPrefix}-tab-${nextAnimal}`)?.focus();
  };

  return (
    <div className="hidden sm:block">
      <div
        className="-mb-px flex flex-row border-b border-white/20"
        role="tablist"
        aria-label="Animaux pris en charge"
      >
        {ANIMAL_TABS.map(({ key, label }) => {
          const isSelected = key === selectedAnimal;

          return (
            <button
              key={key}
              id={`${idPrefix}-tab-${key}`}
              type="button"
              role="tab"
              aria-selected={isSelected}
              aria-controls={`${idPrefix}-panel-${key}`}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => setAnimal(key)}
              onKeyDown={handleKeyDown}
              className={`w-1/5 border-b-2 px-1 py-4 text-center text-base font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-canard ${
                isSelected
                  ? 'border-gold-500 text-gold-500'
                  : 'border-transparent text-white hover:border-gold-500 hover:text-gold-200'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
