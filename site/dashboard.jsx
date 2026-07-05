// Statyczny mock DashboardView z veedeck — 1:1 układ, używa tokenów z CSS vars.
// Używany w kontenerach z różnymi data-theme / .dark żeby pokazać 4 palety.

const I = {
  Briefcase: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/></svg>,
  PictureInPicture: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 4.5V9H4.5"/><path d="M21 9V7a2 2 0 0 0-2-2h-2"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M12 21h3"/><rect x="11" y="12" width="10" height="8" rx="1"/></svg>,
  ShoppingCart: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>,
  Package: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16.5 9.4 7.55 4.24"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>,
  Bell: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>,
  CheckCircle2: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>,
  ChevronRight: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>,
  Pin: (p) => <svg {...p} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg>,
  MapPin: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>,
  MessageSquare: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  RotateCcw: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>,
  CalendarDays: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2v4M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>,
  LayoutDashboard: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>,
  Settings: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>,
  HelpCircle: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>,
  PanelLeftClose: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="m16 15-3-3 3-3"/></svg>,
  Sun: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>,
  Moon: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
  NotebookText: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 6h4M2 10h4M2 14h4M2 18h4"/><rect width="16" height="20" x="4" y="2" rx="2"/><path d="M9.5 8h5M9.5 12h5M9.5 16h3"/></svg>,
  Search: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>,
  Plus: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5v14"/></svg>,
  Check: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>,
  X: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>,
};

// Mock data
const mockProjects = [
  { id: '1', title: 'Apartament Mokotów', clientName: 'Anna Kowalska', pinned: true, renderCount: 12, lastRenderUrl: null, updatedAt: '2h' , hue: 28},
  { id: '2', title: 'Kawiarnia Stary Rynek', clientName: 'Café Bertelli', pinned: false, renderCount: 8, lastRenderUrl: null, updatedAt: '1 dzień', hue: 180 },
  { id: '3', title: 'Biuro Zarządu OMC', clientName: 'OMC Group', pinned: false, renderCount: 24, lastRenderUrl: null, updatedAt: '3 dni', hue: 320 },
];

const mockLists = [
  { id: 'l1', name: 'Oświetlenie — salon', projectTitle: 'Apartament Mokotów', pinned: true, sectionCount: 4, updatedAt: '5h' },
  { id: 'l2', name: 'Meble kuchenne', projectTitle: 'Apartament Mokotów', pinned: false, sectionCount: 2, updatedAt: '2 dni' },
  { id: 'l3', name: 'Dekoracje — lokal', projectTitle: 'Kawiarnia Stary Rynek', pinned: false, sectionCount: 6, updatedAt: '4 dni' },
];

const mockEvents = [
  { id: 'e1', title: 'Prezentacja renderów — Mokotów', type: 'WYDARZENIE', time: '10:00' },
  { id: 'e2', title: 'Wysłać listę do klienta', type: 'ZADANIE', time: '14:30' },
  { id: 'e3', title: 'Odbiór mebli w salonie', type: 'PRZYPOMNIENIE', time: '16:00' },
];

const mockTodos = [
  { type: 'pin', id: 'p1', title: 'Zmienić kolor ściany za kanapą', author: 'Anna Kowalska', ref: 'Salon_v3', when: '18 min. temu' },
  { type: 'status', id: 's1', renderName: 'Kuchnia_v2', client: 'Anna Kowalska', project: 'Apartament Mokotów', when: '1 godz. temu' },
  { type: 'version', id: 'v1', renderName: 'Łazienka_v1', client: 'OMC Group', project: 'Biuro Zarządu OMC', when: '3 godz. temu' },
];

const mockMessages = [
  { type: 'discussion', id: 'm1', content: 'Czy możemy dodać jeszcze jedno ujęcie od strony okna?', author: 'Anna Kowalska', render: 'Salon_v3', project: 'Apartament Mokotów', when: '22 min. temu' },
  { type: 'list', id: 'm2', content: 'Producent potwierdził dostępność — zamawiam.', author: 'Marta (asyst.)', product: 'Lampa Flos IC S2', list: 'Oświetlenie — salon', when: '1 godz. temu' },
  { type: 'discussion', id: 'm3', content: 'Wygląda świetnie, zatwierdzam finał.', author: 'Café Bertelli', render: 'Lokal_widok_3', project: 'Kawiarnia Stary Rynek', when: '5 godz. temu' },
];

