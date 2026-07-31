import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  emptyModuleFormValues,
  moduleFormSchema,
  moduleToFormValues,
  type CurriculumModuleRow,
  type ModuleFormValues,
} from "@/contracts/curriculum-cms";

const fieldClass = "border-white/15 bg-black/40 text-white";
const selectClass = `h-10 w-full rounded-md border px-3 ${fieldClass}`;
const ErrorText = ({ message }: { readonly message: string | undefined }) => message
  ? <p className="mt-1 text-xs text-red-300">{message}</p>
  : null;

interface ModuleEditorDialogProps {
  readonly open: boolean;
  readonly module: CurriculumModuleRow | null;
  readonly modules: CurriculumModuleRow[];
  readonly prerequisiteIds: string[];
  readonly busy: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSubmit: (values: ModuleFormValues) => Promise<void>;
}

export const ModuleEditorDialog = ({
  open,
  module,
  modules,
  prerequisiteIds,
  busy,
  onOpenChange,
  onSubmit,
}: ModuleEditorDialogProps) => {
  const form = useForm<ModuleFormValues>({
    resolver: zodResolver(moduleFormSchema),
    defaultValues: emptyModuleFormValues,
  });

  useEffect(() => {
    if (open) form.reset(module ? moduleToFormValues(module, prerequisiteIds) : emptyModuleFormValues);
  }, [form, module, open, prerequisiteIds]);

  const releaseMode = form.watch("releaseMode");
  const options = modules.filter((item) => item.id !== module?.id && item.status !== "archived");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto border-white/10 bg-gray-950 text-white">
        <DialogHeader>
          <DialogTitle>{module ? "Editar módulo" : "Novo módulo"}</DialogTitle>
          <DialogDescription>Campos editoriais, liberação e dependências são persistidos por RPCs versionadas.</DialogDescription>
        </DialogHeader>
        <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2"><Label htmlFor="module-title">Título</Label><Input id="module-title" className={fieldClass} {...form.register("title")} /><ErrorText message={form.formState.errors.title?.message} /></div>
            <div className="md:col-span-2"><Label htmlFor="module-description">Descrição</Label><Textarea id="module-description" rows={5} className={fieldClass} {...form.register("description")} /></div>
            <div>
              <Label htmlFor="module-status">Status</Label>
              <select id="module-status" className={selectClass} {...form.register("status")}>
                <option value="draft">Rascunho</option><option value="published">Publicado</option>
                {module?.status === "archived" && <option value="archived">Arquivado</option>}
              </select>
            </div>
            <div>
              <Label htmlFor="module-release">Liberação</Label>
              <select id="module-release" className={selectClass} {...form.register("releaseMode")}>
                <option value="immediate">Imediata</option><option value="scheduled">Agendada</option>
                <option value="drip">Após matrícula</option><option value="after_prerequisites">Após pré-requisitos</option>
              </select>
            </div>
            {releaseMode === "scheduled" && <div><Label htmlFor="module-release-at">Data</Label><Input id="module-release-at" type="datetime-local" className={fieldClass} {...form.register("releaseAt")} /><ErrorText message={form.formState.errors.releaseAt?.message} /></div>}
            {releaseMode === "drip" && <div><Label htmlFor="module-drip">Dias após matrícula</Label><Input id="module-drip" type="number" min="0" max="3650" className={fieldClass} {...form.register("dripDelayDays")} /><ErrorText message={form.formState.errors.dripDelayDays?.message} /></div>}
            <Controller control={form.control} name="required" render={({ field }) => <div className="flex items-center justify-between rounded-lg border border-white/10 p-4"><Label>Obrigatório</Label><Switch checked={field.value} onCheckedChange={field.onChange} /></div>} />
            <Controller control={form.control} name="previewEnabled" render={({ field }) => <div className="flex items-center justify-between rounded-lg border border-white/10 p-4"><Label>Preview</Label><Switch checked={field.value} onCheckedChange={field.onChange} /></div>} />
          </div>

          <Controller control={form.control} name="prerequisiteIds" render={({ field }) => (
            <div className="space-y-3 rounded-lg border border-white/10 p-4">
              <div><Label>Pré-requisitos</Label><p className="text-xs text-gray-400">Ciclos e referências inválidas são rejeitados no banco.</p></div>
              {options.length === 0 ? <p className="text-sm text-gray-400">Nenhum outro módulo ativo.</p> : options.map((candidate) => {
                const checked = field.value.includes(candidate.id);
                return <label key={candidate.id} className="flex items-center gap-3 rounded-md border border-white/10 p-3 text-sm">
                  <Checkbox checked={checked} onCheckedChange={(next) => field.onChange(next === true ? [...field.value, candidate.id] : field.value.filter((id) => id !== candidate.id))} />
                  <span>{candidate.titulo}</span>
                </label>;
              })}
            </div>
          )} />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={busy} className="btn-neon"><Save className="mr-2 h-4 w-4" /> Salvar módulo</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
