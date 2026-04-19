import { useCallback } from "react";
import { Upload } from "lucide-react";

interface FileUploadProps {
  onFilesLoaded: (files: { data: ArrayBuffer; fileName: string }[]) => void;
}

export function FileUpload({ onFilesLoaded }: FileUploadProps) {
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) readFiles(files);
    },
    [onFilesLoaded]
  );

  const readFiles = (files: File[]) => {
    const results: { data: ArrayBuffer; fileName: string }[] = [];
    let loaded = 0;
    for (const file of files) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          results.push({ data: e.target.result as ArrayBuffer, fileName: file.name });
        }
        loaded++;
        if (loaded === files.length) {
          onFilesLoaded(results);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  return (
    <label
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 px-8 py-10 transition-colors hover:border-primary/60 hover:bg-primary/10"
    >
      <Upload className="h-8 w-8 text-primary" />
      <div className="text-center">
        <p className="font-heading text-sm font-semibold text-foreground">
          Arraste os arquivos aqui ou clique para selecionar
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Extratos do Tesouro (.xlsx) ou Histórico de Preços (.csv)
        </p>
      </div>
      <input
        type="file"
        accept=".xlsx,.xls,.csv"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          if (files.length > 0) readFiles(files);
        }}
      />
    </label>
  );
}
