/**
 * veedeck — Moodboard: definicje szablonów
 *
 * Jedno źródło prawdy dla 10 szablonów moodboardów.
 * Wszystkie współrzędne są znormalizowane (0–1) względem szerokości/wysokości canvasu.
 * Szczegóły interpretacji pól: patrz moodboard-templates-spec.md.
 */

export type SlotRole = 'image' | 'swatch' | 'text' | 'cutout';
export type SlotShape = 'rect' | 'circle';
export type TemplateCategory = 'grid' | 'freeform' | 'flatlay';

export interface LocalizedText {
  pl: string;
  en: string;
}

export interface TemplateSlot {
  id: string;
  role: SlotRole;
  shape: SlotShape;
  /** lewy górny róg, ułamek szerokości canvasu */
  x: number;
  /** lewy górny róg, ułamek wysokości canvasu */
  y: number;
  /**
   * rect: szerokość jako ułamek szerokości canvasu.
   * circle: ŚREDNICA jako ułamek szerokości canvasu (renderer wymusza koło w px; pole `h` pomijane).
   */
  w: number;
  /** rect: wysokość jako ułamek wysokości canvasu; circle: pomijane */
  h?: number;
  /** rotacja w stopniach, wokół środka slotu; domyślnie 0 */
  rotation?: number;
  /** kolejność warstw; wyższe = bliżej widza; domyślnie 0 */
  z?: number;
  /** etykieta roli pokazywana w pustym placeholderze */
  label?: LocalizedText;
}

export interface MoodboardTemplate {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  category: TemplateCategory;
  /** proporcja canvasu: szerokość / wysokość */
  aspectRatio: number;
  slots: TemplateSlot[];
  /**
   * Kolor tła canvasu (hex). Brak = białe tło.
   * Tło jest częścią kompozycji: edytowalne przez użytkownika, zapisywane z projektem, uwzględniane w eksporcie.
   */
  background?: string;
}

/** Wspólne domyślne tło rodziny flat lay (ciepły greige) — jedna seria, jeden nastrój */
const FLAT_LAY_BG = '#C9C0B2';

const PORTRAIT = 0.75; // 3:4, jak plansze A4/print i inspiracje

