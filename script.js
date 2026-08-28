(() => {
  "use strict";

  const STORAGE_KEY = "notes-app.notes.v1";
  const MAX_NOTE_LENGTH = 1000;

  const form = document.querySelector("#note-form");
  const input = document.querySelector("#note-input");
  const addButton = document.querySelector("#add-note-button");
  const characterCount = document.querySelector("#character-count");
  const formError = document.querySelector("#note-error");
  const notesList = document.querySelector("#notes-list");
  const emptyState = document.querySelector("#empty-state");
  const notesSummary = document.querySelector("#notes-summary");
  const statusMessage = document.querySelector("#status-message");
  const storageNote = document.querySelector("#storage-note");
  const storageLabel = document.querySelector("#storage-label");

  let notes = loadNotes();
  let editingNoteId = null;

  function createId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function isStoredNote(value) {
    return (
      value !== null &&
      typeof value === "object" &&
      typeof value.id === "string" &&
      typeof value.text === "string" &&
      value.text.trim().length > 0 &&
      value.text.length <= MAX_NOTE_LENGTH &&
      /^[A-Za-z0-9_-]+$/.test(value.id) &&
      Number.isFinite(value.createdAt) &&
      Number.isFinite(value.updatedAt) &&
      !Number.isNaN(new Date(value.createdAt).getTime()) &&
      !Number.isNaN(new Date(value.updatedAt).getTime())
    );
  }

  function setStorageAvailable(isAvailable) {
    storageNote.classList.toggle("is-unavailable", !isAvailable);
    storageLabel.textContent = isAvailable
      ? "Saved locally on this device"
      : "Browser storage is unavailable; changes may not persist";
  }

  function loadNotes() {
    try {
      const savedValue = localStorage.getItem(STORAGE_KEY);
      if (!savedValue) return [];

      const parsedValue = JSON.parse(savedValue);
      if (!Array.isArray(parsedValue)) return [];

      const seenIds = new Set();
      return parsedValue.filter((note) => {
        if (!isStoredNote(note) || seenIds.has(note.id)) return false;
        seenIds.add(note.id);
        return true;
      });
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

  function showStatus(message) {
    statusMessage.textContent = "";
    window.setTimeout(() => {
      statusMessage.textContent = message;
    }, 20);
  }

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

  function createButton(label, className, action, noteId) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `text-button ${className}`;
    button.dataset.action = action;
    button.dataset.noteId = noteId;
    button.textContent = label;
    return button;
  }

  function renderNote(note) {
    const article = document.createElement("article");
    article.className = "note-card";
    article.dataset.noteId = note.id;

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
    actions.append(
      createButton("Edit", "edit-button", "edit", note.id),
      createButton("Delete", "delete-button", "delete", note.id),
    );

    footer.append(time, actions);
    article.append(text, footer);
    return article;
  }

  function renderNotes(options = {}) {
    notesList.replaceChildren(...notes.map(renderNote));

    const hasNotes = notes.length > 0;
    emptyState.hidden = hasNotes;
    notesSummary.textContent = hasNotes
      ? `${notes.length} ${notes.length === 1 ? "note" : "notes"}, saved locally`
      : "Nothing here yet";

    if (editingNoteId) {
      const editInput = Array.from(notesList.querySelectorAll("[data-edit-input]")).find(
        (element) => element.dataset.editInput === editingNoteId,
      );
      if (options.focusEdit && editInput) {
        editInput.focus();
        editInput.setSelectionRange(editInput.value.length, editInput.value.length);
      }
    }
  }

  function updateComposerState() {
    const currentLength = input.value.length;
    characterCount.textContent = currentLength;
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
    };

    notes = [newNote, ...notes];
    saveNotes();
    input.value = "";
    updateComposerState();
    renderNotes();
    showStatus("Note added.");
    input.focus();
  }

  function beginEditing(noteId) {
    editingNoteId = noteId;
    renderNotes({ focusEdit: true });
  }

  function cancelEditing() {
    editingNoteId = null;
    renderNotes();
    showStatus("Editing canceled.");
  }

  function saveEdit(noteId) {
    const textarea = Array.from(notesList.querySelectorAll("[data-edit-input]")).find(
      (element) => element.dataset.editInput === noteId,
    );
    if (!textarea) return;

    const error = textarea.closest(".note-card").querySelector(".edit-error");
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

  function deleteNote(noteId) {
    const noteIndex = notes.findIndex((note) => note.id === noteId);
    if (noteIndex === -1) return;

    notes = notes.filter((note) => note.id !== noteId);
    if (editingNoteId === noteId) editingNoteId = null;
    saveNotes();
    renderNotes();
    showStatus("Note deleted.");

    const nextFocusTarget = notesList.querySelector(
      `.note-card:nth-child(${Math.min(noteIndex + 1, notes.length)}) .edit-button`,
    );
    if (nextFocusTarget) nextFocusTarget.focus();
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    addNote();
  });

  input.addEventListener("input", updateComposerState);

  notesList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const { action, noteId } = button.dataset;

    if (action === "edit") beginEditing(noteId);
    if (action === "cancel") cancelEditing();
    if (action === "save") saveEdit(noteId);
    if (action === "delete") deleteNote(noteId);
  });

  notesList.addEventListener("keydown", (event) => {
    const textarea = event.target.closest(".edit-textarea");
    if (!textarea) return;

    if (event.key === "Escape") {
      event.preventDefault();
      cancelEditing();
    }

    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      saveEdit(textarea.dataset.editInput);
    }
  });

  updateComposerState();
  renderNotes();
})();
