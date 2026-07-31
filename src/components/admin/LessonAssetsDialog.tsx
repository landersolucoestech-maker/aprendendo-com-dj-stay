import { FileAudio, FileUp, Film, Link2, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { CurriculumLessonRow, LessonMediaRow } from "@/contracts/curriculum-cms";
import type { AssetRow } from "@/contracts/storage";
import type { LessonUploadPurpose } from "@/hooks/useLessonAssetUpload";

const fieldClass = "border-white/15 bg-black/40 text-white";
const selectClass = `h-10 w-full rounded-md border px-3 ${fieldClass}`;
const materialPurposes: ReadonlyArray<{ value: LessonUploadPurpose; label: string }> = [
  { value: "document", label: "Documento" }, { value: "sample", label: "Sample" },
  { value: "preset", label: "Preset" }, { value: "stem", label: "Stem" },
  { value: "project", label: "Projeto" }, { value: "archive", label: "Arquivo compactado" },
  { value: "template", label: "Template" }, { value: "support_file", label: "Arquivo de apoio" },
];

interface LessonAssetsDialogProps {
  readonly open: boolean;
  readonly lesson: CurriculumLessonRow | null;
  readonly media: LessonMediaRow | null;
  readonly assets: AssetRow[];
  readonly busy: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onExternalMedia: (provider: "youtube" | "vimeo", sourceUrl: string, watermarkEnabled: boolean) => Promise<void>;
  readonly onPrivateVideo: (file: File, watermarkEnabled: boolean) => Promise<void>;
  readonly onAudio: (file: File) => Promise<void>;
  readonly onMaterial: (file: File, purpose: LessonUploadPurpose) => Promise<void>;
  readonly onDisableMedia: () => Promise<void>;
  readonly onArchiveMaterial: (asset: AssetRow) => Promise<void>;
}

export const LessonAssetsDialog = ({
  open,
  lesson,
  media,
  assets,
  busy,
  onOpenChange,
  onExternalMedia,
  onPrivateVideo,
  onAudio,
  onMaterial,
  onDisableMedia,
  onArchiveMaterial,
}: LessonAssetsDialogProps) => {
  const [provider, setProvider] = useState<"youtube" | "vimeo">("youtube");
  const [sourceUrl, setSourceUrl] = useState("");
  const [watermarkEnabled, setWatermarkEnabled] = useState(true);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [materialFile, setMaterialFile] = useState<File | null>(null);
  const [materialPurpose, setMaterialPurpose] = useState<LessonUploadPurpose>("document");

  useEffect(() => {
    if (!open) return;
    setProvider(media?.provider === "vimeo" ? "vimeo" : "youtube");
    setSourceUrl("");
    setWatermarkEnabled(media?.watermark_enabled ?? true);
    setVideoFile(null);
    setAudioFile(null);
    setMaterialFile(null);
    setMaterialPurpose("document");
  }, [media, open]);

  const materials = assets.filter((asset) => asset.purpose !== "video" && asset.purpose !== "audio");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto border-white/10 bg-gray-950 text-white">
        <DialogHeader>
          <DialogTitle>Mídia e materiais · {lesson?.titulo ?? "Aula"}</DialogTitle>
          <DialogDescription>Somente assets privados e referências normalizadas são persistidos; URLs assinadas nunca são armazenadas.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 lg:grid-cols-2">
          <section className="space-y-4 rounded-lg border border-white/10 p-4">
            <div className="flex items-center gap-2"><Link2 className="h-4 w-4" /><h3 className="font-semibold">Vídeo externo</h3></div>
            <select className={selectClass} value={provider} onChange={(event) => setProvider(event.target.value as "youtube" | "vimeo")}><option value="youtube">YouTube</option><option value="vimeo">Vimeo</option></select>
            <div><Label htmlFor="media-source">URL oficial</Label><Input id="media-source" className={fieldClass} value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://..." /></div>
            <div className="flex items-center justify-between rounded-lg border border-white/10 p-3"><Label>Marca d’água</Label><Switch checked={watermarkEnabled} onCheckedChange={setWatermarkEnabled} /></div>
            <Button disabled={busy || sourceUrl.trim() === ""} onClick={() => onExternalMedia(provider, sourceUrl.trim(), watermarkEnabled)}><ShieldCheck className="mr-2 h-4 w-4" /> Associar vídeo</Button>
          </section>

          <section className="space-y-4 rounded-lg border border-white/10 p-4">
            <div className="flex items-center gap-2"><Film className="h-4 w-4" /><h3 className="font-semibold">Vídeo privado</h3></div>
            <Input type="file" accept="video/mp4,video/webm,video/quicktime" className={fieldClass} onChange={(event) => setVideoFile(event.target.files?.[0] ?? null)} />
            <div className="flex items-center justify-between rounded-lg border border-white/10 p-3"><Label>Marca d’água</Label><Switch checked={watermarkEnabled} onCheckedChange={setWatermarkEnabled} /></div>
            <Button disabled={busy || !videoFile} onClick={() => videoFile ? onPrivateVideo(videoFile, watermarkEnabled) : Promise.resolve()}><FileUp className="mr-2 h-4 w-4" /> Enviar vídeo</Button>
          </section>

          <section className="space-y-4 rounded-lg border border-white/10 p-4">
            <div className="flex items-center gap-2"><FileAudio className="h-4 w-4" /><h3 className="font-semibold">Áudio</h3></div>
            <Input type="file" accept="audio/*" className={fieldClass} onChange={(event) => setAudioFile(event.target.files?.[0] ?? null)} />
            <Button disabled={busy || !audioFile} onClick={() => audioFile ? onAudio(audioFile) : Promise.resolve()}><FileUp className="mr-2 h-4 w-4" /> Enviar áudio</Button>
            <p className="break-all text-xs text-gray-400">Asset atual: {lesson?.audio_asset_id ?? "não associado"}</p>
          </section>

          <section className="space-y-4 rounded-lg border border-white/10 p-4">
            <div className="flex items-center gap-2"><FileUp className="h-4 w-4" /><h3 className="font-semibold">Material complementar</h3></div>
            <select className={selectClass} value={materialPurpose} onChange={(event) => setMaterialPurpose(event.target.value as LessonUploadPurpose)}>{materialPurposes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
            <Input type="file" className={fieldClass} onChange={(event) => setMaterialFile(event.target.files?.[0] ?? null)} />
            <Button disabled={busy || !materialFile} onClick={() => materialFile ? onMaterial(materialFile, materialPurpose) : Promise.resolve()}><FileUp className="mr-2 h-4 w-4" /> Enviar material</Button>
          </section>
        </div>

        <section className="space-y-3 rounded-lg border border-white/10 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h3 className="font-semibold">Mídia ativa</h3><p className="text-xs text-gray-400">{media ? `${media.provider} · ${media.external_video_id ?? media.asset_id ?? "referência protegida"}` : "Nenhuma mídia ativa."}</p></div>
            {media && <Button variant="destructive" disabled={busy} onClick={onDisableMedia}>Desativar mídia</Button>}
          </div>
        </section>

        <section className="space-y-3 rounded-lg border border-white/10 p-4">
          <h3 className="font-semibold">Materiais publicados</h3>
          {materials.length === 0 ? <p className="text-sm text-gray-400">Nenhum material associado.</p> : materials.map((asset) => <div key={asset.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-white/10 p-3">
            <div><p className="text-sm font-medium">{asset.original_name}</p><p className="text-xs text-gray-400">{asset.purpose} · {(asset.size_bytes / 1024 / 1024).toFixed(2)} MB</p></div>
            <Button size="sm" variant="destructive" disabled={busy} onClick={() => onArchiveMaterial(asset)}>Arquivar</Button>
          </div>)}
        </section>
      </DialogContent>
    </Dialog>
  );
};
