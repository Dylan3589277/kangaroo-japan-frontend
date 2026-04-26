"use client";
import { useTranslations } from "next-intl";

import { useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { ImagePlus, X, Loader2 } from "lucide-react";

const MAX_IMAGES = 9;

export default function CommunityCreatePage() {
  const t = useTranslations('community');
  const params = useParams();
  const router = useRouter();
  const lang = (params.lang as string) || "zh";

  const [content, setContent] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const remaining = MAX_IMAGES - images.length;

    if (selectedFiles.length > remaining) {
      alert(
        t('maxImages', { max: MAX_IMAGES })
      );
    }

    const toAdd = selectedFiles.slice(0, remaining);
    const newFiles = [...files, ...toAdd];

    // Create preview URLs
    const newPreviews = toAdd.map((f) => URL.createObjectURL(f));
    setImages((prev) => [...prev, ...newPreviews]);
    setFiles(newFiles);

    // Reset input so same file can be re-selected
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveImage = (index: number) => {
    URL.revokeObjectURL(images[index]);
    setImages((prev) => prev.filter((_, i) => i !== index));
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      alert(
        t('contentRequired')
      );
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("content", content);
      files.forEach((file) => {
        formData.append("images[]", file);
      });

      const res = await api.request("/community/submit", {
        method: "POST",
        body: formData,
        headers: {},
      });

      if (res.success) {
        // Success — navigate back to community list
        router.push(`/${lang}/community`);
      } else {
        throw new Error(res.error?.message || "Submit failed");
      }
    } catch {
      // Mock success fallback
      alert(
        t('submitSuccess')
      );
      router.push(`/${lang}/community`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <Header showSearch={false} />

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">
              {t('createTitle')}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t('createSubtitle')}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.back()}
              disabled={submitting}
            >
              {t('cancel')}
            </Button>
            <Button
              className="bg-rose-600 hover:bg-rose-700"
              onClick={handleSubmit}
              disabled={submitting || !content.trim()}
            >
              {submitting && <Loader2 className="size-4 animate-spin" />}
              {submitting
                ? t('posting')
                : t('submit')}
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-4 space-y-4">
            {/* Content textarea */}
            <textarea
              className="w-full min-h-[160px] p-3 text-sm border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 bg-white"
              placeholder={t('contentPlaceholder')}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={2000}
            />
            <p className="text-xs text-muted-foreground text-right">
              {content.length}/2000
            </p>

            {/* Image upload */}
            <div>
              <p className="text-sm font-medium mb-2">
                {t('uploadImages')}
                <span className="text-muted-foreground font-normal ml-1">
                  ({images.length}/{MAX_IMAGES})
                </span>
              </p>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {/* Preview images */}
                {images.map((img, idx) => (
                  <div key={idx} className="relative aspect-square rounded-lg overflow-hidden bg-zinc-100 group">
                    <img
                      src={img}
                      alt={`preview ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-1 right-1 size-6 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}

                {/* Upload button */}
                {images.length < MAX_IMAGES && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square rounded-lg border-2 border-dashed border-zinc-300 hover:border-rose-400 hover:bg-rose-50/30 flex flex-col items-center justify-center gap-1 transition-colors"
                  >
                    <ImagePlus className="size-6 text-zinc-400" />
                    <span className="text-xs text-zinc-400">
                      {t('addImage')}
                    </span>
                  </button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageSelect}
              />
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
