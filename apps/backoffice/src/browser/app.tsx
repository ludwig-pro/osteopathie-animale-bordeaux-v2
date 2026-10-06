import { useEffect, useState } from 'react';
import { MotionConfig } from 'motion/react';
import {
  ArrowRightIcon,
  ArrowTopRightOnSquareIcon,
  ArrowRightStartOnRectangleIcon,
  ChevronUpIcon,
  HomeIcon,
  UserGroupIcon,
  EnvelopeIcon,
  TagIcon,
  ShieldCheckIcon,
  UserCircleIcon,
} from '@heroicons/react/20/solid';
import type { GoogleContact, MailingList } from '../contact-types';
import {
  appointmentDate,
  contactName,
  initials,
  useContacts,
  type ContactsModel,
  type ContactsTransport,
} from './contacts-model';
import {
  ArchiveDialog,
  BulkDialog,
  ContactDialog,
  ListDialog,
} from './contact-dialogs';
import { ContactsPage } from './contacts-page';
import { ListsPage } from './lists-page';
import { Notice } from './common';
import { Avatar } from './ui/avatar';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  Dropdown,
  DropdownButton,
  DropdownDivider,
  DropdownHeader,
  DropdownItem,
  DropdownLabel,
  DropdownMenu,
} from './ui/dropdown';
import { Heading, Subheading } from './ui/heading';
import { Navbar, NavbarItem, NavbarLabel, NavbarSpacer } from './ui/navbar';
import {
  Sidebar,
  SidebarBody,
  SidebarFooter,
  SidebarHeader,
  SidebarHeading,
  SidebarItem,
  SidebarLabel,
  SidebarSection,
  SidebarSpacer,
} from './ui/sidebar';
import { SidebarLayout } from './ui/sidebar-layout';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Text } from './ui/text';

type View = 'home' | 'contacts' | 'lists';
export interface AppIdentity {
  email: string;
  name: string;
}

