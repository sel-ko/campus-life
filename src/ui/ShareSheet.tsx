import { useEffect, useState } from 'react';
import { drawShareCard, type ShareCardData } from './shareCard';
import { whatsappLink } from './site';

// Full-screen sheet with the results card, "Save image" and WhatsApp share.
export function ShareSheet({ data, onClose }: { data: ShareCardData; onClose: () => void }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const canvas = document.createElement('canvas');
    drawShareCard(canvas, data);
    let url: string | null = null;
    canvas.toBlob((blob) => {
      if (!blob) return;
      url = URL.createObjectURL(blob);
      setImageUrl(url);
    }, 'image/png');
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [data]);

  return (
    <div className="fade-in fixed inset-0 z-[70] flex flex-col bg-night">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Share</h2>
          <button onClick={onClose} className="min-h-11 min-w-11 text-2xl text-muted" aria-label="Close">
            ×
          </button>
        </div>

        {imageUrl ? (
          <img src={imageUrl} alt="Your share card" className="w-full rounded-xl border border-line" />
        ) : (
          <div className="flex aspect-[4/5] items-center justify-center rounded-xl border border-line text-muted">
            Drawing your card…
          </div>
        )}

        <div className="flex flex-col gap-2">
          <a
            href={imageUrl ?? undefined}
            download="campus-life-result.png"
            aria-disabled={!imageUrl}
            className="flex min-h-12 items-center justify-center rounded-lg border border-line bg-panel font-bold"
          >
            Save image
          </a>
          <a
            href={whatsappLink(data.message)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-12 items-center justify-center rounded-lg bg-[#25D366] font-bold text-night"
          >
            Share on WhatsApp
          </a>
          <p className="text-center text-xs text-muted">Tip: save the image first, then attach it in WhatsApp.</p>
        </div>
      </div>
    </div>
  );
}
