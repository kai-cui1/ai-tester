import { useState, useCallback, useEffect } from "react";
import { X, ZoomIn, ZoomOut } from "lucide-react";

interface LightboxProps {
  src: string;
  alt?: string;
  children: React.ReactNode;
  className?: string;
}

export function Lightbox({ src, alt, children, className }: LightboxProps) {
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(1);

  const close = useCallback(() => {
    setOpen(false);
    setZoom(1);
  }, []);

  const toggleZoom = useCallback(() => {
    setZoom((z) => (z >= 2 ? 1 : z + 0.5));
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, close]);

  return (
    <>
      <div
        className={`cursor-pointer hover:opacity-80 transition-opacity ${className ?? ""}`}
        onClick={() => setOpen(true)}
      >
        {children}
      </div>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={close}
        >
          {/* Close button */}
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white z-10"
            onClick={close}
          >
            <X className="h-6 w-6" />
          </button>
          {/* Zoom toggle */}
          <button
            className="absolute top-4 right-14 text-white/80 hover:text-white z-10"
            onClick={(e) => {
              e.stopPropagation();
              toggleZoom();
            }}
          >
            {zoom >= 2 ? <ZoomOut className="h-6 w-6" /> : <ZoomIn className="h-6 w-6" />}
          </button>
          {/* Image */}
          <img
            src={src}
            alt={alt ?? "Preview"}
            className="max-h-[90vh] max-w-[90vw] object-contain transition-transform duration-200"
            style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