const EVENT_COLORS = {
  WYDARZENIE: { bar: '#60a5fa', bg: '#dbeafe', text: '#1d4ed8', label: 'Wydarzenie' },
  ZADANIE: { bar: '#a78bfa', bg: '#ede9fe', text: '#6d28d9', label: 'Zadanie' },
  PRZYPOMNIENIE: { bar: '#fbbf24', bg: '#fef3c7', text: '#b45309', label: 'Przyp.' },
};

function Sidebar() {
  const items = [
    { label: 'Dashboard', icon: I.LayoutDashboard, active: true },
    { label: 'Projekty', icon: I.Briefcase },
    { label: 'ProjectFlow', icon: I.PictureInPicture },
    { label: 'Listy', icon: I.ShoppingCart },
    { label: 'Produkty', icon: I.Package },
    { label: 'Kalendarz', icon: I.CalendarDays },
    { label: 'Notatnik', icon: I.NotebookText },
    { label: 'Dyskusje', icon: I.MessageSquare },
  ];
  return (
    <aside style={{ width: 208, flexShrink: 0, display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--background)' }}>
      <nav style={{ flex: 1, padding: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {items.map((it, i) => {
          const Icon = it.icon;
          return (
            <a key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 10px',
              borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer',
              background: it.active ? 'color-mix(in oklch, var(--primary) 10%, transparent)' : 'transparent',
              color: it.active ? 'var(--primary)' : 'var(--muted-foreground)',
            }}>
              <Icon width={18} height={18} />
              <span>{it.label}</span>
            </a>
          );
        })}
      </nav>
      <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--muted-foreground)', fontSize: 14, fontWeight: 500 }}>
            <I.Sun width={18} height={18} />
            <span>Jasny</span>
          </div>
          <div style={{ position: 'relative', width: 40, height: 20, borderRadius: 999, background: 'color-mix(in oklch, var(--muted-foreground) 30%, transparent)' }}>
            <span style={{ position: 'absolute', top: 2, left: 2, width: 16, height: 16, borderRadius: 999, background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,.2)' }} />
          </div>
        </div>
        <a style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 10px', borderRadius: 8, fontSize: 14, fontWeight: 500, color: 'var(--muted-foreground)', cursor: 'pointer' }}>
          <I.HelpCircle width={18} height={18} /><span>Pomoc</span>
        </a>
        <a style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 10px', borderRadius: 8, fontSize: 14, fontWeight: 500, color: 'var(--muted-foreground)', cursor: 'pointer' }}>
          <I.Settings width={18} height={18} /><span>Ustawienia</span>
        </a>
        <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '8px 10px', borderRadius: 8, color: 'var(--muted-foreground)', background: 'transparent', border: 0, cursor: 'pointer' }}>
          <I.PanelLeftClose width={18} height={18} />
        </button>
      </div>
    </aside>
  );
}

function TopBar({ userName }) {
  return (
    <header style={{
      height: 56, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 16,
      padding: '0 20px', borderBottom: '1px solid var(--border)', background: 'var(--background)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--primary)', display: 'grid', placeItems: 'center', color: 'var(--primary-foreground)', fontWeight: 700, fontSize: 14, letterSpacing: -0.5 }}>v</div>
        <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: -0.3, color: 'var(--foreground)' }}>veedeck</span>
      </div>
      <div style={{ flex: 1, maxWidth: 420, position: 'relative' }}>
        <I.Search width={14} height={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} />
        <input placeholder="Szukaj projektów, renderów, list…" style={{
          width: '100%', height: 34, paddingLeft: 34, paddingRight: 12,
          borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)',
          color: 'var(--foreground)', fontSize: 13, outline: 'none',
        }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button style={{ width: 34, height: 34, display: 'grid', placeItems: 'center', borderRadius: 8, background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted-foreground)', cursor: 'pointer', position: 'relative' }}>
          <I.Bell width={16} height={16} />
          <span style={{ position: 'absolute', top: 6, right: 6, width: 7, height: 7, borderRadius: 999, background: '#ef4444' }} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: 999, background: 'color-mix(in oklch, var(--primary) 20%, var(--card))', display: 'grid', placeItems: 'center', color: 'var(--primary)', fontWeight: 600, fontSize: 12 }}>
            {userName.split(' ').map(w => w[0]).join('').slice(0,2)}
          </div>
        </div>
      </div>
    </header>
  );
}

