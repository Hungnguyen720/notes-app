import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { JSDOM } from "jsdom";

const storageKey = "notes-app.notes.v1";
const [html, clientScript] = await Promise.all([
  readFile(new URL("../index.html", import.meta.url), "utf8"),
  readFile(new URL("../script.js", import.meta.url), "utf8"),
]);

function bootApp(storedNotes) {
  const dom = new JSDOM(html, {
    runScripts: "outside-only",
    url: "https://notes.test/",
  });

  if (storedNotes !== undefined) {
    dom.window.localStorage.setItem(storageKey, storedNotes);
  }

  dom.window.eval(clientScript);
  return dom;
}

function storedNote({
  id,
  text,
  createdAt,
  updatedAt = createdAt,
  pinned,
}) {
  return {
    id,
    text,
    createdAt,
    updatedAt,
    ...(pinned === undefined ? {} : { pinned }),
  };
}

function cardTexts(document) {
  return Array.from(document.querySelectorAll(".note-card .note-text"), (note) =>
    note.textContent,
  );
}

function findCard(document, noteId) {
  return document.querySelector(`.note-card[data-note-id="${noteId}"]`);
}

test("a note can be created, restored, edited, and deleted", () => {
  const firstSession = bootApp();
  let restoredSession;

  try {
    const { document, Event } = firstSession.window;
    const input = document.querySelector("#note-input");
    const form = document.querySelector("#note-form");
    const addButton = document.querySelector("#add-note-button");

    input.value = "Remember the benchmark";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    assert.equal(addButton.disabled, false);

    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    assert.equal(document.querySelectorAll(".note-card").length, 1);
    assert.equal(document.querySelector(".note-text").textContent, "Remember the benchmark");

    const persistedNote = firstSession.window.localStorage.getItem(storageKey);
    const storedNotes = JSON.parse(persistedNote);
    assert.equal(storedNotes.length, 1);
    assert.equal(storedNotes[0].text, "Remember the benchmark");
    assert.equal(storedNotes[0].pinned, false);

    restoredSession = bootApp(persistedNote);
    const restoredDocument = restoredSession.window.document;
    assert.equal(restoredDocument.querySelector(".note-text").textContent, "Remember the benchmark");

    restoredDocument.querySelector(".edit-button").click();
    const editInput = restoredDocument.querySelector(".edit-textarea");
    editInput.value = "Benchmark baseline is ready";
    restoredDocument.querySelector(".save-button").click();

    assert.equal(
      restoredDocument.querySelector(".note-text").textContent,
      "Benchmark baseline is ready",
    );
    assert.equal(
      JSON.parse(restoredSession.window.localStorage.getItem(storageKey))[0].text,
      "Benchmark baseline is ready",
    );

    restoredDocument.querySelector(".delete-button").click();
    assert.equal(restoredDocument.querySelectorAll(".note-card").length, 0);
    assert.equal(restoredDocument.querySelector("#empty-state").hidden, false);
    assert.deepEqual(JSON.parse(restoredSession.window.localStorage.getItem(storageKey)), []);
  } finally {
    firstSession.window.close();
    restoredSession?.window.close();
  }
});

test("note cards expose exact native pin button labels", () => {
  const dom = bootApp(
    JSON.stringify([
      storedNote({ id: "newer", text: "Newer unpinned", createdAt: 200, pinned: false }),
      storedNote({ id: "older", text: "Older pinned", createdAt: 100, pinned: true }),
    ]),
  );

  try {
    const { document, HTMLButtonElement } = dom.window;
    const pinnedButton = findCard(document, "older").querySelector(".pin-button");
    const unpinnedButton = findCard(document, "newer").querySelector(".pin-button");

    assert.ok(pinnedButton instanceof HTMLButtonElement);
    assert.ok(unpinnedButton instanceof HTMLButtonElement);
    assert.equal(pinnedButton.textContent, "Unpin note");
    assert.equal(pinnedButton.getAttribute("aria-pressed"), "true");
    assert.equal(unpinnedButton.textContent, "Pin note");
    assert.equal(unpinnedButton.getAttribute("aria-pressed"), "false");
  } finally {
    dom.window.close();
  }
});

