"use client";

import { useId, useState } from "react";
import { upload } from "@vercel/blob/client";

import { Button } from "@acme/ui/button";
import { Field, FieldContent, FieldLabel } from "@acme/ui/field";
import { Input } from "@acme/ui/input";
import { toast } from "@acme/ui/toast";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

type ImagePurpose = "collection-cover" | "item-thumbnail";

function extensionFor(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  return extension && /^[a-z0-9]+$/.test(extension) ? extension : "image";
}

export function ImageUpload({
  label,
  value,
  onChange,
  purpose,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  purpose: ImagePurpose;
}) {
  const inputId = useId();
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  async function uploadImage(file: File) {
    if (!IMAGE_TYPES.has(file.type)) {
      toast.error("Choose a PNG, JPG, WEBP, or GIF image");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error("Images must be 5 MB or smaller");
      return;
    }

    setIsUploading(true);
    setProgress(0);
    try {
      const blob = await upload(
        `uploads/${purpose}/${crypto.randomUUID()}.${extensionFor(file)}`,
        file,
        {
          access: "public",
          handleUploadUrl: "/api/uploads",
          clientPayload: JSON.stringify({ purpose }),
          onUploadProgress: ({ percentage }) => setProgress(percentage),
        },
      );
      onChange(blob.url);
    } catch {
      toast.error("Image upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <Field>
      <FieldContent>
        <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
      </FieldContent>
      <Input
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        disabled={isUploading}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void uploadImage(file);
          event.target.value = "";
        }}
      />
      {isUploading ? (
        <p className="text-muted font-mono text-[10px] tracking-widest uppercase">
          Uploading {progress}%
        </p>
      ) : null}
      {value ? (
        <div className="border-border relative mt-2 aspect-video overflow-hidden border bg-stone-100">
          <img
            src={value}
            alt="Uploaded preview"
            className="h-full w-full object-cover"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange("")}
            className="bg-background absolute top-2 right-2"
          >
            Remove
          </Button>
        </div>
      ) : null}
    </Field>
  );
}