function ModuleTile({ icon: Icon, label, bg = 'var(--primary)' }) {
  return (
    <a style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
      padding: 12, borderRadius: 12, background: 'var(--card)', border: '1px solid var(--border)',
      cursor: 'pointer',
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12, display: 'grid', placeItems: 'center',
        background: bg, color: '#fff',
        boxShadow: '0 1px 2px rgba(0,0,0,.06)',
      }}>
        <Icon width={24} height={24} />
      </div>
      <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--foreground)', textAlign: 'center', margin: 0, lineHeight: 1.2 }}>{label}</p>
    </a>
  );
}

function StatTile({ icon: Icon, value, label, highlight }) {
  return (
    <a style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12,
      background: highlight ? 'color-mix(in oklch, #f59e0b 12%, var(--card))' : 'var(--card)',
      border: `1px solid ${highlight ? 'color-mix(in oklch, #f59e0b 30%, var(--border))' : 'var(--border)'}`,
      cursor: 'pointer',
    }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: highlight ? 'color-mix(in oklch, #f59e0b 20%, transparent)' : 'color-mix(in oklch, var(--primary) 10%, transparent)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
        <Icon width={16} height={16} style={{ color: highlight ? '#b45309' : 'var(--primary)' }} />
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 20, fontWeight: 700, lineHeight: 1, margin: 0, color: 'var(--foreground)' }}>{value}</p>
        <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: '2px 0 0', whiteSpace: 'nowrap' }}>{label}</p>
      </div>
    </a>
  );
}

function SectionHeader({ title, link = 'Wszystkie' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)', margin: 0 }}>{title}</h2>
      <a style={{ fontSize: 12, color: 'var(--muted-foreground)', display: 'inline-flex', alignItems: 'center', gap: 2, cursor: 'pointer' }}>
        {link} <I.ChevronRight width={13} height={13} />
      </a>
    </div>
  );
}

