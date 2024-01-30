/// <reference path="./text-highlighter.d.ts" />
// @ts-check
"use strict";

/**
 * Highlight texts using the browser {@link https://developer.mozilla.org/en-US/docs/Web/API/Selection Selection API}
 *
 * Useful links
 * - {@link https://javascript.info/dom-navigation Walking the DOM}
 * - {@link https://javascript.info/searching-elements-dom Searching: getElement*, querySelector*}
 * - {@link https://javascript.info/basic-dom-node-properties Node properties: type, tag and contents}
 * - {@link https://javascript.info/dom-attributes-and-properties Attributes and properties}
 * - {@link https://javascript.info/modifying-document Modifying the document}
 * - {@link https://javascript.info/selection-range Selection and Range}
 */
window.TextHighlighter = class TextHighlighter extends HTMLElement {
	static tagName = "text-highlighter";
	static storeKey = "highlight-sources";
	static dataName = `data-${TextHighlighter.tagName}`;
	static logScopeName = `[${TextHighlighter.tagName.toUpperCase()}]`;
	static attrNames = {
		autoHighlight: "autohighlight",
		autoSave: "autosave",
		autoLoad: "autoload",
		color: "color",
		wrapper: "wrapper",
		highlightable: "highlightable",
		unhighlightable: "unhighlightable",
	};
	static events = {
		change: "change",
		highlight: "highlight",
	};
	static defaultAttrValues = {
		/** @type {boolean} */
		autoHighlight: false,
		/** @type {boolean} */
		autoSave: false,
		/** @type {boolean} */
		autoLoad: false,
		/** @type {string?} */
		color: null,
		/** @type {HighlightWrapper} */
		wrapper: "mark",
	};
	/** @type {HighlightWrapper[]} */
	static allowedWrappers = ["mark", "strike", "underline"];

	/** @returns {TextHighlighter?} */
	static get node() {
		return document.querySelector(TextHighlighter.tagName);
	}

	#autoHighlight = TextHighlighter.defaultAttrValues.autoHighlight;
	#autoSave = TextHighlighter.defaultAttrValues.autoSave;
	#autoLoad = TextHighlighter.defaultAttrValues.autoLoad;
	#color = TextHighlighter.defaultAttrValues.color;
	#wrapper = TextHighlighter.defaultAttrValues.wrapper;

	constructor() {
		super();

		const autoHighlightName = TextHighlighter.attrNames.autoHighlight;
		const autoHighlightValue = this.getAttribute(autoHighlightName);
		const autoHighlight =
			this.#parseBoolean(autoHighlightName, autoHighlightValue) ??
			TextHighlighter.defaultAttrValues.autoHighlight;
		if (autoHighlight) this.#addEventListeners();
	}

	get autoHighlight() {
		return this.#autoHighlight;
	}

	set autoHighlight(value) {
		const attr = TextHighlighter.attrNames.autoHighlight;
		this.#logChange(attr, value);
		this.#autoHighlight = value;
		if (value) this.#addEventListeners();
		else this.#removeEventListeners();
		this.#dispatchChange(attr);
	}

	get autoSave() {
		return this.#autoSave;
	}

	set autoSave(value) {
		const attr = TextHighlighter.attrNames.autoSave;
		this.#logChange(attr, value);
		this.#autoSave = value;
		this.#dispatchChange(attr);
	}

	get autoLoad() {
		return this.#autoLoad;
	}

	set autoLoad(value) {
		const attr = TextHighlighter.attrNames.autoLoad;
		this.#logChange(attr, value);
		this.#autoLoad = value;
		this.#dispatchChange(attr);
	}

	get color() {
		return this.#color;
	}

	set color(value) {
		const attr = TextHighlighter.attrNames.color;
		this.#logChange(attr, value);
		this.#color = value;
		this.#dispatchChange(attr);
	}

	get wrapper() {
		return this.#wrapper;
	}

	set wrapper(value) {
		const attr = TextHighlighter.attrNames.wrapper;
		this.#logChange(attr, value);
		this.#wrapper = value;
		this.#dispatchChange(attr);
	}

	/** @returns {Element[]} */
	get doms() {
		return Array.from(
			document.querySelectorAll(
				TextHighlighter.allowedWrappers
					.map(
						(wrapper) =>
							`${this.wrapperToTagname(wrapper)}[${TextHighlighter.dataName}]`,
					)
					.join(","),
			),
		);
	}

	static get observedAttributes() {
		return [
			TextHighlighter.attrNames.autoHighlight,
			TextHighlighter.attrNames.autoSave,
			TextHighlighter.attrNames.color,
			TextHighlighter.attrNames.wrapper,
		];
	}

	connectedCallback() {
		// For some reason the selection API does not work well in this step
		// Added setTimeout to hack it
		setTimeout(() => {
			const autoLoadName = TextHighlighter.attrNames.autoLoad;
			const autoLoadValue = this.getAttribute(autoLoadName);
			const autoLoad =
				this.#parseBoolean(autoLoadName, autoLoadValue) ??
				TextHighlighter.defaultAttrValues.autoLoad;
			if (autoLoad) this.load();
		}, 0);
	}

	disconnectedCallback() {
		this.#removeEventListeners();
	}

	/**
	 * @param {string} name
	 * @param {string?} _
	 * @param {string?} value
	 */
	attributeChangedCallback(name, _, value) {
		if (name === TextHighlighter.attrNames.autoHighlight) {
			this.autoHighlight =
				this.#parseBoolean(name, value) ??
				TextHighlighter.defaultAttrValues.autoHighlight;
		}
		if (name === TextHighlighter.attrNames.autoSave) {
			this.autoSave =
				this.#parseBoolean(name, value) ??
				TextHighlighter.defaultAttrValues.autoSave;
		}
		if (name === TextHighlighter.attrNames.autoLoad) {
			this.autoLoad =
				this.#parseBoolean(name, value) ??
				TextHighlighter.defaultAttrValues.autoLoad;
		}
		if (name === TextHighlighter.attrNames.color) {
			this.color = value ?? TextHighlighter.defaultAttrValues.color;
		}
		if (name === TextHighlighter.attrNames.wrapper) {
			// @ts-ignore
			this.wrapper = value ?? TextHighlighter.defaultAttrValues.wrapper;
		}
	}

	/** @param {HighlightOptions} [opts] */
	highlight(opts) {
		if (!opts && !this.autoHighlight) return;
		const selection = getSelection();
		if (selection?.isCollapsed !== false) return;
		this.#logInfo("Highlighting");

		const id = opts?.id ?? crypto.randomUUID();
		const color = opts?.color ?? this.color;
		const wrapper = opts?.wrapper ?? this.wrapper;
		const ranges = [];
		const nodes = [];
		const selectionRanges = [];
		let highlighted = false;

		for (let i = 0; i < selection.rangeCount; i++) {
			const range = selection.getRangeAt(i);
			if (range.collapsed) continue;
			selectionRanges.push(range);
		}

		for (const range of selectionRanges) {
			const start = range.startContainer;
			const end =
				range.endContainer instanceof Text ||
				range.endContainer !== range.commonAncestorContainer
					? range.endContainer
					: range.commonAncestorContainer.childNodes[range.endOffset];
			this.#tryMergeByType(start, { id, color, wrapper });

			if (start instanceof Text && start === end) {
				if (this.#nodeIsHighlightable(start, opts)) {
					ranges.push(range);
					highlighted = true;
				}
			} else {
				this.#tryMergeByType(end, { id, color, wrapper });
				let curr =
					start instanceof Text
						? start
						: start instanceof HTMLElement
						  ? this.#findFirstTextChild(start.childNodes[range.startOffset])
						  : this.#nextTextNode(start, end);
				do {
					if (!curr) break;
					if (!(curr instanceof Text)) continue;
					if (!this.#nodeIsHighlightable(curr, opts)) continue;
					highlighted = true;
					const offsetStart = curr === start ? range.startOffset : 0;
					this.#setRange(selection, ranges, curr, offsetStart, curr.length);
				} while ((curr = this.#nextTextNode(curr, end)));
				if (end instanceof Text && this.#nodeIsHighlightable(end, opts)) {
					this.#setRange(selection, ranges, end, 0, range.endOffset);
				}
			}
		}

		for (const range of ranges) {
			const node = this.#wrapRange(range, { id, color, wrapper });
			if (node.textContent === "") {
				node.remove();
				continue;
			}
			nodes.push(node);
		}

		// /** @type {Set<string>} */
		const ids = new Set();
		for (const node of nodes) {
			const id = this.#extractOverlapped(selection, node.parentElement);
			if (id) ids.add(id);
		}

		for (const id of ids) this.#refreshId(id);

		if (highlighted) {
			selection.removeAllRanges();
			if (this.autoSave) this.save();
			this.#dispatchHighlight();
		}
	}

	/** @returns {HighlightSource[]} */
	sources() {
		/** @type {HighlightSource[]} */
		const sources = [];

		this.doms.forEach((node) => {
			const range = new Range();
			range.selectNode(node);

			const id = node.getAttribute(TextHighlighter.dataName);
			if (!id) return;
			const wrapper = this.tagNameToWrapper(node.tagName);
			const color = node.getAttribute(
				`data-${TextHighlighter.attrNames.color}`,
			);

			/** @type {HTMLElement} */
			// @ts-ignore
			const parent = range.commonAncestorContainer;
			sources.push({
				node,
				text: node.textContent ?? "",
				index:
					node.previousSibling instanceof Text
						? range.startOffset - 1
						: range.startOffset,
				offset:
					(node.previousSibling instanceof Text &&
						node.previousSibling.textContent?.length) ||
					0,
				config: {
					id,
					wrapper,
					color,
				},
				parent: {
					tagName: parent.tagName,
					index: Array.prototype.indexOf.call(
						document.getElementsByTagName(parent.tagName),
						parent,
					),
				},
			});
		});

		return sources;
	}

	/** @returns {HighlightCollect} */
	collect() {
		this.#logInfo("Collecting", this.doms.length, "sources");
		/** @type {HighlightCollect} */
		const collect = new Map();

		for (const source of this.sources()) {
			const { color, wrapper, id } = source.config;
			/** @type {HighlightCollectKey} */
			const key = color ? `${wrapper}-${color}` : wrapper;
			if (!collect.has(key)) collect.set(key, new Map());
			if (!collect.get(key)?.has(id)) collect.get(key)?.set(id, []);
			collect.get(key)?.get(id)?.push(source);
		}

		return collect;
	}

	/** @param {HighlightSource[]} sources */
	restore(...sources) {
		const selection = getSelection();
		if (!selection) return;
		this.#logInfo(`Restoring ${sources.length} sources`);
		for (const { parent, index, offset, config, text } of sources) {
			const pnode = document.getElementsByTagName(parent.tagName)[parent.index];
			if (!pnode) continue;
			selection.setPosition(pnode.childNodes[index], offset);
			selection.extend(pnode.childNodes[index], offset + text.length);
			const range = selection.getRangeAt(0);
			this.#wrapRange(range, config);
		}

		if (sources.length) selection.removeAllRanges();
		this.#dispatchHighlight();
	}

	/** @param {string} id */
	removeById(id) {
		this.#logInfo("Removing highlight:", id);
		const selector = `[${TextHighlighter.dataName}="${id}"]`;
		const nodes = document.querySelectorAll(selector);
		for (const node of nodes) node.outerHTML = node.innerHTML;
		if (this.autoSave) this.save();
	}

	clear() {
		this.#logInfo("Clearing highlights");
		const selection = getSelection();
		if (selection?.isCollapsed !== false) {
			for (const node of this.doms) node.outerHTML = node.innerHTML;
		} else {
			const id = crypto.randomUUID();
			/** @type {HighlightWrapper} */
			// @ts-ignore
			const wrapper = "text-highlight-to-remove";
			const color = "text-highlight-to-remove";
			this.highlight({ id, wrapper, color });
			this.removeById(id);
		}

		if (this.autoSave) this.save();
		this.#dispatchHighlight();
	}

	reset() {
		this.#logInfo("Reseting configuration");
		this.color = TextHighlighter.defaultAttrValues.color;
		this.wrapper = TextHighlighter.defaultAttrValues.wrapper;
	}

	save() {
		this.#logInfo("Saving sources to storage");
		const data = JSON.stringify(this.sources(), (key, value) =>
			key === "node" ? null : value,
		);
		localStorage.setItem(TextHighlighter.storeKey, data);
	}

	load() {
		this.#logInfo("Loading sources from storage");
		const data = localStorage.getItem(TextHighlighter.storeKey);
		if (!data) return;
		try {
			this.restore(...JSON.parse(data));
		} catch (error) {
			this.#logInfo("Error loading sources", error);
		}
	}

	/**
	 * @param {HighlightWrapper} wrapper
	 * @returns {string}
	 */
	wrapperToTagname(wrapper) {
		if (wrapper === "mark") return "mark";
		if (wrapper === "strike") return "s";
		if (wrapper === "underline") return "u";
		return "span";
	}

	/**
	 * @param {string} tag
	 * @returns {HighlightWrapper}
	 */
	tagNameToWrapper(tag) {
		tag = tag.toLowerCase();
		if (tag === "mark") return "mark";
		if (tag === "s") return "strike";
		if (tag === "u") return "underline";
		/** @ts-ignore */
		return tag;
	}

	/**
	 * @param {ChildNode | null} node
	 * @returns {Text?}
	 */
	#findFirstTextChild(node) {
		if (!node) return node;
		if (node instanceof Text) return node;
		return this.#findFirstTextChild(node.firstChild);
	}

	/**
	 * @param {Node} node
	 * @param {HighlightSourceConfig} config
	 */
	#tryMergeByType(node, { id, wrapper, color }) {
		if (!node) return;
		const el = node instanceof Element ? node : node.parentElement;
		if (!el) return;
		const sameTag = wrapper === this.tagNameToWrapper(el.tagName);
		const sameColor =
			(color ?? "") ===
			(el.getAttribute(`data-${TextHighlighter.attrNames.color}`) ?? "");
		if (!sameTag || !sameColor) return;
		const nodeid = el.getAttribute(TextHighlighter.dataName);
		if (!nodeid) return;
		const selector = `[${TextHighlighter.dataName}="${nodeid}"]`;
		const nodes = document.querySelectorAll(selector);
		for (const node of nodes) node.setAttribute(TextHighlighter.dataName, id);
		this.#fixTextContent(el);
	}

	/** @param {string} id */
	#refreshId(id) {
		const nodes = document.querySelectorAll(
			TextHighlighter.allowedWrappers
				.map(
					(wrapper) =>
						`${this.wrapperToTagname(wrapper)}[${
							TextHighlighter.dataName
						}="${id}"]`,
				)
				.join(","),
		);
		const first = nodes[0];
		const last = nodes[nodes.length - 1];
		if (first === last) return;
		/** @type {Element?=} */
		let curr = first;
		let matches = [curr];
		let hasOverlap = false;
		let newid = crypto.randomUUID();
		while ((curr = this.#nextTextNode(curr, last)?.parentElement)) {
			const currid = curr.getAttribute(TextHighlighter.dataName);
			if (currid !== id) {
				hasOverlap = true;
				break;
			}
			matches.push(curr);
		}

		if (!hasOverlap) return;
		nodes.forEach((node) => {
			if (!matches.includes(node)) {
				node.setAttribute(TextHighlighter.dataName, newid);
			}
		});
	}

	/**
	 * Extract all inner nodes with some considerations:
	 * - The text to the left of the overlaped highlight still has the same parent ID.
	 * - The text to the right of the overlaped highlight gets a new ID.
	 * - After extract an element, try merging it with adjacent elements
	 * @param {Selection} selection
	 * @param {HTMLElement?} node
	 * @returns {string=} Splitted node ID
	 */
	#extractOverlapped(selection, node) {
		if (!node) return;
		if (!this.#isHighlight(node)) return;
		const id = node.getAttribute(TextHighlighter.dataName);
		if (!id) return;
		const datacolor = `data-${TextHighlighter.attrNames.color}`;
		const wrapper = this.tagNameToWrapper(node.tagName);
		const color = node.getAttribute(datacolor) ?? "";
		let child;
		/** @type {Element?} */
		let lastNode = null;
		while ((child = node.firstChild)) {
			const isLast = node.firstChild === node.lastChild;

			if (child instanceof Text) {
				selection.setPosition(child, 0);
				selection.extend(child, child.length);
				const range = selection.getRangeAt(0);
				if (range.collapsed) continue;
				child = this.#wrapRange(range, { id, color, wrapper });
			}

			node.before(child);
			this.#cleanNode(child);

			if (child instanceof Element) {
				this.#mergeAdjacentById(child, isLast);
				if (isLast) lastNode = child;
			}
		}
		node.remove();
		if (lastNode) this.#mergeAdjacentById(lastNode);
		return id;
	}

	/** @param {Element} node */
	#fixTextContent(node) {
		let curr = node.firstChild;
		do {
			if (curr instanceof Text && curr?.nextSibling instanceof Text) {
				curr.data += curr.nextSibling.data;
				curr.nextSibling.remove();
			}
		} while ((curr = curr?.nextSibling ?? null));
	}

	/**
	 * @param {Element} node
	 * @mergeNext {boolean} [mergeNext] - Whether merge the next element or not
	 */
	#mergeAdjacentById(node, mergeNext = true) {
		if (!this.#isHighlight(node)) return;
		const id = node.getAttribute(TextHighlighter.dataName);
		const next = node.nextSibling;
		const prev = node.previousSibling;
		if (mergeNext && next instanceof Element && this.#isHighlight(next)) {
			if (id === next.getAttribute(TextHighlighter.dataName)) {
				let child;
				while ((child = next.firstChild)) node.append(child);
				next.remove();
			}
		}
		if (prev instanceof Element && this.#isHighlight(prev)) {
			if (id === prev.getAttribute(TextHighlighter.dataName)) {
				let child;
				while ((child = prev.lastChild)) node.prepend(child);
				prev.remove();
			}
		}
		this.#cleanNode(node);
		this.#fixTextContent(node);
	}

	/**
	 * @param {Element} node
	 * @returns {boolean}
	 */
	#isHighlight(node) {
		return (
			TextHighlighter.allowedWrappers.includes(
				this.tagNameToWrapper(node.tagName),
			) && node.hasAttribute(TextHighlighter.dataName)
		);
	}

	/**
	 * @param {Node?=} node
	 * @param {HighlightOptions} [opts]
	 * @returns {boolean}
	 */
	#nodeIsHighlightable(node, opts) {
		const element = node instanceof CharacterData ? node.parentElement : node;
		if (!(element instanceof HTMLElement)) return false;
		const unhighlightableattr = `[data-${TextHighlighter.attrNames.unhighlightable}]`;
		const highlightableattr = `[data-${TextHighlighter.attrNames.highlightable}]`;
		const unhighlightable = element.closest(unhighlightableattr);
		const highlightable = element.closest(highlightableattr);
		const unselectable = opts?.ignoreSelectors?.some((selector) =>
			element.closest(selector),
		);
		if (unselectable) return false;
		return unhighlightable && highlightable
			? unhighlightable.contains(highlightable)
			: unhighlightable === null && highlightable !== null;
	}

	/**
	 * @param {Selection} selection
	 * @param {Range[]} ranges
	 * @param {Node} node
	 * @param {number} start
	 * @param {number} end
	 */
	#setRange(selection, ranges, node, start, end) {
		selection.setPosition(node, start);
		selection.extend(node, end);
		const range = selection.getRangeAt(0);
		if (!range.collapsed) ranges.push(range);
	}

	/**
	 * @param {Node?} node
	 * @returns {Node?=}
	 */
	#nextNode(node) {
		return !node || node instanceof Document || node instanceof HTMLBodyElement
			? null
			: node.nextSibling ?? this.#nextNode(node.parentNode);
	}

	/**
	 * @param {Node?} node
	 * @param {Node} end
	 * @param {Node?} [start]
	 * @returns {Text?}
	 */
	#nextTextNode(node, end, start = node) {
		if (node === end) return null;
		if (!node || node instanceof Document || node instanceof HTMLBodyElement) {
			return null;
		}
		/** @type {Node?=} */
		let next = null;
		if (node instanceof SVGElement) next = this.#nextNode(node);
		if (node instanceof HTMLElement) {
			next = this.#nextNode(node);
			const isStart = node === start;
			// ignore hidden nodes
			if (node.offsetParent && !isStart) next = node.firstChild ?? next;
		}
		if (node instanceof CharacterData) {
			const isText = node instanceof Text;
			const isStart = node === start;
			const empty = node.data?.trim() === "";
			const haslb = node.data?.includes("\n");
			// !isStart - to always get the next text node
			// (!empty || (empty && !haslb)) - to avoid highlight linebreaks between elements
			if (isText && !isStart && (!empty || !haslb)) return node;
			next = this.#nextNode(node);
		}
		if (!next || next === end) return null;
		return this.#nextTextNode(next, end, start);
	}

	/**
	 * @param {Range} range
	 * @param {HighlightSourceConfig} config
	 * @returns {HTMLElement}
	 */
	#wrapRange(range, { id, color, wrapper }) {
		const w = document.createElement(this.wrapperToTagname(wrapper));
		w.setAttribute(TextHighlighter.dataName, id);
		if (color) w.setAttribute(`data-${TextHighlighter.attrNames.color}`, color);
		range.surroundContents(w);
		this.#cleanNode(w);
		return w;
	}

	/**
	 * Remove generated empty elements
	 * @param {Node} node
	 */
	#cleanNode(node) {
		if (this.#isEmpty(node.previousSibling)) node.previousSibling?.remove();
		if (this.#isEmpty(node.firstChild)) node.firstChild?.remove();
		if (this.#isEmpty(node.lastChild)) node.lastChild?.remove();
		if (this.#isEmpty(node.nextSibling)) node.nextSibling?.remove();
	}

	/** @param {Node?} node */
	#isEmpty(node) {
		return node instanceof Text && node.textContent === "";
	}

	#eventAux() {
		TextHighlighter.node?.highlight();
	}

	#addEventListeners() {
		for (const evtype of ["mouseup", "touchend"])
			document.addEventListener(evtype, this.#eventAux, false);
	}

	#removeEventListeners() {
		for (const evtype of ["mouseup", "touchend"])
			document.removeEventListener(evtype, this.#eventAux, false);
	}

	/**
	 * @param {string} name
	 * @param {string?} value
	 * @returns {boolean?}
	 */
	#parseBoolean(name, value) {
		if (value === null) return null;

		if (!["", "true", "false"].includes(value))
			throw TypeError(
				`Attribute ${name} must be an empty string (""), null, "true" or "false"`,
			);

		return ["", "true"].includes(value);
	}

	/** @param {any[]} msg */
	#logInfo(...msg) {
		console.log(TextHighlighter.logScopeName, ...msg);
	}

	/**
	 * @template T
	 * @param {string} attr
	 * @param {T} value
	 */
	#logChange(attr, value) {
		this.#logInfo("Changing", attr, "to", value);
	}

	/** @param {string} attr */
	#dispatchChange(attr) {
		this.dispatchEvent(new Event(`${TextHighlighter.events.change}:${attr}`));
	}

	#dispatchHighlight() {
		this.dispatchEvent(new Event(TextHighlighter.events.highlight));
	}
};

customElements.define(TextHighlighter.tagName, TextHighlighter);
