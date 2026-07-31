import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  emptyLessonFormValues,
  lessonFormSchema,
  lessonToFormValues,
  type CurriculumLessonRow,
  type CurriculumModuleRow,
  type LessonFormValues,
} from "@/contracts/curriculum-cms";

const fieldClass = "border-white/15 bg-black/40 text-white";
const selectClass = `h-10 w-full rounded-md border px-3 ${fieldClass}`;
const ErrorText = ({ message }: { readonly message: string | undefined }) => message
  ? <p className="mt-1 text-xs text-red-300">{message}</p>
  : null;

interface LessonEditorDialogProps {
  readonly open: boolean;
  readonly lesson: CurriculumLessonRow | null;
  readonly module: CurriculumModuleRow | null;
  readonly modules: CurriculumModuleRow[];
  readonly lessons: CurriculumLessonRow[];
  readonly prerequisiteIds: string[];
  readonly busy: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSubmit: (values: LessonFormValues) => Promise<void>;
}

export const LessonEditorDialog = ({
  open,
  lesson,
  module,
  modules,
  lessons,
  prerequisiteIds,
  busy,
  onOpenChange,
  onSubmit,
}: LessonEditorDialogProps) => {
  const form = useForm<LessonFormValues>({
    resolver: zodResolver(lessonFormSchema),
    defaultValues: emptyLessonFormValues,
  });

  useEffect(() => {
    if (open) form.reset(lesson ? lessonToFormValues(lesson, prerequisiteIds) : emptyLessonFormValues);
  }, [form, lesson, open, prerequisiteIds]);

  const releaseMode = form.watch("releaseMode");
  const completionMode = form.watch("completionMode");
  const contentKind = form.watch("contentKind");
  const moduleNames = useMemo(() => new Map(modules.map((item) => [item.id, item.titulo])), [modules]);
  const options = lessons.filter((item) => item.id !== lesson?.id && item.status !== "archived");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto border-white/10 bg-gray-950 text-white">
        <DialogHeader>
          <DialogTitle>{lesson ? "Editar aula" : `Nova aula em ${module?.titulo ?? "módulo"}`}</DialogTitle>
          <DialogDescription>Conteúdo, conclusão, disponibilidade e dependências usam versão otimista.</DialogDescription>
        </DialogHeader>
        <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-3"><Label htmlFor="lesson-title">Título</Label><Input id="lesson-title" className={fieldClass} {...form.register("title")} /><ErrorText message={form.formState.errors.title?.message} /></div>
            <div className="md:col-span-3"><Label htmlFor="lesson-description">Descrição</Label><Textarea id="lesson-description" rows={4} className={fieldClass} {...form.register("description")} /></div>
            <div>
              <Label htmlFor="lesson-status">Status</Label>
              <select id="lesson-status" className={selectClass} {...form.register("status")}>
                <option value="draft">Rascunho</option><option value="published">Publicado</option>
                {lesson?.status === "archived" && <option value="archived">Arquivado</option>}
              </select>
            </div>
            <div>
              <Label htmlFor="lesson-kind">Conteúdo</Label>
              <select id="lesson-kind" className={selectClass} {...form.register("contentKind")}>
                <option value="text">Texto</option><option value="video">Vídeo</option><option value="audio">Áudio</option><option value="mixed">Misto</option>
              </select>
            </div>
            <div><Label htmlFor="lesson-duration">Duração em segundos</Label><Input id="lesson-duration" type="number" min="0" className={fieldClass} {...form.register("durationSeconds")} /></div>
            {(contentKind === "text" || contentKind === "mixed") && <div className="md:col-span-3"><Label htmlFor="lesson-text">Conteúdo textual</Label><Textarea id="lesson-text" rows={12} className={fieldClass} {...form.register("textContent")} /><ErrorText message={form.formState.errors.textContent?.message} /></div>}
            <div>
              <Label htmlFor="lesson-completion">Conclusão</Label>
              <select id="lesson-completion" className={selectClass} {...form.register("completionMode")}>
                <option value="manual">Manual</option><option value="media_progress">Progresso da mídia</option><option value="reading_acknowledgement">Confirmação de leitura</option><option value="any_activity">Qualquer atividade</option>
              </select>
            </div>
            {completionMode === "media_progress" && <div><Label htmlFor="lesson-percent">Percentual</Label><Input id="lesson-percent" type="number" min="1" max="100" className={fieldClass} {...form.register("completionPercent")} /><ErrorText message={form.formState.errors.completionPercent?.message} /></div>}
            <div>
              <Label htmlFor="lesson-release">Liberação</Label>
              <select id="lesson-release" className={selectClass} {...form.register("releaseMode")}>
                <option value="immediate">Imediata</option><option value="scheduled">Agendada</option><option value="drip">Após matrícula</option><option value="after_prerequisites">Após pré-requisitos</option>
              </select>
            </div>
            {releaseMode === "scheduled" && <div><Label htmlFor="lesson-release-at">Data</Label><Input id="lesson-release-at" type="datetime-local" className={fieldClass} {...form.register("releaseAt")} /><ErrorText message={form.formState.errors.releaseAt?.message} /></div>}
            {releaseMode === "drip" && <div><Label htmlFor="lesson-drip">Dias após matrícula</Label><Input id="lesson-drip" type="number" min="0" max="3650" className={fieldClass} {...form.register("dripDelayDays")} /><ErrorText message={form.formState.errors.dripDelayDays?.message} /></div>}
            <div><Label htmlFor="lesson-start">Disponível a partir</Label><Input id="lesson-start" type="datetime-local" className={fieldClass} {...form.register("availabilityStartsAt")} /></div>
            <div><Label htmlFor="lesson-end">Disponível até</Label><Input id="lesson-end" type="datetime-local" className={fieldClass} {...form.register("availabilityEndsAt")} /><ErrorText message={form.formState.errors.availabilityEndsAt?.message} /></div>
            <Controller control={form.control} name="required" render={({ field }) => <div className="flex items-center justify-between rounded-lg border border-white/10 p-4"><Label>Obrigatória</Label><Switch checked={field.value} onCheckedChange={field.onChange} /></div>} />
            <Controller control={form.control} name="previewEnabled" render={({ field }) => <div className="flex items-center justify-between rounded-lg border border-white/10 p-4"><Label>Preview</Label><Switch checked={field.value} onCheckedChange={field.onChange} /></div>} />
          </div>

          <Controller control={form.control} name="prerequisiteIds" render={({ field }) => (
            <div className="space-y-3 rounded-lg border border-white/10 p-4">
              <div><Label>Pré-requisitos da aula</Label><p className="text-xs text-gray-400">O backend impede ciclos e referências fora do curso.</p></div>
              {options.length === 0 ? <p className="text-sm text-gray-400">Nenhuma outra aula ativa.</p> : options.map((candidate) => {
                const checked = field.value.includes(candidate.id);
                return <label key={candidate.id} className="flex items-center gap-3 rounded-md border border-white/10 p-3 text-sm">
                  <Checkbox checked={checked} onCheckedChange={(next) => field.onChange(next === true ? [...field.value, candidate.id] : field.value.filter((id) => id !== candidate.id))} />
                  <span>{moduleNames.get(candidate.modulo_id) ?? "Módulo"} · {candidate.titulo}</span>
                </label>;
              })}
            </div>
          )} />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={busy} className="btn-neon"><Save className="mr-2 h-4 w-4" /> Salvar aula</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
