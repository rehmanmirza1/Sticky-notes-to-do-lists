(function () {
  "use strict";

  var STORAGE_KEY = "corkboard-notes-v1";
  var THEME_KEY = "corkboard-theme-v1";
  var NOTE_COLORS = ["yellow", "pink", "blue", "green", "orange", "purple"];
  var PIN_COLORS = ["#A6483A", "#2F6F62", "#3A5A8C", "#8C5A2F", "#6B4A8C"];

  var boardEl = document.getElementById("board");
  var emptyStateEl = document.getElementById("emptyState");
  var searchInput = document.getElementById("searchInput");
  var filterButtons = document.querySelectorAll(".filters button");
  var themeToggle = document.getElementById("themeToggle");

  var state = {
    notes: [],
    filter: "all",
    search: "",
  };

  function loadNotes() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
  }

  function saveNotes() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.notes));
    } catch (e) {}
  }

  function loadTheme() {
    try {
      return localStorage.getItem(THEME_KEY);
    } catch (e) {
      return null;
    }
  }
  function saveTheme(v) {
    try {
      localStorage.setItem(THEME_KEY, v);
    } catch (e) {}
  }

  function seedNotes() {
    var now = Date.now();
    return [
      {
        id: "n1",
        type: "note",
        color: "yellow",
        rotation: -3,
        title: "Welcome 👋",
        text: "This is a sticky note. Click any text to edit it, use the dots below to recolor it, or the trash icon to remove it.",
        createdAt: now,
      },
      {
        id: "n2",
        type: "todo",
        color: "blue",
        rotation: 2,
        title: "Today",
        items: [
          { id: "i1", text: "Try adding a sticky note", done: false },
          { id: "i2", text: "Check off a task", done: true },
          {
            id: "i3",
            text: "Drag nothing — this board is click‑to‑edit, not drag‑to‑move",
            done: false,
          },
        ],
        createdAt: now,
      },
      {
        id: "n3",
        type: "note",
        color: "green",
        rotation: 3,
        title: "Tip",
        text: "Use the search bar and filters above to find things fast once your board fills up.",
        createdAt: now,
      },
    ];
  }

  function uid() {
    return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  }

  function hashString(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) {
      h = (h * 31 + str.charCodeAt(i)) >>> 0;
    }
    return h;
  }

  function pinColorFor(id) {
    return PIN_COLORS[hashString(id) % PIN_COLORS.length];
  }

  function formatDate(ts) {
    var d = new Date(ts);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function matchesFilter(note) {
    if (state.filter !== "all" && note.type !== state.filter) return false;
    if (!state.search) return true;
    var q = state.search.toLowerCase();
    if ((note.title || "").toLowerCase().indexOf(q) !== -1) return true;
    if (note.type === "note") {
      return (note.text || "").toLowerCase().indexOf(q) !== -1;
    } else {
      return (note.items || []).some(function (it) {
        return (it.text || "").toLowerCase().indexOf(q) !== -1;
      });
    }
  }

  function render() {
    boardEl.innerHTML = "";
    var visible = state.notes.filter(matchesFilter);
    emptyStateEl.hidden = visible.length !== 0;
    visible.forEach(function (note) {
      boardEl.appendChild(buildNoteEl(note));
    });
  }

  function buildNoteEl(note) {
    var el = document.createElement("article");
    el.className = "note note-" + note.color;
    el.style.transform = "rotate(" + note.rotation + "deg)";
    el.dataset.id = note.id;

    if (note.type === "todo") {
      var tape = document.createElement("div");
      tape.className = "tape";
      el.appendChild(tape);
    } else {
      var pin = document.createElement("div");
      pin.className = "pin";
      pin.style.setProperty("--pin-color", pinColorFor(note.id));
      el.appendChild(pin);
    }

    var title = document.createElement("div");
    title.className = "note-title";
    title.contentEditable = "true";
    title.setAttribute(
      "data-placeholder",
      note.type === "todo" ? "List title…" : "Title…",
    );
    title.innerText = note.title || "";
    title.addEventListener("input", function () {
      note.title = title.innerText.replace(/\n/g, " ");
      saveNotes();
    });
    title.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        title.blur();
      }
    });
    el.appendChild(title);

    if (note.type === "note") {
      var body = document.createElement("div");
      body.className = "note-body";
      body.contentEditable = "true";
      body.setAttribute("data-placeholder", "Write something…");
      body.innerText = note.text || "";
      body.addEventListener("input", function () {
        note.text = body.innerText;
        saveNotes();
      });
      el.appendChild(body);
    } else {
      var list = document.createElement("ul");
      list.className = "todo-list";
      (note.items || []).forEach(function (item) {
        list.appendChild(buildItemEl(note, item));
      });
      el.appendChild(list);

      var addRow = document.createElement("div");
      addRow.className = "add-item-row";
      var addInput = document.createElement("input");
      addInput.type = "text";
      addInput.placeholder = "Add an item…";
      var addBtn = document.createElement("button");
      addBtn.type = "button";
      addBtn.textContent = "Add";

      function commitAdd() {
        var val = addInput.value.trim();
        if (!val) return;
        var item = { id: uid(), text: val, done: false };
        note.items = note.items || [];
        note.items.push(item);
        saveNotes();
        list.appendChild(buildItemEl(note, item));
        addInput.value = "";
        addInput.focus();
      }
      addBtn.addEventListener("click", commitAdd);
      addInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          commitAdd();
        }
      });
      addRow.appendChild(addInput);
      addRow.appendChild(addBtn);
      el.appendChild(addRow);
    }

    var footer = document.createElement("div");
    footer.className = "note-footer";

    var swatches = document.createElement("div");
    swatches.className = "swatches";
    NOTE_COLORS.forEach(function (c) {
      var sw = document.createElement("button");
      sw.type = "button";
      sw.className = "swatch";
      sw.style.background = "var(--note-" + c + ")";
      sw.setAttribute("aria-pressed", String(c === note.color));
      sw.setAttribute("aria-label", c + " note");
      sw.addEventListener("click", function () {
        note.color = c;
        saveNotes();
        render();
      });
      swatches.appendChild(sw);
    });

    var meta = document.createElement("div");
    meta.className = "note-meta";
    var dateEl = document.createElement("span");
    dateEl.className = "note-date";
    dateEl.textContent = formatDate(note.createdAt);
    var delBtn = document.createElement("button");
    delBtn.className = "delete-btn";
    delBtn.type = "button";
    delBtn.title = "Delete";
    delBtn.setAttribute("aria-label", "Delete note");
    delBtn.innerHTML =
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>';
    delBtn.addEventListener("click", function () {
      state.notes = state.notes.filter(function (n) {
        return n.id !== note.id;
      });
      saveNotes();
      render();
    });

    meta.appendChild(dateEl);
    meta.appendChild(delBtn);
    footer.appendChild(swatches);
    footer.appendChild(meta);
    el.appendChild(footer);

    return el;
  }

  function buildItemEl(note, item) {
    var li = document.createElement("li");
    li.className = "todo-item" + (item.done ? " done" : "");

    var cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = !!item.done;
    cb.setAttribute("aria-label", "Mark done");
    cb.addEventListener("change", function () {
      item.done = cb.checked;
      li.classList.toggle("done", item.done);
      saveNotes();
    });

    var text = document.createElement("span");
    text.className = "item-text";
    text.contentEditable = "true";
    text.innerText = item.text || "";
    text.addEventListener("input", function () {
      item.text = text.innerText;
      saveNotes();
    });
    text.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        text.blur();
      }
    });

    var rm = document.createElement("button");
    rm.type = "button";
    rm.className = "remove-item";
    rm.textContent = "✕";
    rm.setAttribute("aria-label", "Remove item");
    rm.addEventListener("click", function () {
      note.items = note.items.filter(function (i) {
        return i.id !== item.id;
      });
      saveNotes();
      li.remove();
    });

    li.appendChild(cb);
    li.appendChild(text);
    li.appendChild(rm);
    return li;
  }

  function addNote(type) {
    var color = NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)];
    var rotation = (Math.random() * 6 - 3).toFixed(1) * 1;
    var note = {
      id: uid(),
      type: type,
      color: color,
      rotation: rotation,
      createdAt: Date.now(),
    };
    if (type === "note") {
      note.title = "";
      note.text = "";
    } else {
      note.title = "";
      note.items = [];
    }
    state.notes.unshift(note);
    saveNotes();
    render();
    requestAnimationFrame(function () {
      var newEl = boardEl.querySelector(
        '[data-id="' + note.id + '"] .note-title',
      );
      if (newEl) newEl.focus();
    });
  }

  document.getElementById("addNoteBtn").addEventListener("click", function () {
    addNote("note");
  });
  document.getElementById("addTodoBtn").addEventListener("click", function () {
    addNote("todo");
  });

  searchInput.addEventListener("input", function () {
    state.search = searchInput.value.trim();
    render();
  });

  filterButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      filterButtons.forEach(function (b) {
        b.setAttribute("aria-pressed", "false");
      });
      btn.setAttribute("aria-pressed", "true");
      state.filter = btn.dataset.filter;
      render();
    });
  });

  function applyTheme(theme) {
    if (theme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
      themeToggle.textContent = "☀️ Light board";
    } else if (theme === "light") {
      document.documentElement.setAttribute("data-theme", "light");
      themeToggle.textContent = "🌙 Dark board";
    } else {
      document.documentElement.removeAttribute("data-theme");
      themeToggle.textContent = "🌓 Toggle board";
    }
  }
  var savedTheme = loadTheme();
  applyTheme(savedTheme);
  themeToggle.addEventListener("click", function () {
    var current = document.documentElement.getAttribute("data-theme");
    var next = current === "dark" ? "light" : "dark";
    applyTheme(next);
    saveTheme(next);
  });

  var loaded = loadNotes();
  state.notes = loaded && loaded.length ? loaded : seedNotes();
  if (!loaded) saveNotes();
  render();
})();
