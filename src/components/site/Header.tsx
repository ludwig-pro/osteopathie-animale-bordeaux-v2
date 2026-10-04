import { useState } from 'react';
import {
  ArrowUpRightIcon,
  CaretDownIcon,
  CatIcon,
  DogIcon,
  HorseIcon,
  ListIcon,
  MapPinIcon,
  RabbitIcon,
} from '@phosphor-icons/react';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from '../ui/sheet';
import BookingLink from './BookingLink';

const animals = [
  { label: 'Le chien', slug: 'chien', icon: DogIcon },
  { label: 'Le chat', slug: 'chat', icon: CatIcon },
  { label: 'Le cheval', slug: 'cheval', icon: HorseIcon },
  { label: 'Les NAC', slug: 'nac', icon: RabbitIcon },
];
const navigation = [
  { label: 'L’ostéopathie', href: '/#osteopathie' },
  { label: 'La consultation', href: '/#consultation' },
  { label: 'Tarifs', href: '/#tarifs' },
  { label: 'À propos', href: '/#a-propos' },
];

export default function Header({
  currentPath = '/',
}: {
  currentPath?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="announcement">
        <MapPinIcon size={13} aria-hidden="true" />
        <span>Consultations en cabinet à Bègles et à domicile en Gironde</span>
        <a href="/#cabinet">
          Découvrir le cabinet <ArrowUpRightIcon size={12} aria-hidden="true" />
        </a>
      </div>
      <header className="site-header">
        <div className="site-container header-inner">
          <a href="/" className="brand" aria-label="Agathe Lescout — Accueil">
            <span className="brand-mark">
              <span aria-hidden="true">al.</span>
            </span>
            <span>
              Agathe Lescout<small>OSTÉOPATHE ANIMALIER</small>
            </span>
          </a>
          <nav className="desktop-nav" aria-label="Navigation principale">
            <DropdownMenu>
              <DropdownMenuTrigger
                className="nav-link"
                aria-current={
                  currentPath.startsWith('/animaux/') ? 'true' : undefined
                }
              >
                Vos animaux
                <CaretDownIcon size={12} aria-hidden="true" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {animals.map(({ label, slug, icon: Icon }) => (
                  <DropdownMenuItem asChild key={slug}>
                    <a
                      href={`/animaux/${slug}/`}
                      aria-current={
                        currentPath === `/animaux/${slug}/` ? 'page' : undefined
                      }
                    >
                      <Icon size={19} aria-hidden="true" />
                      {label}
                    </a>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {navigation.map((item) => (
              <a className="nav-link" key={item.href} href={item.href}>
                {item.label}
              </a>
            ))}
          </nav>
          <div className="header-booking">
            <BookingLink source="header" />
          </div>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="mobile-menu-trigger min-[961px]:hidden"
                aria-label="Ouvrir le menu"
              >
                <ListIcon className="!size-6" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetTitle className="font-display text-2xl">
                Agathe Lescout
              </SheetTitle>
              <SheetDescription className="mt-1 text-sm text-muted-foreground">
                Ostéopathe animalier
              </SheetDescription>
              <nav aria-label="Navigation mobile" className="mobile-nav">
                <SheetClose asChild>
                  <a href="/">Accueil</a>
                </SheetClose>
                <p className="eyebrow mt-4">Vos animaux</p>
                {animals.map(({ label, slug, icon: Icon }) => (
                  <SheetClose asChild key={slug}>
                    <a
                      href={`/animaux/${slug}/`}
                      aria-current={
                        currentPath === `/animaux/${slug}/` ? 'page' : undefined
                      }
                    >
                      <Icon size={20} aria-hidden="true" />
                      {label}
                      <ArrowUpRightIcon
                        className="ml-auto"
                        size={15}
                        aria-hidden="true"
                      />
                    </a>
                  </SheetClose>
                ))}
                <hr className="my-3" />
                {navigation.map((item) => (
                  <SheetClose asChild key={item.href}>
                    <a href={item.href}>{item.label}</a>
                  </SheetClose>
                ))}
                <SheetClose asChild>
                  <a href="/#contact">Contact</a>
                </SheetClose>
              </nav>
              <BookingLink source="mobile-navigation" className="mt-6 w-full" />
            </SheetContent>
          </Sheet>
        </div>
      </header>
    </>
  );
}