test("pinning toggles only the selected note's pinned state", () => {
  const originalNotes = [
    storedNote({
      id: "selected",
      text: "Keep this text",
      createdAt: 200,
      updatedAt: 250,
      pinned: false,
    }),
    storedNote({ id: "other", text: "Leave me alone", createdAt: 100, pinned: false }),
  ];
  const dom = bootApp(JSON.stringify(originalNotes));

  try {
    const { document } = dom.window;
    findCard(document, "selected").querySelector(".pin-button").click();

    let persistedNotes = JSON.parse(dom.window.localStorage.getItem(storageKey));
    assert.deepEqual(
      persistedNotes.find((note) => note.id === "selected"),
      { ...originalNotes[0], pinned: true },
    );
    assert.deepEqual(persistedNotes.find((note) => note.id === "other"), originalNotes[1]);
    assert.equal(findCard(document, "selected").querySelector(".pin-button").textContent, "Unpin note");

    findCard(document, "selected").querySelector(".pin-button").click();
    persistedNotes = JSON.parse(dom.window.localStorage.getItem(storageKey));
    assert.deepEqual(persistedNotes.find((note) => note.id === "selected"), originalNotes[0]);
  } finally {
    dom.window.close();
  }
});

test("pinned and unpinned groups each render newest first", () => {
  const dom = bootApp(
    JSON.stringify([
      storedNote({ id: "unpinned-old", text: "Unpinned old", createdAt: 100, pinned: false }),
      storedNote({ id: "pinned-old", text: "Pinned old", createdAt: 200, pinned: true }),
      storedNote({ id: "unpinned-new", text: "Unpinned new", createdAt: 400, pinned: false }),
      storedNote({ id: "pinned-new", text: "Pinned new", createdAt: 500, pinned: true }),
    ]),
  );

  try {
    assert.deepEqual(cardTexts(dom.window.document), [
      "Pinned new",
      "Pinned old",
      "Unpinned new",
      "Unpinned old",
    ]);
  } finally {
    dom.window.close();
  }
});

test("pinned state persists and is restored after reload", () => {
  const firstSession = bootApp(
    JSON.stringify([
      storedNote({ id: "persistent", text: "Persistent pin", createdAt: 100, pinned: false }),
    ]),
  );
  let restoredSession;

  try {
    findCard(firstSession.window.document, "persistent").querySelector(".pin-button").click();
    const persistedNotes = firstSession.window.localStorage.getItem(storageKey);

    restoredSession = bootApp(persistedNotes);
    const restoredCard = findCard(restoredSession.window.document, "persistent");
    assert.equal(restoredCard.dataset.pinned, "true");
    assert.equal(restoredCard.querySelector(".pin-button").textContent, "Unpin note");
    assert.equal(JSON.parse(persistedNotes)[0].pinned, true);
  } finally {
    firstSession.window.close();
    restoredSession?.window.close();
  }
});

test("legacy notes without pinned load as unpinned", () => {
  const dom = bootApp(
    JSON.stringify([storedNote({ id: "legacy", text: "Legacy note", createdAt: 100 })]),
  );

  try {
    const card = findCard(dom.window.document, "legacy");
    assert.equal(card.dataset.pinned, "false");
    assert.equal(card.querySelector(".pin-button").textContent, "Pin note");

    card.querySelector(".pin-button").click();
    assert.equal(JSON.parse(dom.window.localStorage.getItem(storageKey))[0].pinned, true);
  } finally {
    dom.window.close();
  }
});

test("editing preserves pinned state for pinned and unpinned notes", () => {
  const dom = bootApp(
    JSON.stringify([
      storedNote({ id: "pinned", text: "Pinned before", createdAt: 100, pinned: true }),
      storedNote({ id: "unpinned", text: "Unpinned before", createdAt: 200, pinned: false }),
    ]),
  );

  try {
    const { document } = dom.window;

    for (const [noteId, replacement] of [
      ["pinned", "Pinned after"],
      ["unpinned", "Unpinned after"],
    ]) {
      findCard(document, noteId).querySelector(".edit-button").click();
      const input = findCard(document, noteId).querySelector(".edit-textarea");
      input.value = replacement;
      findCard(document, noteId).querySelector(".save-button").click();
    }

    const persistedNotes = JSON.parse(dom.window.localStorage.getItem(storageKey));
    assert.equal(persistedNotes.find((note) => note.id === "pinned").pinned, true);
    assert.equal(persistedNotes.find((note) => note.id === "unpinned").pinned, false);
    assert.equal(findCard(document, "pinned").querySelector(".note-text").textContent, "Pinned after");
    assert.equal(
      findCard(document, "unpinned").querySelector(".note-text").textContent,
      "Unpinned after",
    );
  } finally {
    dom.window.close();
  }
});