function ProjectCard({ p }) {
  // Placeholder "render thumbnail" — gradient w tonie projektu
  const grad = `linear-gradient(135deg, hsl(${p.hue} 30% 55%), hsl(${p.hue} 40% 30%))`;
  return (
    <a style={{ display: 'flex', flexDirection: 'column', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--card)', overflow: 'hidden', cursor: 'pointer' }}>
      <div style={{ width: '100%', aspectRatio: '4 / 3', background: grad, position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 30% 20%, rgba(255,255,255,.25), transparent 60%)' }} />
      </div>
      <div style={{ padding: 12 }}>
        <p style={{ fontSize: 13, fontWeight: 500, margin: 0, color: 'var(--foreground)', display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {p.pinned && <I.Pin width={11} height={11} style={{ color: '#ef4444', flexShrink: 0 }} />}
          {p.title}
        </p>
        {p.clientName && <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.clientName}</p>}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{p.renderCount} renderów</span>
          <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{p.updatedAt} temu</span>
        </div>
      </div>
    </a>
  );
}

function ListsRow({ list }) {
  return (
    <a style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer' }}>
      <div style={{ width: 40, height: 40, borderRadius: 8, background: 'color-mix(in oklch, var(--primary) 10%, transparent)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
        <I.ShoppingCart width={18} height={18} style={{ color: 'var(--primary)' }} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{ fontSize: 13, fontWeight: 500, margin: 0, color: 'var(--foreground)', display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {list.pinned && <I.Pin width={10} height={10} style={{ color: '#ef4444', flexShrink: 0 }} />}
          {list.name}
        </p>
        <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {list.projectTitle} · {list.sectionCount} sekcje
        </p>
      </div>
      <span style={{ fontSize: 12, color: 'var(--muted-foreground)', flexShrink: 0 }}>{list.updatedAt}</span>
    </a>
  );
}

function CalendarCard() {
  const today = { weekday: 'piątek', date: '18 kwietnia', day: 18 };
  return (
    <div style={{ borderRadius: 12, border: '1px solid var(--border)', background: 'var(--card)', overflow: 'hidden' }}>
      <div style={{
        padding: '12px 16px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'color-mix(in oklch, var(--primary) 5%, transparent)',
      }}>
        <div>
          <p style={{ fontSize: 11, color: 'var(--muted-foreground)', margin: 0, textTransform: 'capitalize' }}>{today.weekday}</p>
          <p style={{ fontSize: 16, fontWeight: 700, margin: 0, lineHeight: 1.1, color: 'var(--foreground)' }}>{today.date}</p>
        </div>
        <div style={{ width: 40, height: 40, borderRadius: 999, background: 'var(--primary)', display: 'grid', placeItems: 'center' }}>
          <span style={{ color: 'var(--primary-foreground)', fontSize: 14, fontWeight: 700 }}>{today.day}</span>
        </div>
      </div>
      <div>
        {mockEvents.map((ev, i) => {
          const c = EVENT_COLORS[ev.type];
          return (
            <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderTop: i === 0 ? 0 : '1px solid var(--border)' }}>
              <div style={{ width: 4, height: 32, borderRadius: 999, background: c.bar, flexShrink: 0 }} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 500, margin: 0, color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.title}</p>
                <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: '2px 0 0' }}>{ev.time}</p>
              </div>
              <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 6px', borderRadius: 6, background: c.bg, color: c.text, flexShrink: 0 }}>{c.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MessageRow({ m }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', borderTop: '1px solid var(--border)' }}>
      <a style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', flex: 1, minWidth: 0, cursor: 'pointer' }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'color-mix(in oklch, var(--primary) 10%, transparent)', display: 'grid', placeItems: 'center', flexShrink: 0, marginTop: 2 }}>
          {m.type === 'discussion'
            ? <I.MessageSquare width={15} height={15} style={{ color: 'var(--primary)' }} />
            : <I.ShoppingCart width={15} height={15} style={{ color: 'var(--primary)' }} />}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 500, margin: 0, color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.content}</p>
          <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {m.type === 'discussion' ? `${m.author} · ${m.render} · ${m.project}` : `${m.author} · ${m.product} · ${m.list}`}
          </p>
        </div>
        <span style={{ fontSize: 12, color: 'var(--muted-foreground)', flexShrink: 0, marginRight: 8 }}>{m.when}</span>
      </a>
      <button style={{ marginRight: 10, padding: 4, borderRadius: 6, border: 0, background: 'transparent', color: 'color-mix(in oklch, var(--muted-foreground) 40%, transparent)', cursor: 'pointer', flexShrink: 0 }}>
        <I.CheckCircle2 width={16} height={16} />
      </button>
    </div>
  );
}

function TodoRow({ t }) {
  if (t.type === 'pin') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', borderTop: '1px solid var(--border)' }}>
        <a style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', flex: 1, minWidth: 0, cursor: 'pointer' }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'color-mix(in oklch, var(--primary) 10%, transparent)', display: 'grid', placeItems: 'center', flexShrink: 0, marginTop: 2 }}>
            <I.MapPin width={15} height={15} style={{ color: 'var(--primary)' }} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 500, margin: 0, color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</p>
            <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: '2px 0 0' }}>{t.author} · {t.ref}</p>
          </div>
          <span style={{ fontSize: 12, color: 'var(--muted-foreground)', flexShrink: 0, marginRight: 8 }}>{t.when}</span>
        </a>
        <button style={{ marginRight: 10, padding: 4, borderRadius: 6, border: 0, background: 'transparent', color: 'color-mix(in oklch, var(--muted-foreground) 40%, transparent)', cursor: 'pointer' }}>
          <I.CheckCircle2 width={16} height={16} />
        </button>
      </div>
    );
  }
  const isStatus = t.type === 'status';
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8, flexShrink: 0, marginTop: 2,
        background: isStatus ? '#fef3c7' : '#ede9fe',
        display: 'grid', placeItems: 'center',
      }}>
        {isStatus ? <I.Bell width={15} height={15} style={{ color: '#b45309' }} /> : <I.RotateCcw width={15} height={15} style={{ color: '#6d28d9' }} />}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{ fontSize: 13, fontWeight: 500, margin: 0, color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.renderName}</p>
        <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {t.client} · {isStatus ? 'Zmiana statusu' : 'Przywrócenie wersji'} · {t.project}
        </p>
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          <button style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500, background: '#16a34a', color: '#fff', border: 0, cursor: 'pointer' }}>
            <I.Check width={11} height={11} />{isStatus ? 'Potwierdź' : 'Przywróć'}
          </button>
          <button style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500, background: 'transparent', color: '#dc2626', border: '1px solid #fecaca', cursor: 'pointer' }}>
            <I.X width={11} height={11} />Odrzuć
          </button>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
        <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{t.when}</span>
        <button style={{ padding: 4, borderRadius: 6, border: 0, background: 'transparent', color: 'color-mix(in oklch, var(--muted-foreground) 40%, transparent)', cursor: 'pointer' }}>
          <I.CheckCircle2 width={16} height={16} />
        </button>
      </div>
    </div>
  );
}

