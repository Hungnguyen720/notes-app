// @ts-check

(() => {
  "use strict";

  /**
   * @typedef {object} StoredNote
   * @property {string} id
   * @property {string} text
   * @property {number} createdAt
   * @property {number} updatedAt
   * @property {boolean} [pinned]
   */

  /** @typedef {StoredNote & { pinned: boolean }} Note */

  /** @typedef {{ focusEdit?: boolean }} RenderOptions */

  const STORAGE_KEY = "notes-app.notes.v1";
  const MAX_NOTE_LENGTH = 1000;

  const form = /** @type {HTMLFormElement} */ (document.querySelector("#note-form"));
  const input = /** @type {HTMLTextAreaElement} */ (document.querySelector("#note-input"));
  const addButton = /** @type {HTMLButtonElement} */ (
    document.querySelector("#add-note-button")
  );
  const characterCount = /** @type {HTMLElement} */ (
    document.querySelector("#character-count")
  );
  const formError = /** @type {HTMLElement} */ (document.querySelector("#note-error"));
  const notesList = /** @type {HTMLElement} */ (document.querySelector("#notes-list"));
  const emptyState = /** @type {HTMLElement} */ (document.querySelector("#empty-state"));
  const notesSummary = /** @type {HTMLElement} */ (document.querySelector("#notes-summary"));
  const searchInput = /** @type {HTMLInputElement} */ (
    document.querySelector("#note-search")
  );
  const noMatchesState = /** @type {HTMLElement} */ (
    document.querySelector("#no-matches-state")
  );
  const statusMessage = /** @type {HTMLElement} */ (
    document.querySelector("#status-message")
  );
  const storageNote = /** @type {HTMLElement} */ (document.querySelector("#storage-note"));
  const storageLabel = /** @type {HTMLElement} */ (document.querySelector("#storage-label"));

  /** @type {Note[]} */
  let notes = loadNotes();
  /** @type {string | null} */
  let editingNoteId = null;

  function createId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  /**
   * @param {unknown} value
   * @returns {value is StoredNote}
   */
  function isStoredNote(value) {
    if (value === null || typeof value !== "object") return false;

    const note = /** @type {Record<string, unknown>} */ (value);
    return (
      typeof note.id === "string" &&
      typeof note.text === "string" &&
      note.text.trim().length > 0 &&
      note.text.length <= MAX_NOTE_LENGTH &&
      /^[A-Za-z0-9_-]+$/.test(note.id) &&
      typeof note.createdAt === "number" &&
      typeof note.updatedAt === "number" &&
      Number.isFinite(note.createdAt) &&
      Number.isFinite(note.updatedAt) &&
      !Number.isNaN(new Date(note.createdAt).getTime()) &&
      !Number.isNaN(new Date(note.updatedAt).getTime())
    );
  }

  /** @param {boolean} isAvailable */
  function setStorageAvailable(isAvailable) {
    storageNote.classList.toggle("is-unavailable", !isAvailable);
    storageLabel.textContent = isAvailable
      ? "Saved locally on this device"
      : "Browser storage is unavailable; changes may not persist";
  }

  /** @returns {Note[]} */
  function loadNotes() {
    try {
      const savedValue = localStorage.getItem(STORAGE_KEY);
      if (!savedValue) return [];

      const parsedValue = JSON.parse(savedValue);
      if (!Array.isArray(parsedValue)) return [];

      const seenIds = new Set();
      /** @type {Note[]} */
      const validNotes = [];

      for (const note of parsedValue) {
        if (!isStoredNote(note) || seenIds.has(note.id)) continue;
        seenIds.add(note.id);
        validNotes.push({ ...note, pinned: note.pinned === true });
      }

      return validNotes;
    } catch {
      setStorageAvailable(false);
      showStatus("Saved notes could not be loaded in this browser.");
      return [];
    }
  }

  function saveNotes() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
      setStorageAvailable(true);
      return true;
    } catch {
      setStorageAvailable(false);
      showStatus("This change could not be saved. Check your browser storage settings.");
      return false;
    }
  }

  /** @param {string} message */
  function showStatus(message) {
    statusMessage.textContent = "";
    window.setTimeout(() => {
      statusMessage.textContent = message;
    }, 20);
  }

  /** @param {number} timestamp */
  function formatDate(timestamp) {
    const date = new Date(timestamp);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();

    return new Intl.DateTimeFormat(undefined, {
      ...(isToday
        ? { hour: "numeric", minute: "2-digit" }
        : { month: "short", day: "numeric", year: "numeric" }),
    }).format(date);
  }

  /**
   * @param {string} label
   * @param {string} className
   * @param {string} action
   * @param {string} noteId
   */
  function createButton(label, className, action, noteId) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `text-button ${className}`;
    button.dataset.action = action;
    button.dataset.noteId = noteId;
    button.textContent = label;
    return button;
  }

  /** @param {Note} note */
  function renderNote(note) {
    const article = document.createElement("article");
    article.className = "note-card";
    article.dataset.noteId = note.id;
    article.dataset.pinned = String(note.pinned);
    article.classList.toggle("is-pinned", note.pinned);

    if (editingNoteId === note.id) {
      article.classList.add("is-editing");

      const label = document.createElement("label");
      label.className = "visually-hidden";
      label.htmlFor = `edit-${note.id}`;
      label.textContent = "Edit note";

      const textarea = document.createElement("textarea");
      textarea.className = "edit-textarea";
      textarea.id = `edit-${note.id}`;
      textarea.maxLength = MAX_NOTE_LENGTH;
      textarea.value = note.text;
      textarea.dataset.editInput = note.id;
      textarea.setAttribute("aria-describedby", `edit-error-${note.id}`);

      const error = document.createElement("p");
      error.className = "edit-error";
      error.id = `edit-error-${note.id}`;
      error.setAttribute("role", "alert");

      const actions = document.createElement("div");
      actions.className = "edit-actions";
      actions.append(
        createButton("Cancel", "cancel-button", "cancel", note.id),
        createButton("Save changes", "save-button", "save", note.id),
      );

      article.append(label, textarea, error, actions);
      return article;
    }

    const text = document.createElement("p");
    text.className = "note-text";
    text.textContent = note.text;

    const footer = document.createElement("footer");
    footer.className = "note-footer";

    const time = document.createElement("time");
    time.className = "note-time";
    time.dateTime = new Date(note.updatedAt).toISOString();
    time.textContent = `${note.updatedAt > note.createdAt ? "Edited" : "Added"} ${formatDate(note.updatedAt)}`;

    const actions = document.createElement("div");
    actions.className = "note-actions";
    const pinButton = createButton(
      note.pinned ? "Unpin note" : "Pin note",
      "pin-button",
      "pin",
      note.id,
    );
    pinButton.setAttribute("aria-pressed", String(note.pinned));
    actions.append(
      pinButton,
      createButton("Edit", "edit-button", "edit", note.id),
      createButton("Delete", "delete-button", "delete", note.id),
    );

    footer.append(time, actions);
    article.append(text, footer);
    return article;
  }

  /** @param {RenderOptions} [options] */
  function renderNotes(options = {}) {
    const orderedNotes = [...notes].sort((firstNote, secondNote) => {
      if (firstNote.pinned !== secondNote.pinned) return firstNote.pinned ? -1 : 1;
      return secondNote.createdAt - firstNote.createdAt;
    });
    const query = searchInput.value.trim().toLocaleLowerCase();
    const displayedNotes = query
      ? orderedNotes.filter((note) => note.text.toLocaleLowerCase().includes(query))
      : orderedNotes;
    notesList.replaceChildren(...displayedNotes.map(renderNote));

    const hasNotes = notes.length > 0;
    const hasMatches = displayedNotes.length > 0;
    emptyState.hidden = hasNotes;
    noMatchesState.hidden = !hasNotes || !query || hasMatches;
    notesSummary.textContent = !hasNotes
      ? "Nothing here yet"
      : query
        ? `${displayedNotes.length} of ${notes.length} ${notes.length === 1 ? "note" : "notes"}`
        : `${notes.length} ${notes.length === 1 ? "note" : "notes"}, saved locally`;

    if (editingNoteId) {
      const editInput = /** @type {HTMLTextAreaElement | undefined} */ (
        Array.from(notesList.querySelectorAll("[data-edit-input]")).find(
          (element) =>
            /** @type {HTMLElement} */ (element).dataset.editInput === editingNoteId,
        )
      );
      if (options.focusEdit && editInput) {
        editInput.focus();
        editInput.setSelectionRange(editInput.value.length, editInput.value.length);
      }
    }
  }

  function updateComposerState() {
    const currentLength = input.value.length;
    characterCount.textContent = String(currentLength);
    addButton.disabled = input.value.trim().length === 0;

    if (input.value.trim().length > 0) {
      formError.textContent = "";
      input.removeAttribute("aria-invalid");
    }
  }

  function addNote() {
    const text = input.value.trim();

    if (!text) {
      formError.textContent = "Enter some text before adding a note.";
      input.setAttribute("aria-invalid", "true");
      input.focus();
      return;
    }

    const timestamp = Date.now();
    const newNote = {
      id: createId(),
      text,
      createdAt: timestamp,
      updatedAt: timestamp,
      pinned: false,
    };

    notes = [newNote, ...notes];
    saveNotes();
    input.value = "";
    updateComposerState();
    renderNotes();
    showStatus("Note added.");
    input.focus();
  }

  /** @param {string} noteId */
  function beginEditing(noteId) {
    editingNoteId = noteId;
    renderNotes({ focusEdit: true });
  }

  function cancelEditing() {
    editingNoteId = null;
    renderNotes();
    showStatus("Editing canceled.");
  }

  /** @param {string} noteId */
  function saveEdit(noteId) {
    const textarea = /** @type {HTMLTextAreaElement | undefined} */ (
      Array.from(notesList.querySelectorAll("[data-edit-input]")).find(
        (element) => /** @type {HTMLElement} */ (element).dataset.editInput === noteId,
      )
    );
    if (!textarea) return;

    const card = /** @type {HTMLElement} */ (textarea.closest(".note-card"));
    const error = /** @type {HTMLElement} */ (card.querySelector(".edit-error"));
    const text = textarea.value.trim();

    if (!text) {
      error.textContent = "A note cannot be empty.";
      textarea.setAttribute("aria-invalid", "true");
      textarea.focus();
      return;
    }

    notes = notes.map((note) =>
      note.id === noteId ? { ...note, text, updatedAt: Date.now() } : note,
    );
    saveNotes();
    editingNoteId = null;
    renderNotes();
    showStatus("Note updated.");
  }

  /** @param {string} noteId */
  function togglePin(noteId) {
    const note = notes.find((candidate) => candidate.id === noteId);
    if (!note) return;

    notes = notes.map((candidate) =>
      candidate.id === noteId ? { ...candidate, pinned: !candidate.pinned } : candidate,
    );
    saveNotes();
    renderNotes();
    showStatus(note.pinned ? "Note unpinned." : "Note pinned.");
  }

  /** @param {string} noteId */
  function deleteNote(noteId) {
    const renderedNoteIndex = Array.from(notesList.querySelectorAll(".note-card")).findIndex(
      (card) => /** @type {HTMLElement} */ (card).dataset.noteId === noteId,
    );
    if (renderedNoteIndex === -1) return;

    notes = notes.filter((note) => note.id !== noteId);
    if (editingNoteId === noteId) editingNoteId = null;
    saveNotes();
    renderNotes();
    showStatus("Note deleted.");

    const nextFocusTarget = /** @type {HTMLElement | null} */ (
      notesList.querySelector(
        `.note-card:nth-child(${Math.min(renderedNoteIndex + 1, notes.length)}) .edit-button`,
      )
    );
    if (nextFocusTarget) nextFocusTarget.focus();
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    addNote();
  });

  input.addEventListener("input", updateComposerState);
  searchInput.addEventListener("input", () => renderNotes());

  notesList.addEventListener("click", (event) => {
    const target = /** @type {Element | null} */ (event.target);
    const button = /** @type {HTMLButtonElement | null} */ (
      target?.closest("button[data-action]") ?? null
    );
    if (!button) return;

    const { action, noteId } = button.dataset;
    if (!noteId) return;

    if (action === "edit") beginEditing(noteId);
    if (action === "cancel") cancelEditing();
    if (action === "save") saveEdit(noteId);
    if (action === "delete") deleteNote(noteId);
    if (action === "pin") togglePin(noteId);
  });

  notesList.addEventListener("keydown", (event) => {
    const target = /** @type {Element | null} */ (event.target);
    const textarea = /** @type {HTMLTextAreaElement | null} */ (
      target?.closest(".edit-textarea") ?? null
    );
    if (!textarea) return;

    if (event.key === "Escape") {
      event.preventDefault();
      cancelEditing();
    }

    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      const noteId = textarea.dataset.editInput;
      if (noteId) saveEdit(noteId);
    }
  });

  updateComposerState();
  renderNotes();
})();
