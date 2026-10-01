/** Small inline icon set (1.75px strokes, 20px box). */
const paths: Record<string, string> = {
  today: 'M3 9l7-5.5L17 9v8H3zM8 17v-5h4v5',
  calendar: 'M4 5h12v11H4zM4 8h12M7 3v3M13 3v3M7 11h1M10 11h1M13 11h1M7 13.5h1M10 13.5h1',
  tracker: 'M3.5 3.5h5v5h-5zM11.5 3.5h5v5h-5zM3.5 11.5h5v5h-5zM11.5 11.5h5v5h-5zM4.8 6l1.2 1.2 1.8-2.2M12.8 14l1.2 1.2 1.8-2.2',
  left: 'M12 5l-5 5 5 5',
  right: 'M8 5l5 5-5 5',
  more: 'M5 10h.01M10 10h.01M15 10h.01',
  timeline: 'M6 4v12M6 6h8M6 10h6M6 14h9',
  projects: 'M3 6h5l2 2h7v8H3z',
  tasks: 'M4 6l2 2 3-3M11 7h6M4 13l2 2 3-3M11 14h6',
  stats: 'M4 16V9M9 16V4M14 16v-5',
  review: 'M5 3h8l3 3v11H5zM8 9h6M8 12h6M8 15h3',
  settings: 'M10 7.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM10 2v2M10 16v2M2 10h2M16 10h2M4.3 4.3l1.4 1.4M14.3 14.3l1.4 1.4M4.3 15.7l1.4-1.4M14.3 5.7l1.4-1.4',
  plus: 'M10 4v12M4 10h12',
  close: 'M5 5l10 10M15 5L5 15',
  search: 'M9 3.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11zM13 13l4 4',
  play: 'M7 5l8 5-8 5z',
  pause: 'M7 5v10M13 5v10',
  grip: 'M8 5h.01M12 5h.01M8 10h.01M12 10h.01M8 15h.01M12 15h.01',
  check: 'M5 10l3 3 7-7',
  history: 'M4 10a6 6 0 1 0 2-4.5M4 4v3h3M10 7v3l2 2',
  download: 'M10 3v10M6 9l4 4 4-4M4 16h12',
  upload: 'M10 14V4M6 8l4-4 4 4M4 16h12',
  edit: 'M13.5 4.5l2 2L7 15H5v-2z',
  link: 'M8.5 11.5l3-3M7 9l-1.5 1.5a2.5 2.5 0 0 0 3.5 3.5L10.5 12.5M13 11l1.5-1.5a2.5 2.5 0 0 0-3.5-3.5L9.5 7.5',
  offline: 'M3 3l14 14M6.5 9.5a5 5 0 0 1 2-1.3M4 7a9 9 0 0 1 3-1.7M13.5 9.6a5 5 0 0 1 1.2.9M11 5.1A9 9 0 0 1 16 7M10 14h.01',
  trash: 'M5 6h10M8 6V4h4v2M6 6l1 10h6l1-10',
  menu: 'M4 6h12M4 10h12M4 14h12',
};

export function Icon({ name, size = 20, label }: { name: keyof typeof paths | string; size?: number; label?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
      aria-label={label}
    >
      <path d={paths[name] ?? ''} />
    </svg>
  );
}
