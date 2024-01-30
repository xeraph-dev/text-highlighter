declare type HighlightWrapper = "mark" | "strike" | "underline";

declare type HighlightSourceConfig = {
  id: string;
  wrapper: HighlightWrapper;
  color: string | null;
};

declare type HighlightSource = {
  node?: Element;
  text: string;
  index: number;
  offset: number;
  config: HighlightSourceConfig;
  parent: {
    tagName: string;
    index: number;
  };
};

declare type HighlightCollectKey =
  | HighlightWrapper
  | `${HighlightWrapper}-${string}`;
declare type HighlightCollectValue = Map<string, HighlightSource[]>;
declare type HighlightCollect = Map<HighlightCollectKey, HighlightCollectValue>;

declare type HighlightOptions = Partial<HighlightSourceConfig> & {
  ignoreSelectors?: string[];
};

declare class TextHighlighter extends HTMLElement {
  static tagName: string;
  static storeKey: string;
  static dataName: string;
  static logScopeName: string;
  static attrNames: {
    autoHighlight: string;
    autoSave: string;
    autoLoad: string;
    color: string;
    wrapper: string;
    highlightable: string;
    unhighlightable: string;
  };
  static events: {
    change: string;
    highlight: string;
  };
  static defaultAttrValues: {
    autoHighlight: boolean;
    autoSave: boolean;
    autoLoad: boolean;
    color: string | null;
    wrapper: HighlightWrapper;
  };

  static allowedWrappers: HighlightWrapper[];

  /** {@link TextHighlighter} DOM node. It's a shorthand for document.querySelector({@link TextHighlighter.tagName}) */
  static readonly node: TextHighlighter | null;

  /** Whether {@link TextHighlighter#highlight} should be called when the user select some text or not */
  autoHighlight: boolean;

  /** Whether {@link TextHighlighter#save} should be called after {@link TextHighlighter#highlight} */
  autoSave: boolean;

  /** Whether {@link TextHighlighter#save} should be called {@link TextHighlighter#load} on {@link TextHighlighter#connectedCallback} */
  autoLoad: boolean;

  /** Current color of the highlighter */
  color: string | null;

  /** Current wrapper type of the highlighter */
  wrapper: HighlightWrapper;

  /** Elements highlighted */
  readonly doms: Element[];

  static readonly observedAttributes: string[];
  connectedCallback(): void;
  disconnectedCallback(): void;
  attributeChangedCallback(
    name: string,
    _: string | null,
    value: string | null
  ): void;

  /** Highlight selected range */
  highlight(opts?: HighlightOptions): void;

  /** List of highlight sources */
  sources(): HighlightSource[];

  /** Collect highlight sources */
  collect(): HighlightCollect;

  /** Restore the highlight sources */
  restore(...sources: HighlightSource[]): void;

  /** Remove highlight by id */
  removeById(id: string): void;

  /** Remove highlights */
  clear(): void;

  /** Reset config values to default values */
  reset(): void;

  /** Save current highlights to localStore */
  save(): void;

  /** Load highlights from localStore */
  load(): void;

  /** Convert wrapper to tag name */
  wrapperToTagname(wrapper: HighlightWrapper): string;

  /** Convert tag name to wrapper */
  tagNameToWrapper(tag: string): HighlightWrapper;
}

interface Window {
  TextHighlighter: typeof TextHighlighter;
}

type TextHighlighterProps = {
  autoHighlight?: boolean;
  autoSave?: boolean;
  autoLoad?: boolean;
  color?: string;
  wrapper?: HighlightWrapper;
};
