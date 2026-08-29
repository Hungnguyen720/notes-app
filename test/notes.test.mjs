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
