import { useEffect, useState } from 'react';
import { MotionConfig } from 'motion/react';
import {
  ArrowTopRightOnSquareIcon,
  ArrowRightStartOnRectangleIcon,
  ChevronUpIcon,
  HomeIcon,
  UserGroupIcon,
  EnvelopeIcon,
  TagIcon,
} from '@heroicons/react/20/solid';
import type { GoogleContact, MailingList } from '../contact-types';
import { useContacts, type ContactsTransport } from './contacts-model';
import {
  ArchiveDialog,
  BulkDialog,
  ContactDialog,
  ListDialog,
} from './contact-dialogs';
import { ContactsPage } from './contacts-page';
import { ListsPage } from './lists-page';
import { HomePage } from './home-page';
import { Avatar } from './ui/avatar';
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
import { Heading } from './ui/heading';
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
import { Text } from './ui/text';

type View = 'home' | 'contacts' | 'lists';
export interface AppIdentity {
  email: string;
  name: string;
}

function readView(preview: boolean, initial: 'home' | 'contacts'): View {
  if (window.location.hash === '#listes') return 'lists';
  if (preview)
    return ['#home', '#agenda-calendar', '#day-agenda-title'].includes(
      window.location.hash
    )
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
  hostedPreview = false,
  localPreviewCopy = false,
  transport,
  offline,
}: {
  identity: AppIdentity;
  initial: 'home' | 'contacts';
  preview: boolean;
  hostedPreview?: boolean;
  localPreviewCopy?: boolean;
  offline: boolean;
  transport: ContactsTransport;
}) {
  const model = useContacts(transport);
  const [view, setView] = useState<View>(() => readView(preview, initial));
  const [notice, setNotice] = useState('');
  const [contact, setContact] = useState<GoogleContact | null>(null);
  const openContact = (selected: GoogleContact) => {
    model.cancelRefresh();
    setContact(selected);
  };
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
        ? ['#home', '#contacts', '#listes']
        : ['/', '/contacts', '/contacts#listes'];
      if (!address || !allowed.includes(address)) return;
      event.preventDefault();
      window.history.pushState(null, '', address);
      route();
      window.scrollTo(0, 0);
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
  }, [view]);

  useEffect(() => {
    if (
      model.listsReady &&
      listFilter &&
      listFilter !== '__unassigned' &&
      !model.lists.lists.some((list) => list.id === listFilter)
    )
      setListFilter('');
  }, [model.listsReady, model.lists.lists, listFilter]);

  const accountMenuContents = (
    <>
      <DropdownHeader>
        <div className="text-xs/5 text-zinc-500">Connectée avec Google</div>
        <div className="text-sm/6 font-medium">{identity.name}</div>
        <div className="text-xs/5 text-zinc-500">{identity.email}</div>
      </DropdownHeader>
      <DropdownDivider />
      <DropdownItem onClick={logout}>
        <ArrowRightStartOnRectangleIcon />
        <DropdownLabel>Se déconnecter</DropdownLabel>
      </DropdownItem>
    </>
  );
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
      <DropdownMenu anchor="top start">{accountMenuContents}</DropdownMenu>
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
            <Dropdown>
              <DropdownButton as={NavbarItem} aria-label="Votre compte">
                <Avatar
                  initials="AL"
                  className="size-8 bg-green-100 text-green-800"
                />
              </DropdownButton>
              <DropdownMenu anchor="bottom end">
                {accountMenuContents}
              </DropdownMenu>
            </Dropdown>
          </Navbar>
        }
      >
        <div id="main" tabIndex={-1}>
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
            <HomePage
              model={model}
              refreshEnabled={contact === null}
              onContact={openContact}
            />
          )}
          {view === 'contacts' && (
            <ContactsPage
              source={
                localPreviewCopy || hostedPreview
                  ? 'copy'
                  : preview
                    ? 'demo'
                    : 'google'
              }
              model={model}
              listFilter={listFilter}
              onListFilter={setListFilter}
              onContact={openContact}
              onBulk={(ids, done) => setBulk({ ids, done })}
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
          {view !== 'home' && (
            <footer className="mt-12 flex flex-wrap justify-between gap-2 border-t border-zinc-950/5 pt-5 text-xs/5 text-zinc-500">
              <span>Agathe Lescout · Ostéopathie animale</span>
              <span>Votre espace personnel</span>
            </footer>
          )}
        </div>
      </SidebarLayout>
      <form id="logout-form" method="post" action="/logout" hidden />
      {contact && (
        <ContactDialog
          source={
            localPreviewCopy || hostedPreview
              ? 'copy'
              : preview
                ? 'demo'
                : 'google'
          }
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
