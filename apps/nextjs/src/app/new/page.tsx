"use client";

import { useState } from "react";

import { SiteFooter, SiteNav } from "~/app/_components/site-nav";

interface DraftItem {
  id: string;
  url: string;
  title: string;
  creator: string;
  note: string;
}

function emptyItem(): DraftItem {
  return {
    id: Math.random().toString(36).slice(2),
    url: "",
    title: "",
    creator: "",
    note: "",
  };
}

export default function NewCollectionPage() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [items, setItems] = useState<DraftItem[]>([emptyItem()]);

  const updateItem = (id: string, patch: Partial<DraftItem>) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    );
  };
  const removeItem = (id: string) => {
    setItems((prev) =>
      prev.length === 1 ? prev : prev.filter((it) => it.id !== id),
    );
  };
  const addItem = () => setItems((prev) => [...prev, emptyItem()]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main className="max-w-3xl mx-auto px-6 py-12 animate-reveal">
        <header className="mb-10 border-b border-foreground pb-6">
          <div className="font-mono text-[10px] text-primary uppercase tracking-widest mb-3">
            Composer / Draft
          </div>
          <h1 className="text-4xl font-semibold tracking-tighter">
            Begin a collection
          </h1>
          <p className="text-muted mt-3 text-sm">
            A collection is a small museum. Give it a title, a thesis, and add
            as many items as you like — each with a clear source.
          </p>
        </header>

        <form
          className="space-y-12"
          onSubmit={(e) => {
            e.preventDefault();
            alert(
              `Prototype: draft saved with ${items.length} item${items.length === 1 ? "" : "s"}.`,
            );
          }}
        >
          <section className="space-y-4">
            <span className="font-mono text-[10px] text-primary uppercase tracking-widest">
              01 / Identity
            </span>
            <label className="block">
              <span className="font-mono text-[10px] text-muted uppercase tracking-widest">
                Title
              </span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Late-night Brutalist Reading"
                className="mt-2 w-full bg-paper border border-border px-4 py-3 text-lg font-semibold tracking-tight focus:outline-none focus:border-foreground"
              />
            </label>
            <label className="block">
              <span className="font-mono text-[10px] text-muted uppercase tracking-widest">
                Thesis / description
              </span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="What is this collection arguing for?"
                className="mt-2 w-full bg-paper border border-border px-4 py-3 font-serif italic text-lg focus:outline-none focus:border-foreground"
              />
            </label>
            <label className="block">
              <span className="font-mono text-[10px] text-muted uppercase tracking-widest">
                Tags
              </span>
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="#brutalism #concrete #archive"
                className="mt-2 w-full bg-paper border border-border px-4 py-3 font-mono text-sm focus:outline-none focus:border-foreground"
              />
            </label>
          </section>

          <section className="space-y-6 border-t border-border pt-10">
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-[10px] text-primary uppercase tracking-widest">
                02 / Items ({items.length})
              </span>
              <span className="font-mono text-[10px] text-muted uppercase tracking-widest">
                Add as many as you need
              </span>
            </div>

            <div className="space-y-4">
              {items.map((item, index) => (
                <article
                  key={item.id}
                  className="border border-border bg-paper p-5 space-y-4 relative"
                >
                  <header className="flex items-center justify-between border-b border-border pb-3">
                    <span className="font-mono text-[10px] text-muted uppercase tracking-widest">
                      Item {String(index + 1).padStart(2, "0")}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      disabled={items.length === 1}
                      className="font-mono text-[10px] uppercase tracking-widest text-muted hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label={`Remove item ${index + 1}`}
                    >
                      × Remove
                    </button>
                  </header>

                  <label className="block">
                    <span className="font-mono text-[10px] text-muted uppercase tracking-widest">
                      Source URL (required)
                    </span>
                    <input
                      value={item.url}
                      onChange={(e) =>
                        updateItem(item.id, { url: e.target.value })
                      }
                      placeholder="https://"
                      className="mt-2 w-full bg-background border border-border px-3 py-2 font-mono text-sm focus:outline-none focus:border-foreground"
                    />
                  </label>

                  <div className="grid md:grid-cols-2 gap-4">
                    <label className="block">
                      <span className="font-mono text-[10px] text-muted uppercase tracking-widest">
                        Title
                      </span>
                      <input
                        value={item.title}
                        onChange={(e) =>
                          updateItem(item.id, { title: e.target.value })
                        }
                        className="mt-2 w-full bg-background border border-border px-3 py-2 focus:outline-none focus:border-foreground"
                      />
                    </label>
                    <label className="block">
                      <span className="font-mono text-[10px] text-muted uppercase tracking-widest">
                        Attributed to
                      </span>
                      <input
                        value={item.creator}
                        onChange={(e) =>
                          updateItem(item.id, { creator: e.target.value })
                        }
                        placeholder="Original creator"
                        className="mt-2 w-full bg-background border border-border px-3 py-2 focus:outline-none focus:border-foreground"
                      />
                    </label>
                  </div>

                  <label className="block">
                    <span className="font-mono text-[10px] text-muted uppercase tracking-widest">
                      Your note
                    </span>
                    <textarea
                      value={item.note}
                      onChange={(e) =>
                        updateItem(item.id, { note: e.target.value })
                      }
                      rows={3}
                      placeholder="Why does this belong here?"
                      className="mt-2 w-full bg-background border border-border px-3 py-2 font-serif italic text-base focus:outline-none focus:border-foreground"
                    />
                  </label>
                </article>
              ))}
            </div>

            <button
              type="button"
              onClick={addItem}
              className="w-full border border-dashed border-border bg-transparent hover:border-foreground hover:text-foreground text-muted py-4 font-mono text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-colors"
            >
              + Add another item
            </button>
          </section>

          <div className="flex items-center justify-between pt-8 border-t border-foreground">
            <span className="font-mono text-[10px] text-muted uppercase tracking-widest">
              Draft / not yet public · {items.length} item
              {items.length === 1 ? "" : "s"}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                className="px-4 py-3 border border-border bg-paper hover:border-primary hover:text-primary font-mono text-[10px] uppercase tracking-widest"
              >
                Save draft
              </button>
              <button
                type="submit"
                className="px-4 py-3 bg-foreground text-background hover:bg-primary font-mono text-[10px] uppercase tracking-widest"
              >
                Publish collection
              </button>
            </div>
          </div>
        </form>
      </main>
      <SiteFooter />
    </div>
  );
}
