"use client";

import { useState } from "react";

function formatTag(value: string) {
  const tag = value.trim().replace(/\s+/g, "").replace(/^#+/, "");
  return tag ? `#${tag}` : null;
}

export function TagInput({
  id,
  tags,
  onChange,
  placeholder = "Type a tag, then press Enter",
}: {
  id: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}) {
  const [value, setValue] = useState("");

  function addTag() {
    const tag = formatTag(value);
    setValue("");
    if (
      !tag ||
      tags.some((existing) => existing.toLowerCase() === tag.toLowerCase())
    ) {
      return;
    }
    onChange([...tags, tag]);
  }

  function removeTag(tag: string) {
    onChange(tags.filter((existing) => existing !== tag));
  }

  return (
    <div className="border-input focus-within:border-ring focus-within:ring-ring/50 flex min-h-10 flex-wrap items-center gap-1.5 border bg-transparent px-2 py-1.5 focus-within:ring-[3px]">
      {tags.map((tag) => (
        <span
          key={tag}
          className="bg-secondary text-secondary-foreground inline-flex items-center gap-1 px-2 py-1 font-mono text-[10px] uppercase"
        >
          {tag}
          <button
            type="button"
            onClick={() => removeTag(tag)}
            className="hover:text-foreground leading-none"
            aria-label={`Remove ${tag}`}
          >
            x
          </button>
        </span>
      ))}
      <input
        id={id}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === ",") {
            event.preventDefault();
            addTag();
          }
          if (event.key === "Backspace" && !value && tags.length > 0) {
            onChange(tags.slice(0, -1));
          }
        }}
        onBlur={addTag}
        placeholder={tags.length === 0 ? placeholder : "Add tag"}
        className="placeholder:text-muted-foreground min-w-28 flex-1 bg-transparent px-1 py-1 font-mono text-sm outline-none"
      />
    </div>
  );
}