test("deleting works for pinned and unpinned notes", () => {
  const dom = bootApp(
    JSON.stringify([
      storedNote({ id: "pinned", text: "Pinned", createdAt: 100, pinned: true }),
      storedNote({ id: "unpinned", text: "Unpinned", createdAt: 200, pinned: false }),
    ]),
  );

  try {
    const { document } = dom.window;
    findCard(document, "pinned").querySelector(".delete-button").click();
    assert.equal(findCard(document, "pinned"), null);
    assert.deepEqual(cardTexts(document), ["Unpinned"]);

    findCard(document, "unpinned").querySelector(".delete-button").click();
    assert.equal(document.querySelectorAll(".note-card").length, 0);
    assert.deepEqual(JSON.parse(dom.window.localStorage.getItem(storageKey)), []);
  } finally {
    dom.window.close();
  }
});

test("search filters note text live and case-insensitively", () => {
  const dom = bootApp(
    JSON.stringify([
      storedNote({ id: "first", text: "Plan the Roadmap", createdAt: 100 }),
      storedNote({ id: "second", text: "Buy groceries", createdAt: 200 }),
      storedNote({ id: "third", text: "Road bike maintenance", createdAt: 300 }),
    ]),
  );

  try {
    const { document, Event } = dom.window;
    const search = document.querySelector("#note-search");

    assert.equal(search.labels[0].textContent, "Search notes");
    search.value = "ROAD";
    search.dispatchEvent(new Event("input", { bubbles: true }));

    assert.deepEqual(cardTexts(document), ["Road bike maintenance", "Plan the Roadmap"]);
    assert.equal(document.querySelector("#notes-summary").textContent, "2 of 3 notes");
  } finally {
    dom.window.close();
  }
});

test("clearing search restores all notes in canonical order", () => {
  const dom = bootApp(
    JSON.stringify([
      storedNote({ id: "unpinned-new", text: "Unpinned new", createdAt: 400, pinned: false }),
      storedNote({ id: "pinned-old", text: "Pinned old", createdAt: 100, pinned: true }),
      storedNote({ id: "unpinned-old", text: "Unpinned old", createdAt: 200, pinned: false }),
    ]),
  );

  try {
    const { document, Event } = dom.window;
    const search = document.querySelector("#note-search");
    search.value = "pinned old";
    search.dispatchEvent(new Event("input", { bubbles: true }));
    assert.deepEqual(cardTexts(document), ["Pinned old", "Unpinned old"]);

    search.value = "";
    search.dispatchEvent(new Event("input", { bubbles: true }));
    assert.deepEqual(cardTexts(document), ["Pinned old", "Unpinned new", "Unpinned old"]);
    assert.equal(document.querySelector("#notes-summary").textContent, "3 notes, saved locally");
  } finally {
    dom.window.close();
  }
});

test("an unmatched search displays a clear no-matches state", () => {
  const dom = bootApp(
    JSON.stringify([storedNote({ id: "note", text: "Existing note", createdAt: 100 })]),
  );

  try {
    const { document, Event } = dom.window;
    const search = document.querySelector("#note-search");
    search.value = "absent";
    search.dispatchEvent(new Event("input", { bubbles: true }));

    assert.deepEqual(cardTexts(document), []);
    assert.equal(document.querySelector("#no-matches-state").hidden, false);
    assert.equal(
      document.querySelector("#no-matches-state h3").textContent,
      "No matching notes",
    );
    assert.equal(document.querySelector("#empty-state").hidden, true);
  } finally {
    dom.window.close();
  }
});

test("search does not mutate note data, ordering, pin state, or local storage", () => {
  const originalNotes = [
    storedNote({ id: "first", text: "Alpha note", createdAt: 100, pinned: false }),
    storedNote({ id: "second", text: "Beta note", createdAt: 200, pinned: true }),
  ];
  const serializedNotes = JSON.stringify(originalNotes);
  const dom = bootApp(serializedNotes);

  try {
    const { document, Event } = dom.window;
    const search = document.querySelector("#note-search");
    search.value = "alpha";
    search.dispatchEvent(new Event("input", { bubbles: true }));
    search.value = "";
    search.dispatchEvent(new Event("input", { bubbles: true }));

    assert.deepEqual(cardTexts(document), ["Beta note", "Alpha note"]);
    assert.equal(findCard(document, "second").dataset.pinned, "true");
    assert.equal(dom.window.localStorage.getItem(storageKey), serializedNotes);
    assert.deepEqual(JSON.parse(dom.window.localStorage.getItem(storageKey)), originalNotes);
  } finally {
    dom.window.close();
  }
});