function DashboardMock({ userName = 'Dominik' }) {
  return (
    <div style={{
      display: 'flex', width: '100%', height: '100%',
      background: 'var(--background)',
      color: 'var(--foreground)',
      fontFamily: '"DM Sans", ui-sans-serif, system-ui, sans-serif',
    }}>
      <Sidebar />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--border)' }}>
        <TopBar userName={userName} />
        <main style={{ flex: 1, overflow: 'hidden', padding: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Welcome + new project */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif', letterSpacing: -0.4 }}>
                Witaj, {userName} 👋
              </h1>
              <button style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                borderRadius: 8, background: 'var(--primary)', color: 'var(--primary-foreground)',
                border: 0, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>
                <I.Plus width={14} height={14} /> Nowy projekt
              </button>
            </div>

            {/* Moduły */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 2, color: 'var(--muted-foreground)', margin: '0 0 12px' }}>Moduły</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
                <ModuleTile icon={I.Briefcase} label="Projekty" />
                <ModuleTile icon={I.PictureInPicture} label="ProjectFlow" />
                <ModuleTile icon={I.ShoppingCart} label="Listy" />
                <ModuleTile icon={I.Package} label="Produkty" bg="#7c3aed" />
              </div>
            </div>

            {/* Main grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
              {/* LEFT COLUMN */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                  <StatTile icon={I.Briefcase} value="12" label="Projektów" />
                  <StatTile icon={I.PictureInPicture} value="143" label="Renderów" />
                  <StatTile icon={I.ShoppingCart} value="8" label="List zakupowych" />
                  <StatTile icon={I.Bell} value="3" label="Powiadomień" highlight />
                </div>

                {/* Projekty */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <SectionHeader title="Ostatnie projekty ProjectFlow" />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                    {mockProjects.map(p => <ProjectCard key={p.id} p={p} />)}
                  </div>
                </div>

                {/* Listy */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <SectionHeader title="Ostatnie listy zakupowe" />
                  <div style={{ borderRadius: 12, border: '1px solid var(--border)', background: 'var(--card)', overflow: 'hidden' }}>
                    {mockLists.map((l, i) => (
                      <div key={l.id} style={{ borderTop: i === 0 ? 0 : '1px solid var(--border)' }}>
                        <ListsRow list={l} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {/* Kalendarz */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <SectionHeader title="Kalendarz — dziś" link="Otwórz" />
                  <CalendarCard />
                </div>

                {/* Nieprzeczytane */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)', margin: 0 }}>Nieprzeczytane wiadomości</h2>
                    <I.HelpCircle width={13} height={13} style={{ color: 'color-mix(in oklch, var(--muted-foreground) 50%, transparent)' }} />
                  </div>
                  <div style={{ borderRadius: 12, border: '1px solid var(--border)', background: 'var(--card)', overflow: 'hidden' }}>
                    {mockMessages.map(m => <MessageRow key={m.id} m={m} />)}
                  </div>
                </div>

                {/* Do zrobienia */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)', margin: 0 }}>Do zrobienia</h2>
                    <I.HelpCircle width={13} height={13} style={{ color: 'color-mix(in oklch, var(--muted-foreground) 50%, transparent)' }} />
                  </div>
                  <div style={{ borderRadius: 12, border: '1px solid var(--border)', background: 'var(--card)', overflow: 'hidden' }}>
                    {mockTodos.map(t => <TodoRow key={t.id} t={t} />)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

Object.assign(window, { DashboardMock });