function Home({
  model,
  href,
  identity,
  onContact,
  onCreateList,
  onLogout,
}: {
  model: ContactsModel;
  href: (view: View) => string;
  identity: AppIdentity;
  onContact: (contact: GoogleContact) => void;
  onCreateList: () => void;
  onLogout: () => void;
}) {
  const recent = model.contacts
    .filter((contact) => contact.lastAppointment)
    .sort((a, b) =>
      (b.lastAppointment ?? '').localeCompare(a.lastAppointment ?? '')
    )
    .slice(0, 5);
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Heading>Bonjour Agathe.</Heading>
          <Text className="mt-1">
            Votre activité, vos contacts et vos prochaines nouvelles.
          </Text>
        </div>
        <Button href={href('contacts')}>
          Voir mes contacts
          <ArrowRightIcon />
        </Button>
      </div>
      <div className="mt-8 grid gap-6 sm:grid-cols-3">
        {[
          {
            name: 'Contacts Google',
            value: model.ready ? model.contacts.length : '—',
            detail: 'Votre carnet d’adresses',
          },
          {
            name: 'Avec un e-mail',
            value: model.ready
              ? model.contacts.filter((contact) => contact.emails.length).length
              : '—',
            detail: 'Une adresse pour garder le lien',
          },
          {
            name: 'Listes de diffusion',
            value: model.listsReady ? model.lists.lists.length : '—',
            detail: 'Des destinataires bien organisés',
          },
        ].map((stat) => (
          <div key={stat.name} className="border-t border-zinc-950/15 pt-4">
            <div className="text-sm/6 font-medium text-zinc-600">
              {stat.name}
            </div>
            <div className="mt-3 font-display text-4xl/10 tracking-tight text-zinc-950">
              {stat.value}
            </div>
            <Text className="mt-2 text-xs/5">{stat.detail}</Text>
          </div>
        ))}
      </div>
      {(model.error || model.listsError) && (
        <div className="mt-6 space-y-3">
          {model.error && <Notice>{model.error}</Notice>}
          {model.listsError && <Notice>{model.listsError}</Notice>}
        </div>
      )}
      <div className="mt-9 grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-950/10 bg-white p-6">
          <UserGroupIcon
            className="mb-5 size-6 text-green-800"
            aria-hidden="true"
          />
          <Subheading>Le lien avec vos clients</Subheading>
          <Text className="mt-2">
            Retrouvez une fiche, mettez à jour ses coordonnées et choisissez les
            bonnes listes de diffusion.
          </Text>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button href={href('contacts')}>
              Ouvrir le carnet
              <ArrowRightIcon />
            </Button>
            <Button outline onClick={onCreateList} disabled={!model.listsReady}>
              Créer une liste
            </Button>
          </div>
        </section>
        <section className="rounded-xl border border-zinc-950/10 p-6">
          <div className="mb-5 flex items-center justify-between">
            <EnvelopeIcon className="size-6 text-zinc-500" aria-hidden="true" />
            <Badge color="zinc">À venir</Badge>
          </div>
          <Subheading>Les nouvelles du cabinet</Subheading>
          <Text className="mt-2">
            Préparez bientôt vos newsletters dans un modèle qui reprend les
            couleurs et les codes visuels de votre site.
          </Text>
          <Text className="mt-5 text-xs/5">
            L’envoi de newsletters sera ajouté lors d’une prochaine étape.
          </Text>
        </section>
      </div>
      <div className="mt-10 flex items-center justify-between gap-4">
        <Subheading>Derniers rendez-vous connus</Subheading>
        <Button plain href={href('contacts')}>
          Tous les contacts
          <ArrowRightIcon />
        </Button>
      </div>
      {recent.length ? (
        <Table className="mt-4">
          <TableHead>
            <TableRow>
              <TableHeader>Contact</TableHeader>
              <TableHeader>Animal / animaux</TableHeader>
              <TableHeader>Rendez-vous</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {recent.map((contact) => (
              <TableRow key={contact.id}>
                <TableCell>
                  <button
                    type="button"
                    className="flex items-center gap-3 font-medium hover:text-green-700"
                    onClick={() => onContact(contact)}
                  >
                    <Avatar
                      initials={initials(contactName(contact))}
                      className="size-8 bg-zinc-100 text-zinc-700"
                    />
                    {contactName(contact)}
                  </button>
                </TableCell>
                <TableCell className="text-zinc-500">
                  {contact.animals.join(', ') || '—'}
                </TableCell>
                <TableCell className="text-zinc-500">
                  {appointmentDate(contact.lastAppointment)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <Text className="mt-4 rounded-lg bg-zinc-50 px-5 py-6">
          Les rendez-vous connus dans Calendly apparaîtront ici pour les
          contacts correspondants.
        </Text>
      )}
      <section
        id="compte"
        className="mt-10 flex flex-wrap items-center gap-4 border-t border-zinc-950/10 pt-6"
      >
        <ShieldCheckIcon className="size-6 text-green-800" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <Subheading>Votre compte</Subheading>
          <Text className="break-all">{identity.email}</Text>
          <Text className="text-xs/5">Connexion sécurisée avec Google</Text>
        </div>
        <Button outline onClick={onLogout}>
          Se déconnecter
        </Button>
      </section>
    </>
  );
}

function readView(preview: boolean, initial: 'home' | 'contacts'): View {
  if (window.location.hash === '#listes') return 'lists';
  if (preview)
    return ['#home', '#compte'].includes(window.location.hash)
      ? 'home'
      : window.location.hash === '#contacts'
        ? 'contacts'
        : initial;
  return window.location.pathname === '/'
    ? 'home'
    : window.location.pathname === '/contacts'
      ? 'contacts'
      : initial;
}

export function App({
  identity,
  initial,
  preview,
  transport,
  offline,
}: {
  identity: AppIdentity;
  initial: 'home' | 'contacts';
  preview: boolean;
  offline: boolean;
  transport: ContactsTransport;
}) {
  const model = useContacts(transport);
  const [view, setView] = useState<View>(() => readView(preview, initial));
  const [navigation, setNavigation] = useState(0);
  const [notice, setNotice] = useState('');
  const [contact, setContact] = useState<GoogleContact | null>(null);
  const [listEditor, setListEditor] = useState<MailingList | 'new' | null>(
    null
  );
  const [archive, setArchive] = useState<MailingList | null>(null);
  const [bulk, setBulk] = useState<{ ids: string[]; done: () => void } | null>(
    null
  );
  const [listFilter, setListFilter] = useState('');
  const [signedOut, setSignedOut] = useState(false);
  const href = (target: View) =>
    preview
      ? `#${target === 'lists' ? 'listes' : target}`
      : target === 'home'
        ? '/'
        : target === 'lists'
          ? '/contacts#listes'
          : '/contacts';
  const navigate = (target: View) => {
    window.history.pushState(null, '', href(target));
    setView(target);
    setNotice('');
    window.scrollTo(0, 0);
  };
  const logout = () => {
    if (offline) setSignedOut(true);
    else
      (
        document.getElementById('logout-form') as HTMLFormElement
      ).requestSubmit();
  };

  useEffect(() => {
    const route = () => {
      setView(readView(preview, initial));
      setNavigation((previous) => previous + 1);
      setNotice('');
    };
    const onClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const link =
        event.target instanceof Element ? event.target.closest('a') : null;
      if (!link || link.target || link.hasAttribute('download')) return;
      const address = link.getAttribute('href');
      const allowed = preview
        ? ['#home', '#contacts', '#listes', '#compte']
        : ['/', '/contacts', '/contacts#listes', '/#compte'];
      if (!address || !allowed.includes(address)) return;
      event.preventDefault();
      window.history.pushState(null, '', address);
      route();
      if (!address.endsWith('#compte')) window.scrollTo(0, 0);
    };
    document.addEventListener('click', onClick);
    window.addEventListener('popstate', route);
    window.addEventListener('hashchange', route);
    return () => {
      document.removeEventListener('click', onClick);
      window.removeEventListener('popstate', route);
      window.removeEventListener('hashchange', route);
    };
  }, [preview, initial]);

  useEffect(() => {
    document.title = `${view === 'contacts' ? 'Contacts' : view === 'lists' ? 'Listes de diffusion' : 'Espace de gestion'} — Agathe Lescout`;
    if (window.location.hash === '#compte')
      document.getElementById('compte')?.scrollIntoView({ block: 'center' });
  }, [view, navigation]);

  useEffect(() => {
    if (
      model.listsReady &&
      listFilter &&
      listFilter !== '__unassigned' &&
      !model.lists.lists.some((list) => list.id === listFilter)
    )
      setListFilter('');
  }, [model.listsReady, model.lists.lists, listFilter]);

  const profile = (
    <Dropdown>
      <DropdownButton as={SidebarItem} className="w-full">
        <Avatar initials="AL" className="size-9 bg-green-100 text-green-800" />
        <div className="min-w-0 flex-1">
          <SidebarLabel className="block">Agathe Lescout</SidebarLabel>
          <span className="block truncate text-xs/5 font-normal text-zinc-500">
            {identity.email}
          </span>
        </div>
        <ChevronUpIcon />
      </DropdownButton>
      <DropdownMenu anchor="top start">
        <DropdownHeader>
          <div className="text-xs/5 text-zinc-500">Connectée avec Google</div>
          <div className="text-sm/6 font-medium">{identity.name}</div>
        </DropdownHeader>
        <DropdownDivider />
        <DropdownItem href={preview ? '#compte' : '/#compte'}>
          <UserCircleIcon />
          <DropdownLabel>Mon compte</DropdownLabel>
        </DropdownItem>
        <DropdownItem onClick={logout}>
          <ArrowRightStartOnRectangleIcon />
          <DropdownLabel>Se déconnecter</DropdownLabel>
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
  const sidebar = (
    <Sidebar aria-label="Navigation principale">
      <SidebarHeader className="border-b-0 px-6 pt-8">
        <a
          href={href('home')}
          className="flex items-center gap-3"
          aria-label="Agathe Lescout — Accueil"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-green-800 font-display text-xl italic text-white">
            OA
          </span>
          <div>
            <span className="block font-display text-base/6 text-zinc-950">
              Agathe Lescout
            </span>
            <span className="block text-xs/5 text-zinc-500">
              Ostéopathie animale
            </span>
          </div>
        </a>
      </SidebarHeader>
      <SidebarBody>
        <SidebarSection>
          <SidebarHeading>Votre cabinet</SidebarHeading>
          <SidebarItem href={href('home')} current={view === 'home'}>
            <HomeIcon />
            <SidebarLabel>Accueil</SidebarLabel>
          </SidebarItem>
          <SidebarItem href={href('contacts')} current={view === 'contacts'}>
            <UserGroupIcon />
            <SidebarLabel>Contacts</SidebarLabel>
          </SidebarItem>
          <SidebarItem href={href('lists')} current={view === 'lists'}>
            <TagIcon />
            <SidebarLabel>Listes de diffusion</SidebarLabel>
          </SidebarItem>
          <SidebarItem disabled>
            <EnvelopeIcon />
            <SidebarLabel>Newsletters</SidebarLabel>
            <span className="ml-auto text-xs font-normal text-zinc-400">
              À venir
            </span>
          </SidebarItem>
        </SidebarSection>
        <SidebarSpacer />
        <SidebarSection>
          <SidebarItem
            href="https://www.osteopathie-animale-bordeaux.fr"
            target="_blank"
            rel="noopener noreferrer"
          >
            <ArrowTopRightOnSquareIcon />
            <SidebarLabel>Voir le site</SidebarLabel>
            <span className="sr-only"> dans un nouvel onglet</span>
          </SidebarItem>
        </SidebarSection>
      </SidebarBody>
      <SidebarFooter>{profile}</SidebarFooter>
    </Sidebar>
  );
  if (signedOut)
    return (
      <div className="mx-auto max-w-md px-6 py-24">
        <Heading>Session de démonstration terminée.</Heading>
        <Text className="mt-3">
          La connexion Google sera disponible après sa configuration.
        </Text>
        <Button className="mt-6" onClick={() => setSignedOut(false)}>
          Revenir à l’aperçu
        </Button>
      </div>
    );

  return (
    <MotionConfig reducedMotion="user">
      <a href="#main" className="skip-link">
        Aller au contenu
      </a>
      <SidebarLayout
        sidebar={sidebar}
        navbar={
          <Navbar>
            <NavbarItem href={href('home')}>
              <NavbarLabel>Agathe Lescout</NavbarLabel>
            </NavbarItem>
            <NavbarSpacer />
            <NavbarItem
              href={preview ? '#compte' : '/#compte'}
              aria-label="Votre compte"
            >
              <Avatar
                initials="AL"
                className="size-8 bg-green-100 text-green-800"
              />
            </NavbarItem>
          </Navbar>
        }
      >
        <div id="main" tabIndex={-1}>
          {preview && (
            <div className="mb-7 flex flex-wrap items-center gap-2 rounded-lg bg-zinc-50 px-3.5 py-2.5 text-xs/5 text-zinc-600">
              <Badge color="zinc">Aperçu</Badge>Données fictives · Modifications
              temporaires
            </div>
          )}
          <div className="mb-6 flex items-center gap-2 text-xs/5 text-zinc-500">
            <HomeIcon className="size-3.5" aria-hidden="true" />
            <span>Espace de gestion</span>
            <span aria-hidden="true">/</span>
            <span className="text-zinc-600">
              {view === 'home'
                ? 'Accueil'
                : view === 'contacts'
                  ? 'Contacts'
                  : 'Listes de diffusion'}
            </span>
          </div>
          {view === 'home' && (
            <Home
              model={model}
              href={href}
              identity={identity}
              onContact={setContact}
              onCreateList={() => setListEditor('new')}
              onLogout={logout}
            />
          )}
          {view === 'contacts' && (
            <ContactsPage
              model={model}
              listFilter={listFilter}
              onListFilter={setListFilter}
              onContact={setContact}
              onBulk={(ids, done) => setBulk({ ids, done })}
              onLists={() => navigate('lists')}
              notice={notice}
            />
          )}
          {view === 'lists' && (
            <ListsPage
              model={model}
              onCreate={() => setListEditor('new')}
              onEdit={setListEditor}
              onArchive={setArchive}
              onOpen={(list) => {
                setListFilter(list.id);
                navigate('contacts');
              }}
              notice={notice}
              onNotice={setNotice}
            />
          )}
          <footer className="mt-12 flex flex-wrap justify-between gap-2 border-t border-zinc-950/5 pt-5 text-xs/5 text-zinc-500">
            <span>Agathe Lescout · Ostéopathie animale</span>
            <span>Votre espace personnel</span>
          </footer>
        </div>
      </SidebarLayout>
      <form id="logout-form" method="post" action="/logout" hidden />
      {contact && (
        <ContactDialog
          key={contact.id}
          original={contact}
          model={model}
          onClose={() => setContact(null)}
        />
      )}
      {listEditor && (
        <ListDialog
          key={listEditor === 'new' ? 'new' : listEditor.id}
          list={listEditor === 'new' ? undefined : listEditor}
          model={model}
          onClose={() => setListEditor(null)}
          onSaved={setNotice}
        />
      )}
      {archive && (
        <ArchiveDialog
          list={archive}
          model={model}
          onClose={() => setArchive(null)}
          onSaved={setNotice}
        />
      )}
      {bulk && (
        <BulkDialog
          contactIds={bulk.ids}
          model={model}
          onClose={() => setBulk(null)}
          onSaved={(message) => {
            setNotice(message);
            bulk.done();
          }}
        />
      )}
    </MotionConfig>
  );
}
