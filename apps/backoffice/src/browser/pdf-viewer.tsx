import { useEffect, useRef, useState } from 'react';
import {
  getDocument,
  GlobalWorkerOptions,
  type PDFDocumentProxy,
  type RenderTask,
} from 'pdfjs-dist';
import { XMarkIcon, MinusIcon, PlusIcon } from '@heroicons/react/20/solid';
import type { ConsultationReport } from '../contact-types';
import { Dialog, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';

GlobalWorkerOptions.workerSrc = '/assets/pdf.worker.min.mjs';

export function PdfViewer({
  report,
  onClose,
}: {
  report: ConsultationReport;
  onClose: () => void;
}) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [width, setWidth] = useState(0);
  const [error, setError] = useState(false);
  const [rendering, setRendering] = useState(true);
  const canvas = useRef<HTMLCanvasElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const url = `/api/consultation-pdf?id=${encodeURIComponent(report.id)}`;

  useEffect(() => {
    let active = true;
    const task = getDocument({
      url,
      disableFontFace: true,
      useWasm: false,
      standardFontDataUrl: '/assets/pdf-fonts/',
    });
    void task.promise
      .then((document) => {
        if (active) setPdf(document);
      })
      .catch(() => {
        if (active) {
          setError(true);
          setRendering(false);
        }
      });
    return () => {
      active = false;
      void task.destroy();
    };
  }, [url]);

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new ResizeObserver(() =>
      setWidth(element.clientWidth - 32)
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!pdf || !width || !canvas.current) return;
    let active = true;
    let task: RenderTask | undefined;
    setRendering(true);
    setError(false);
    void pdf
      .getPage(page)
      .then((pdfPage) => {
        if (!active || !canvas.current) return;
        const viewport = pdfPage.getViewport({
          scale:
            (Math.max(100, width) / pdfPage.getViewport({ scale: 1 }).width) *
            zoom,
        });
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        const element = canvas.current;
        element.width = Math.floor(viewport.width * ratio);
        element.height = Math.floor(viewport.height * ratio);
        element.style.width = `${Math.floor(viewport.width)}px`;
        element.style.height = `${Math.floor(viewport.height)}px`;
        task = pdfPage.render({
          canvas: element,
          viewport,
          transform: [ratio, 0, 0, ratio, 0, 0],
        });
        return task.promise;
      })
      .then(() => {
        if (active) setRendering(false);
      })
      .catch(() => {
        if (active) {
          setError(true);
          setRendering(false);
        }
      });
    return () => {
      active = false;
      task?.cancel();
    };
  }, [pdf, page, zoom, width]);

  return (
    <Dialog
      open
      onClose={onClose}
      size="5xl"
      className="[--gutter:--spacing(4)] sm:[--gutter:--spacing(6)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <DialogTitle>Compte rendu de consultation</DialogTitle>
          <p className="mt-1 break-words text-sm text-zinc-500">
            {report.filename}
          </p>
        </div>
        <Button plain aria-label="Fermer le visionneur" onClick={onClose}>
          <XMarkIcon />
        </Button>
      </div>
      <div
        className="my-4 flex flex-wrap items-center justify-between gap-3"
        aria-label="Commandes du PDF"
      >
        <div className="flex items-center gap-2">
          <Button
            outline
            disabled={!pdf || page <= 1}
            onClick={() => setPage(page - 1)}
            aria-label="Page précédente"
          >
            ←
          </Button>
          <span className="text-sm tabular-nums">
            Page {page} sur {pdf?.numPages ?? '…'}
          </span>
          <Button
            outline
            disabled={!pdf || page >= pdf.numPages}
            onClick={() => setPage(page + 1)}
            aria-label="Page suivante"
          >
            →
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            plain
            disabled={zoom <= 0.75}
            aria-label="Réduire le zoom"
            onClick={() => setZoom(Math.max(0.75, zoom - 0.25))}
          >
            <MinusIcon />
          </Button>
          <span className="text-sm tabular-nums">
            {Math.round(zoom * 100)} %
          </span>
          <Button
            plain
            disabled={zoom >= 2}
            aria-label="Agrandir le zoom"
            onClick={() => setZoom(Math.min(2, zoom + 0.25))}
          >
            <PlusIcon />
          </Button>
          <Button outline href={url}>
            Télécharger
          </Button>
        </div>
      </div>
      {error && (
        <p role="alert" className="mb-3 text-sm text-amber-800">
          Impossible d’afficher ce PDF. Vous pouvez le télécharger ou fermer
          puis rouvrir le visionneur.
        </p>
      )}
      {rendering && !error && (
        <p role="status" className="mb-3 text-sm text-zinc-500">
          Chargement de la page…
        </p>
      )}
      <div
        ref={container}
        className="max-h-[65dvh] min-h-40 overflow-auto rounded-lg bg-zinc-100 p-4"
        tabIndex={0}
        aria-label="Document PDF"
        aria-busy={rendering}
      >
        <canvas
          ref={canvas}
          className="mx-auto bg-white shadow-sm"
          aria-label={`Page ${page} du compte rendu`}
        >
          Le contenu du PDF est disponible avec le bouton Télécharger.
        </canvas>
      </div>
    </Dialog>
  );
}
