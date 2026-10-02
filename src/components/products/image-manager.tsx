"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty-state";
import type { ProductImageDto } from "@/types/product";

/**
 * Product image manager. The database only stores references — image files
 * live in object storage, whose provider is still undecided (PRD §14.2), so
 * sellers attach an image URL for now.
 */
export function ImageManager({
  productId,
  images,
}: {
  productId: string;
  images: ProductImageDto[];
}) {
  const router = useRouter();
  const [imageUrl, setImageUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function addImage() {
    if (!/^https?:\/\/.+\..+/.test(imageUrl.trim())) {
      setError("Enter a full image URL starting with http:// or https://.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api(`/api/products/${productId}/images`, {
        method: "POST",
        body: JSON.stringify({ imageUrl: imageUrl.trim(), displayOrder: images.length }),
      });
      setImageUrl("");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "We could not add that image.");
    } finally {
      setBusy(false);
    }
  }

  async function removeImage(imageId: string) {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/products/${productId}/images/${imageId}`, { method: "DELETE" });
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "We could not remove that image.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <h2 className="font-heading text-base text-body">Images</h2>
      <p className="mt-1 text-xs text-muted">
        Attach public image URLs for now. Direct uploads arrive with the storage integration.
      </p>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {images.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title="No images yet"
            description="Listings with clear product photos get more buyer enquiries."
          />
        </div>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-3">
          {images.map((image) => (
            <li key={image.id} className="rounded-md border border-subtle bg-surface p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.imageUrl}
                alt=""
                className="h-28 w-full rounded bg-background object-cover"
              />
              <Button
                variant="ghost"
                className="mt-2 w-full"
                disabled={busy}
                onClick={() => void removeImage(image.id)}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="min-w-64 flex-1">
          <Field id="imageUrl" label="Image URL" error={undefined}>
            <Input
              id="imageUrl"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://cdn.example.com/bedsheet-king.jpg"
            />
          </Field>
        </div>
        <Button type="button" disabled={busy} onClick={() => void addImage()}>
          {busy ? "Working…" : "Add image"}
        </Button>
      </div>
    </section>
  );
}
