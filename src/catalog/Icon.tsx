type IconName =
  | "search"
  | "mic"
  | "stop"
  | "edit"
  | "book"
  | "info"
  | "back"
  | "save"
  | "undo"
  | "trash"
  | "close";
const paths: Record<IconName, string[]> = {
  search: ["M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13Z", "m16 16 5 5"],
  mic: [
    "M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z",
    "M5 11v1a7 7 0 0 0 14 0v-1M12 19v3M9 22h6",
  ],
  stop: ["M6 6h12v12H6Z"],
  edit: ["m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-5-5L4 14v6Z"],
  book: [
    "M12 5v16M3 4h5a4 4 0 0 1 4 2 4 4 0 0 1 4-2h5v15h-5a4 4 0 0 0-4 2 4 4 0 0 0-4-2H3Z",
  ],
  info: ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 11v6M12 7v.1"],
  back: ["m10 5-7 7 7 7M3 12h18"],
  save: ["M4 3h13l4 4v14H3V3h1ZM7 3v6h10V3M7 21v-8h10v8"],
  undo: ["M4 4v6h6M4 10a8 8 0 1 1 2 9"],
  trash: ["M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"],
  close: ["m6 6 12 12M6 18 18 6"],
};

/** Icons supplement visible labels; they are not separate accessible controls. */
export function Icon({ name }: { name: IconName }) {
  return (
    <svg
      className="ui-icon"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths[name].map((d, index) => (
        <path key={index} d={d} />
      ))}
    </svg>
  );
}
