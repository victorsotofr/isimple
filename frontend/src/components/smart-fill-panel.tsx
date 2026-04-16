'use client';

import { useState, useRef } from 'react';
import { Sparkles, Upload, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SmartFillPanelProps {
  type: 'lot' | 'tenant';
  onFill: (data: Record<string, unknown>) => void;
  onClose: () => void;
}

const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
  });

export function SmartFillPanel({ type, onFill, onClose }: SmartFillPanelProps) {
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const placeholder =
    type === 'lot'
      ? 'Ex : Appartement 45m² au 12 rue de la Paix Paris 75001, loyer 1 200 € + 80 € charges'
      : 'Ex : Jean Dupont, jean.dupont@gmail.com, 06 12 34 56 78';

  const handleFile = (f: File) => {
    if (f.type === 'application/pdf' || f.type.startsWith('image/')) {
      setFile(f);
      setDescription('');
    }
  };

  const handleAnalyze = async () => {
    if (!description.trim() && !file) return;
    setLoading(true);
    setError('');
    try {
      const body: Record<string, unknown> = { type };
      if (file) {
        body.file = await toBase64(file);
        body.fileType = file.type;
      } else {
        body.description = description;
      }
      const res = await fetch('/api/ai/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Erreur lors de l\'analyse');
      const data = await res.json();
      onFill(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-violet-200 bg-gradient-to-b from-violet-50/80 to-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm font-medium text-violet-700">
          <Sparkles className="size-3.5" />
          Remplir avec l&apos;IA
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="size-3.5" />
        </button>
      </div>

      <textarea
        className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-violet-400 placeholder:text-muted-foreground disabled:opacity-50"
        rows={2}
        placeholder={placeholder}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        disabled={!!file || loading}
      />

      <div
        className={`relative flex flex-col items-center justify-center gap-1.5 rounded-md border-2 border-dashed p-3 text-center cursor-pointer select-none transition-colors
          ${dragging ? 'border-violet-400 bg-violet-50' : 'border-muted-foreground/20 hover:border-violet-300 hover:bg-violet-50/40'}
          ${file ? 'border-green-400 bg-green-50/60' : ''}
          ${description ? 'opacity-40 pointer-events-none' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        onClick={() => !description && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
        {file ? (
          <div className="flex items-center gap-2 text-sm text-green-700 font-medium">
            <Upload className="size-3.5" />
            <span className="truncate max-w-48">{file.name}</span>
            <button
              onClick={(e) => { e.stopPropagation(); setFile(null); }}
              className="text-muted-foreground hover:text-destructive transition-colors"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ) : (
          <>
            <Upload className="size-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Glissez un bail PDF ou une image
            </p>
          </>
        )}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={handleAnalyze}
          disabled={loading || (!description.trim() && !file)}
          className="bg-violet-600 hover:bg-violet-700 text-white gap-1.5"
        >
          {loading ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              Analyse…
            </>
          ) : (
            <>
              <Sparkles className="size-3.5" />
              Analyser
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
