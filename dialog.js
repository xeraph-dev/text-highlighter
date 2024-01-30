for (const id of ["features", "collect", "settings"]) {
  let dialog = null;

  interact(`.dialog#${id} header`).draggable({
    listeners: {
      start(event) {
        dialog = event.target.closest(".dialog");
      },
      move(event) {
        if (!dialog) return;
        const x = event.dx + dialog.offsetLeft;
        const y = event.dy + dialog.offsetTop;
        dialog.style.setProperty("--x", `${x}px`);
        dialog.style.setProperty("--y", `${y}px`);
      },
    },
  });
}
