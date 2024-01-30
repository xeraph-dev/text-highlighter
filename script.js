for (const name of JSON.parse(localStorage.getItem("features") ?? "[]")) {
	features.querySelector(`[name="${name}"]`).checked = true;
}

const collectList = document.querySelector("#collect.dialog > ul");
TextHighlighter.node.addEventListener(TextHighlighter.events.highlight, () => {
	const collect = TextHighlighter.node.collect();
	collectList.innerHTML = null;
	for (const [key, value] of collect.entries()) {
		const wrapper = key.split("-")[0];
		const color = key.split("-")[1] ?? null;
		const itemList = document.createElement("ul");
		const colorItem = document.createElement("li");
		collectList.append(colorItem);
		colorItem.append(itemList);
		if (wrapper) colorItem.setAttribute("data-wrapper", wrapper);
		if (color) colorItem.setAttribute("data-color", color);

		let index = 1;
		for (const sources of value.values()) {
			const item = document.createElement("li");
			itemList.append(item);
			const count = document.createElement("span");
			item.append(count);
			count.textContent = `${index++}:`;
			for (const source of sources) {
				const span = document.createElement("span");
				item.append(span);
				span.textContent = source.text;
			}
		}
	}
});