export const MOODBOARD_TEMPLATES: MoodboardTemplate[] = [
  // ────────────────────────────────────────────
  // SIATKI KLASYCZNE (category: 'grid')
  // ────────────────────────────────────────────
  {
    id: 'hero-satellites',
    name: { pl: 'Hero + satelity', en: 'Hero + satellites' },
    description: {
      pl: 'Jeden dominujący kafel i cztery mniejsze wokół. Wymusza hierarchię — klient od razu widzi serce koncepcji.',
      en: 'One dominant tile with four smaller ones around it. Enforces hierarchy — the client sees the heart of the concept instantly.',
    },
    category: 'grid',
    aspectRatio: PORTRAIT,
    slots: [
      { id: 'hero', role: 'image', shape: 'rect', x: 0.06, y: 0.06, w: 0.52, h: 0.88, label: { pl: 'Główna inspiracja', en: 'Key inspiration' } },
      { id: 'sat-1', role: 'image', shape: 'rect', x: 0.60, y: 0.06, w: 0.16, h: 0.43, label: { pl: 'Oświetlenie', en: 'Lighting' } },
      { id: 'sat-2', role: 'image', shape: 'rect', x: 0.78, y: 0.06, w: 0.16, h: 0.43, label: { pl: 'Tkanina', en: 'Fabric' } },
      { id: 'sat-3', role: 'image', shape: 'rect', x: 0.60, y: 0.51, w: 0.16, h: 0.43, label: { pl: 'Dodatek', en: 'Accessory' } },
      { id: 'sat-4', role: 'image', shape: 'rect', x: 0.78, y: 0.51, w: 0.16, h: 0.43, label: { pl: 'Detal', en: 'Detail' } },
    ],
  },
  {
    id: 'classic-3x3',
    name: { pl: 'Klasyczna 3×3', en: 'Classic 3×3' },
    description: {
      pl: 'Dziewięć równych pól bez hierarchii. Idealna na wczesny etap zbierania kierunków i eksport 1:1 do social mediów.',
      en: 'Nine equal tiles with no hierarchy. Ideal for early direction-gathering and 1:1 social media exports.',
    },
    category: 'grid',
    aspectRatio: 1, // kwadrat — gotowy pod Instagram
    slots: [0, 1, 2]
      .flatMap((row) =>
        [0, 1, 2].map((col) => ({
          id: `cell-${row}-${col}`,
          role: 'image' as SlotRole,
          shape: 'rect' as SlotShape,
          x: 0.06 + col * 0.30,
          y: 0.06 + row * 0.30,
          w: 0.28,
          h: 0.28,
        })),
      ),
  },
  {
    id: 'material-palette',
    name: { pl: 'Paleta materiałów', en: 'Material palette' },
    description: {
      pl: 'Szeroki kadr nastrojowy u góry i rząd pięciu próbek materiałów pod spodem. Plansza warsztatowa — dla klienta i wykonawcy.',
      en: 'A wide mood image on top with a row of five material samples below. A working board — for the client and the contractor.',
    },
    category: 'grid',
    aspectRatio: PORTRAIT,
    slots: [
      { id: 'mood', role: 'image', shape: 'rect', x: 0.06, y: 0.06, w: 0.88, h: 0.55, label: { pl: 'Kadr nastrojowy', en: 'Mood shot' } },
      { id: 'sw-1', role: 'swatch', shape: 'rect', x: 0.06, y: 0.65, w: 0.16, h: 0.29, label: { pl: 'Kolor wiodący', en: 'Lead color' } },
      { id: 'sw-2', role: 'image', shape: 'rect', x: 0.24, y: 0.65, w: 0.16, h: 0.29, label: { pl: 'Drewno', en: 'Wood' } },
      { id: 'sw-3', role: 'image', shape: 'rect', x: 0.42, y: 0.65, w: 0.16, h: 0.29, label: { pl: 'Kamień', en: 'Stone' } },
      { id: 'sw-4', role: 'image', shape: 'rect', x: 0.60, y: 0.65, w: 0.16, h: 0.29, label: { pl: 'Tkanina', en: 'Fabric' } },
      { id: 'sw-5', role: 'image', shape: 'rect', x: 0.78, y: 0.65, w: 0.16, h: 0.29, label: { pl: 'Metal', en: 'Metal' } },
    ],
  },
  {
    id: 'asymmetric-collage',
    name: { pl: 'Kolaż asymetryczny', en: 'Asymmetric collage' },
    description: {
      pl: 'Układ masonry o zróżnicowanych wysokościach. Organiczny, dobry gdy elementy mają różne proporcje.',
      en: 'A masonry layout with varied heights. Organic — great when elements have different proportions.',
    },
    category: 'grid',
    aspectRatio: PORTRAIT,
    slots: [
      { id: 'c1-a', role: 'image', shape: 'rect', x: 0.06, y: 0.06, w: 0.28, h: 0.50 },
      { id: 'c1-b', role: 'image', shape: 'rect', x: 0.06, y: 0.58, w: 0.28, h: 0.36 },
      { id: 'c2-a', role: 'image', shape: 'rect', x: 0.36, y: 0.06, w: 0.28, h: 0.32 },
      { id: 'c2-b', role: 'image', shape: 'rect', x: 0.36, y: 0.40, w: 0.28, h: 0.54 },
      { id: 'c3-a', role: 'image', shape: 'rect', x: 0.66, y: 0.06, w: 0.28, h: 0.58 },
      { id: 'c3-b', role: 'image', shape: 'rect', x: 0.66, y: 0.66, w: 0.28, h: 0.28 },
    ],
  },
  {
    id: 'split-samples',
    name: { pl: '50/50 + próbki', en: '50/50 + samples' },
    description: {
      pl: 'Lewa połowa na zdjęcie przewodnie, prawa dzielona na kadr uzupełniający i trzy próbki. Kompaktowa — mieści się na jednym slajdzie.',
      en: 'Left half for the lead image, right half split into a supporting shot and three samples. Compact — fits a single slide.',
    },
    category: 'grid',
    aspectRatio: PORTRAIT,
    slots: [
      { id: 'lead', role: 'image', shape: 'rect', x: 0.06, y: 0.06, w: 0.44, h: 0.88, label: { pl: 'Zdjęcie przewodnie', en: 'Lead image' } },
      { id: 'support', role: 'image', shape: 'rect', x: 0.52, y: 0.06, w: 0.42, h: 0.55, label: { pl: 'Kadr uzupełniający', en: 'Supporting shot' } },
      { id: 'sw-1', role: 'swatch', shape: 'rect', x: 0.52, y: 0.65, w: 0.127, h: 0.29 },
      { id: 'sw-2', role: 'swatch', shape: 'rect', x: 0.667, y: 0.65, w: 0.127, h: 0.29 },
      { id: 'sw-3', role: 'swatch', shape: 'rect', x: 0.814, y: 0.65, w: 0.127, h: 0.29 },
    ],
  },

  // ────────────────────────────────────────────
  // KOLAŻE SWOBODNE (category: 'freeform')
  // ────────────────────────────────────────────
  {
    id: 'cascade',
    name: { pl: 'Kaskada', en: 'Cascade' },
    description: {
      pl: 'Trzy kafle schodzące po przekątnej, każdy nachodzi na róg poprzedniego. Prowadzi wzrok od nastroju do detalu.',
      en: 'Three tiles stepping down the diagonal, each overlapping the previous corner. Leads the eye from mood to detail.',
    },
    category: 'freeform',
    aspectRatio: PORTRAIT,
    slots: [
      { id: 'img-1', role: 'image', shape: 'rect', x: 0.08, y: 0.07, w: 0.38, h: 0.26, z: 1 },
      { id: 'img-2', role: 'image', shape: 'rect', x: 0.28, y: 0.26, w: 0.42, h: 0.28, z: 2 },
      { id: 'img-3', role: 'image', shape: 'rect', x: 0.50, y: 0.48, w: 0.40, h: 0.28, z: 3 },
      { id: 'dot-1', role: 'swatch', shape: 'circle', x: 0.72, y: 0.08, w: 0.07, z: 1 },
      { id: 'dot-2', role: 'swatch', shape: 'circle', x: 0.83, y: 0.08, w: 0.07, z: 1 },
      { id: 'dot-3', role: 'swatch', shape: 'circle', x: 0.83, y: 0.17, w: 0.07, z: 1 },
      { id: 'caption', role: 'text', shape: 'rect', x: 0.08, y: 0.80, w: 0.36, h: 0.10, z: 1, label: { pl: 'Podpis koncepcji', en: 'Concept caption' } },
    ],
  },
  {
    id: 'circle-mosaic',
    name: { pl: 'Koło + mozaika', en: 'Circle + mosaic' },
    description: {
      pl: 'Duże koło zachodzące na kafle prostokątne, tytuł u góry i kropki palety na dole. Najbliższy stylowi editorial.',
      en: 'A large circle overlapping rectangular tiles, a title on top and palette dots at the bottom. Closest to the editorial style.',
    },
    category: 'freeform',
    aspectRatio: PORTRAIT,
    slots: [
      { id: 'title', role: 'text', shape: 'rect', x: 0.28, y: 0.04, w: 0.56, h: 0.08, z: 1, label: { pl: 'Tytuł koncepcji', en: 'Concept title' } },
      { id: 'img-1', role: 'image', shape: 'rect', x: 0.34, y: 0.14, w: 0.46, h: 0.30, z: 1 },
      { id: 'circle', role: 'image', shape: 'circle', x: 0.10, y: 0.10, w: 0.34, z: 2, label: { pl: 'Tekstura / klimat', en: 'Texture / mood' } },
      { id: 'img-2', role: 'image', shape: 'rect', x: 0.46, y: 0.48, w: 0.42, h: 0.30, z: 2 },
      { id: 'img-3', role: 'image', shape: 'rect', x: 0.14, y: 0.55, w: 0.30, h: 0.20, z: 1 },
      { id: 'dot-1', role: 'swatch', shape: 'circle', x: 0.10, y: 0.86, w: 0.08, z: 1 },
      { id: 'dot-2', role: 'swatch', shape: 'circle', x: 0.21, y: 0.86, w: 0.08, z: 1 },
      { id: 'dot-3', role: 'swatch', shape: 'circle', x: 0.32, y: 0.86, w: 0.08, z: 1 },
    ],
  },
  {
    id: 'central-layers',
    name: { pl: 'Warstwy centralne', en: 'Central layers' },
    description: {
      pl: 'Dominujący kafel w centrum i dwa mniejsze zawieszone na jego rogach — różny z-index daje głębię. Dużo światła, galeryjny charakter.',
      en: 'A dominant central tile with two smaller ones hung on its corners — varied z-index adds depth. Lots of whitespace, gallery feel.',
    },
    category: 'freeform',
    aspectRatio: PORTRAIT,
    slots: [
      { id: 'center', role: 'image', shape: 'rect', x: 0.24, y: 0.28, w: 0.52, h: 0.40, z: 2, label: { pl: 'Główna inspiracja', en: 'Key inspiration' } },
      { id: 'top-left', role: 'image', shape: 'rect', x: 0.12, y: 0.16, w: 0.30, h: 0.24, z: 3 },
      { id: 'bottom-right', role: 'image', shape: 'rect', x: 0.62, y: 0.56, w: 0.30, h: 0.24, z: 1 },
      { id: 'caption', role: 'text', shape: 'rect', x: 0.24, y: 0.74, w: 0.52, h: 0.08, z: 1, label: { pl: 'Cytat / podpis', en: 'Quote / caption' } },
    ],
  },
  {
    id: 'polaroids',
    name: { pl: 'Rozrzucone polaroidy', en: 'Scattered polaroids' },
    description: {
      pl: 'Kafle z lekkimi rotacjami nachodzące na siebie jak zdjęcia rzucone na stół. Na plansze lifestyle i mniej formalne prezentacje.',
      en: 'Slightly rotated tiles overlapping like photos tossed on a table. For lifestyle boards and less formal presentations.',
    },
    category: 'freeform',
    aspectRatio: PORTRAIT,
    slots: [
      { id: 'p-1', role: 'image', shape: 'rect', x: 0.10, y: 0.12, w: 0.34, h: 0.34, rotation: -5, z: 1 },
      { id: 'p-2', role: 'image', shape: 'rect', x: 0.36, y: 0.22, w: 0.36, h: 0.38, rotation: 4, z: 3 },
      { id: 'p-3', role: 'image', shape: 'rect', x: 0.60, y: 0.14, w: 0.30, h: 0.32, rotation: -3, z: 2 },
      { id: 'p-4', role: 'image', shape: 'rect', x: 0.22, y: 0.52, w: 0.34, h: 0.32, rotation: 3, z: 2 },
      { id: 'dot-1', role: 'swatch', shape: 'circle', x: 0.62, y: 0.64, w: 0.07, z: 1 },
      { id: 'dot-2', role: 'swatch', shape: 'circle', x: 0.73, y: 0.64, w: 0.07, z: 1 },
      { id: 'dot-3', role: 'swatch', shape: 'circle', x: 0.84, y: 0.64, w: 0.07, z: 1 },
      { id: 'caption', role: 'text', shape: 'rect', x: 0.10, y: 0.86, w: 0.44, h: 0.08, z: 1, label: { pl: 'Podpis koncepcji', en: 'Concept caption' } },
    ],
  },
  {
    id: 'vertical-axis',
    name: { pl: 'Oś pionowa', en: 'Vertical axis' },
    description: {
      pl: 'Asymetria premium: kropki palety w lewym górnym rogu, kolumna nachodzących kafli po prawej, lewy dół celowo pusty — na grafikę liniową i odręczny tytuł.',
      en: 'Premium asymmetry: palette dots top-left, a column of overlapping tiles on the right, bottom-left deliberately empty — for line art and a handwritten title.',
    },
    category: 'freeform',
    aspectRatio: PORTRAIT,
    slots: [
      { id: 'dot-1', role: 'swatch', shape: 'circle', x: 0.10, y: 0.08, w: 0.08, z: 1 },
      { id: 'dot-2', role: 'swatch', shape: 'circle', x: 0.21, y: 0.08, w: 0.08, z: 1 },
      { id: 'dot-3', role: 'swatch', shape: 'circle', x: 0.10, y: 0.155, w: 0.08, z: 1 },
      { id: 'dot-4', role: 'swatch', shape: 'circle', x: 0.21, y: 0.155, w: 0.08, z: 1 },
      { id: 'lineart', role: 'image', shape: 'rect', x: 0.10, y: 0.28, w: 0.16, h: 0.42, z: 1, label: { pl: 'Grafika liniowa', en: 'Line art' } },
      { id: 'img-1', role: 'image', shape: 'rect', x: 0.52, y: 0.10, w: 0.38, h: 0.24, z: 1 },
      { id: 'img-2', role: 'image', shape: 'rect', x: 0.40, y: 0.28, w: 0.42, h: 0.26, z: 2 },
      { id: 'img-3', role: 'image', shape: 'rect', x: 0.56, y: 0.50, w: 0.36, h: 0.22, z: 3 },
      { id: 'title', role: 'text', shape: 'rect', x: 0.08, y: 0.80, w: 0.42, h: 0.12, z: 1, label: { pl: 'Tytuł koncepcji', en: 'Concept title' } },
    ],
  },
  // ────────────────────────────────────────────
  // RODZINA FLAT LAY (category: 'flatlay', wspólne tonowane tło)
  // Zbite klastry próbek, nachodzenia 30–50%, wycinany obiekt na wierzchu.
  // ────────────────────────────────────────────
  {
    id: 'flatlay-cluster',
    name: { pl: 'Flat lay: klaster', en: 'Flat lay: cluster' },
    description: {
      pl: 'Zbity klaster próbek materiałów jak na fizycznym stole: duża płyta w centrum, mniejsze próbki wokół, wycinany obiekt na wierzchu i okrągłe próbki spadające z rogu.',
      en: 'A tight cluster of material samples as on a physical table: a large slab in the center, smaller samples around it, a cutout object on top and round samples spilling off the corner.',
    },
    category: 'flatlay',
    aspectRatio: 0.75,
    slots: [
      { id: 'slats', role: 'image', shape: 'rect', x: 0.22, y: 0.24, w: 0.26, h: 0.28, z: 1, label: { pl: 'Płytki / lamele', en: 'Tiles / slats' } },
      { id: 'plaster', role: 'image', shape: 'rect', x: 0.18, y: 0.46, w: 0.22, h: 0.24, z: 2, label: { pl: 'Tynk / farba', en: 'Plaster / paint' } },
      { id: 'wood-right', role: 'image', shape: 'rect', x: 0.64, y: 0.26, w: 0.22, h: 0.34, z: 2, label: { pl: 'Drewno', en: 'Wood' } },
      { id: 'slab', role: 'image', shape: 'rect', x: 0.38, y: 0.32, w: 0.34, h: 0.40, z: 3, label: { pl: 'Płyta kamienna', en: 'Stone slab' } },
      { id: 'wood-small', role: 'image', shape: 'rect', x: 0.30, y: 0.60, w: 0.18, h: 0.16, z: 4, label: { pl: 'Detal', en: 'Detail' } },
      { id: 'accent', role: 'cutout', shape: 'rect', x: 0.50, y: 0.44, w: 0.18, h: 0.34, z: 5, label: { pl: 'Armatura / obiekt', en: 'Fixture / object' } },
      { id: 'ball-1', role: 'image', shape: 'circle', x: 0.17, y: 0.18, w: 0.11, z: 2, label: { pl: 'Próbka', en: 'Sample' } },
      { id: 'ball-2', role: 'swatch', shape: 'circle', x: 0.21, y: 0.28, w: 0.08, z: 3 },
      { id: 'caption', role: 'text', shape: 'rect', x: 0.28, y: 0.84, w: 0.44, h: 0.06, z: 1, label: { pl: 'Podpis koncepcji', en: 'Concept caption' } },
    ],
  },
  {
    id: 'flatlay-diagonal',
    name: { pl: 'Flat lay: diagonala', en: 'Flat lay: diagonal' },
    description: {
      pl: 'Klaster próbek ułożony ciasno po przekątnej planszy, z małą doklejką na wierzchu górnej pary i wycinanym obiektem spinającym środek. Dynamiczny, bez światła między kaflami.',
      en: 'A sample cluster laid tightly along the board diagonal, with a small piece pinned on the upper pair and a cutout object tying the middle together. Dynamic, no gaps between tiles.',
    },
    category: 'flatlay',
    aspectRatio: 0.75,
    slots: [
      { id: 's-1', role: 'image', shape: 'rect', x: 0.10, y: 0.10, w: 0.34, h: 0.16, z: 1 },
      { id: 's-2', role: 'image', shape: 'rect', x: 0.26, y: 0.21, w: 0.36, h: 0.18, z: 2 },
      { id: 'pin', role: 'image', shape: 'rect', x: 0.38, y: 0.14, w: 0.22, h: 0.11, z: 3, label: { pl: 'Detal', en: 'Detail' } },
      { id: 's-3', role: 'image', shape: 'rect', x: 0.42, y: 0.33, w: 0.34, h: 0.18, z: 4 },
      { id: 's-4', role: 'image', shape: 'rect', x: 0.56, y: 0.45, w: 0.32, h: 0.16, z: 5 },
      { id: 'accent', role: 'cutout', shape: 'rect', x: 0.48, y: 0.26, w: 0.12, h: 0.30, z: 6, label: { pl: 'Armatura / obiekt', en: 'Fixture / object' } },
      { id: 'dot-1', role: 'swatch', shape: 'circle', x: 0.78, y: 0.10, w: 0.10, z: 1 },
      { id: 'dot-2', role: 'swatch', shape: 'circle', x: 0.84, y: 0.19, w: 0.07, z: 1 },
      { id: 'caption', role: 'text', shape: 'rect', x: 0.10, y: 0.82, w: 0.38, h: 0.06, z: 1, label: { pl: 'Podpis koncepcji', en: 'Concept caption' } },
    ],
  },
  {
    id: 'flatlay-dominant',
    name: { pl: 'Flat lay: dominanta', en: 'Flat lay: dominant' },
    description: {
      pl: 'Jedna duża płyta jako baza (materiał przewodni projektu), a na jej krawędziach przypięte cztery mniejsze próbki — każda częściowo na płycie, częściowo na tle. Wycinany obiekt na środku płyty jako focus.',
      en: 'One large slab as the base (the project lead material) with four smaller samples pinned to its edges — each partly on the slab, partly on the background. A cutout object centered on the slab as the focus.',
    },
    category: 'flatlay',
    aspectRatio: 0.75,
    slots: [
      { id: 'base', role: 'image', shape: 'rect', x: 0.20, y: 0.18, w: 0.60, h: 0.48, z: 1, label: { pl: 'Materiał przewodni', en: 'Lead material' } },
      { id: 'sat-tr', role: 'image', shape: 'rect', x: 0.66, y: 0.10, w: 0.26, h: 0.18, z: 2 },
      { id: 'sat-l', role: 'image', shape: 'rect', x: 0.10, y: 0.26, w: 0.24, h: 0.22, z: 2 },
      { id: 'sat-br', role: 'image', shape: 'rect', x: 0.62, y: 0.54, w: 0.28, h: 0.20, z: 2 },
      { id: 'sat-bl', role: 'image', shape: 'rect', x: 0.16, y: 0.56, w: 0.20, h: 0.15, z: 2 },
      { id: 'accent', role: 'cutout', shape: 'rect', x: 0.42, y: 0.28, w: 0.16, h: 0.34, z: 3, label: { pl: 'Armatura / obiekt', en: 'Fixture / object' } },
      { id: 'dot-1', role: 'swatch', shape: 'circle', x: 0.84, y: 0.32, w: 0.10, z: 2 },
      { id: 'dot-2', role: 'swatch', shape: 'circle', x: 0.88, y: 0.41, w: 0.07, z: 2 },
      { id: 'caption', role: 'text', shape: 'rect', x: 0.28, y: 0.84, w: 0.44, h: 0.06, z: 1, label: { pl: 'Podpis koncepcji', en: 'Concept caption' } },
    ],
  },
];

export default MOODBOARD_TEMPLATES;
