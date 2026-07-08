/** In-app navigation for the reset module. The app has no router, so screens
 *  are modelled as a small stack of Nav states (mirrors CaavTab's view state,
 *  extended to support Back through arbitrary depth). */
export type Nav =
  | { view: "home" }
  | { view: "chapter"; ata: string }
  | { view: "breakers"; ata: string }
  | { view: "item"; id: string };
