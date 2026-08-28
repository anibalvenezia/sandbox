(() => {
  const gridEl = document.getElementById("grid");
  const hintEl = document.getElementById("hint");
  const colsInput = document.getElementById("cols");
  const rowsInput = document.getElementById("rows");
  const customColor = document.getElementById("customColor");

  let mode = "paint";
  let color = "#1a1a1a";
  let painting = false;
  let cols = 12;
  let rows = 10;
  /** @type {Map<string, CellNode>} */
  const nodes = new Map();

  /**
   * @typedef {{
   *   id: string,
   *   color: string | null,
   *   split: null | { axis: "h" | "v", a: string, b: string },
   *   parentId: string | null
   * }} CellNode
   */

  function uid() {
    return `c_${Math.random().toString(36).slice(2, 10)}`;
  }

  /** @returns {CellNode} */
  function createLeaf(parentId = null, fill = null) {
    const node = { id: uid(), color: fill, split: null, parentId };
    nodes.set(node.id, node);
    return node;
  }

  function buildGrid(c, r) {
    nodes.clear();
    cols = c;
    rows = r;
    gridEl.style.gridTemplateColumns = `repeat(${cols}, 1cm)`;
    gridEl.style.gridTemplateRows = `repeat(${rows}, 1cm)`;
    gridEl.innerHTML = "";

    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        const leaf = createLeaf(null);
        gridEl.appendChild(renderNode(leaf.id));
      }
    }
  }

  function renderNode(id) {
    const node = nodes.get(id);
    const el = document.createElement("div");
    el.className = "cell";
    el.dataset.id = id;

    if (node.split) {
      el.classList.add("split", node.split.axis);
      el.appendChild(renderNode(node.split.a));
      el.appendChild(renderNode(node.split.b));
      return el;
    }

    el.classList.add("leaf");
    if (node.color) el.style.background = node.color;
    return el;
  }

  function refreshRootCell(rootId) {
    const current = gridEl.querySelector(`[data-id="${rootId}"]`);
    if (!current || current.parentElement !== gridEl) {
      let walk = rootId;
      let top = rootId;
      while (walk) {
        const n = nodes.get(walk);
        if (!n?.parentId) {
          top = walk;
          break;
        }
        top = n.parentId;
        walk = n.parentId;
      }
      const mounted = gridEl.querySelector(`[data-id="${top}"]`);
      if (!mounted) return;
      mounted.replaceWith(renderNode(top));
      return;
    }
    current.replaceWith(renderNode(rootId));
  }

  function findRootId(id) {
    let walk = id;
    while (true) {
      const n = nodes.get(walk);
      if (!n?.parentId) return walk;
      walk = n.parentId;
    }
  }

  function applyPaint(id) {
    const node = nodes.get(id);
    if (!node || node.split) return;
    node.color = mode === "erase" ? null : color;
    const el = gridEl.querySelector(`[data-id="${id}"]`);
    if (el) el.style.background = node.color || "";
  }

  function applySplit(id, axis) {
    const node = nodes.get(id);
    if (!node || node.split) return;

    const fill = node.color;
    const a = createLeaf(id, fill);
    const b = createLeaf(id, fill);
    node.color = null;
    node.split = { axis, a: a.id, b: b.id };

    const rootId = findRootId(id);
    refreshRootCell(rootId);
  }

  function setMode(next) {
    mode = next;
    document.querySelectorAll(".tool[data-mode]").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.mode === mode);
    });
    const labels = {
      paint: "Toca o arrastra para pintar",
      "split-v": "Toca una celda para partirla en vertical",
      "split-h": "Toca una celda para partirla en horizontal",
      erase: "Toca o arrastra para borrar el color",
    };
    hintEl.textContent = labels[mode] || "";
  }

  function setColor(next, fromCustom = false) {
    color = next;
    if (!fromCustom) customColor.value = next;
    document.querySelectorAll(".swatch").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.color?.toLowerCase() === color.toLowerCase());
    });
    if (mode === "erase" || mode.startsWith("split")) setMode("paint");
  }

  function leafFromEvent(event) {
    const target = event.target.closest(".cell.leaf");
    if (!target || !gridEl.contains(target)) return null;
    return target.dataset.id;
  }

  function handleAction(id) {
    if (!id) return;
    if (mode === "paint" || mode === "erase") applyPaint(id);
    else if (mode === "split-v") applySplit(id, "v");
    else if (mode === "split-h") applySplit(id, "h");
  }

  gridEl.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    const id = leafFromEvent(event);
    if (!id) return;
    event.preventDefault();
    gridEl.setPointerCapture(event.pointerId);
    painting = mode === "paint" || mode === "erase";
    handleAction(id);
  });

  gridEl.addEventListener("pointermove", (event) => {
    if (!painting) return;
    event.preventDefault();
    const id = leafFromEvent(event);
    handleAction(id);
  });

  const stopPaint = () => {
    painting = false;
  };
  gridEl.addEventListener("pointerup", stopPaint);
  gridEl.addEventListener("pointercancel", stopPaint);
  gridEl.addEventListener("lostpointercapture", stopPaint);

  document.querySelectorAll(".tool[data-mode]").forEach((btn) => {
    btn.addEventListener("click", () => setMode(btn.dataset.mode));
  });

  document.querySelectorAll(".swatch").forEach((btn) => {
    btn.addEventListener("click", () => setColor(btn.dataset.color));
  });

  customColor.addEventListener("input", () => setColor(customColor.value, true));

  document.getElementById("resizeBtn").addEventListener("click", () => {
    const c = Math.min(40, Math.max(4, Number(colsInput.value) || 12));
    const r = Math.min(40, Math.max(4, Number(rowsInput.value) || 10));
    colsInput.value = String(c);
    rowsInput.value = String(r);
    buildGrid(c, r);
  });

  document.getElementById("clearBtn").addEventListener("click", () => {
    buildGrid(cols, rows);
  });

  window.addEventListener("keydown", (event) => {
    if (event.target.matches("input, textarea")) return;
    const key = event.key.toLowerCase();
    if (key === "p") setMode("paint");
    if (key === "v") setMode("split-v");
    if (key === "h") setMode("split-h");
    if (key === "e") setMode("erase");
  });

  buildGrid(cols, rows);
  setMode("paint");
})();
