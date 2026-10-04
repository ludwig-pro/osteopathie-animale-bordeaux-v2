import { Fragment, useState } from 'react';
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Transition,
} from '@headlessui/react';
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/20/solid';

const option = {
  chien: 'Le chien',
  chat: 'Le chat',
  cheval: 'Le cheval',
  vache: 'La vache',
  nac: 'Les nouveaux animaux de compagnie',
};

const animals = Object.entries(option);

function classNames(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}

type AriaSelectMenuProps = {
  initialAnimal: string;
  setAnimal: (animal: string) => void;
};

export default function AriaSelectMenu({
  initialAnimal,
  setAnimal,
}: AriaSelectMenuProps) {
  const [selected, setSelected] = useState(initialAnimal);

  return (
    <div className="sm:hidden mt-8">
      <Listbox
        value={selected}
        onChange={(e) => {
          setAnimal(e);
          setSelected(e);
        }}
      >
        {({ open }) => (
          <>
            <div className="mt-1 relative">
              <ListboxButton className="relative w-full bg-white border border-gray-300 rounded-md shadow-xs pl-3 pr-10 py-2 text-left cursor-default focus:outline-hidden focus:ring-1 focus:ring-gold-500 focus:border-gold-500 sm:text-sm">
                <span className="block truncate">
                  {option[selected as keyof typeof option]}
                </span>
                <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  <ChevronUpDownIcon
                    className="h-5 w-5 text-gray-400"
                    aria-hidden="true"
                  />
                </span>
              </ListboxButton>

              <Transition
                show={open}
                as={Fragment}
                leave="transition ease-in duration-100"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <ListboxOptions
                  as="ul"
                  modal={false}
                  static
                  className="absolute mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black/5 overflow-auto focus:outline-hidden sm:text-sm"
                >
                  {animals.map((animal) => (
                    <ListboxOption
                      as="li"
                      key={animal[0]}
                      className={({ focus }) =>
                        classNames(
                          focus ? 'text-white bg-gold-600' : 'text-gray-900',
                          'cursor-default select-none relative py-2 pl-8 pr-4'
                        )
                      }
                      value={animal[0]}
                    >
                      {({ selected, focus }) => (
                        <>
                          <span
                            className={classNames(
                              selected ? 'font-semibold' : 'font-normal',
                              'block truncate'
                            )}
                          >
                            {animal[1]}
                          </span>

                          {selected ? (
                            <span
                              className={classNames(
                                focus ? 'text-white' : 'text-gold-600',
                                'absolute inset-y-0 left-0 flex items-center pl-1.5'
                              )}
                            >
                              <CheckIcon
                                className="h-5 w-5"
                                aria-hidden="true"
                              />
                            </span>
                          ) : null}
                        </>
                      )}
                    </ListboxOption>
                  ))}
                </ListboxOptions>
              </Transition>
            </div>
          </>
        )}
      </Listbox>
    </div>
  );
}
