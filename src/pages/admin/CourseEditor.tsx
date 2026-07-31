import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Eye, ImagePlus, Save } from "lucide-react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";

import { AdminCourseLayout } from "@/components/admin/AdminCourseLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  courseFormSchema,
  courseToFormValues,
  emptyCourseFormValues,
  type CourseFormValues,
} from "@/contracts/course-cms";
import { useAdminCourse, useCourseCmsMutations } from "@/hooks/useCourseCms";
import { useCourseImageUpload } from "@/hooks/useCourseImageUpload";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/error-message";

const fieldClass = "border-white/15 bg-black/30 text-white";

const ErrorText = ({ message }: { readonly message?: string | undefined }) => message ? <p className="mt-1 text-xs text-red-300">{message}</p> : null;

const CourseEditor = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const isEditing = Boolean(courseId);
  const navigate = useNavigate();
  const courseQuery = useAdminCourse(courseId);
  const mutations = useCourseCmsMutations();
  const imageUpload = useCourseImageUpload();
  const { toast } = useToast();

  const form = useForm<CourseFormValues>({
    resolver: zodResolver(courseFormSchema),
    defaultValues: emptyCourseFormValues,
  });

  useEffect(() => {
    if (courseQuery.data) {
      form.reset(courseToFormValues(courseQuery.data));
    }
  }, [courseQuery.data, form]);

  const uploadImage = async (file: File | undefined, field: "coverAssetId" | "thumbnailAssetId") => {
    if (!file) return;
    try {
      const asset = await imageUpload.upload(file);
      form.setValue(field, asset.id, { shouldDirty: true, shouldValidate: true });
      toast({ title: "Imagem enviada", description: "O asset privado foi publicado e associado ao formulário." });
    } catch (error: unknown) {
      toast({ title: "Upload não concluído", description: getErrorMessage(error), variant: "destructive" });
    }
  };

  const onSubmit = async (values: CourseFormValues) => {
    try {
      if (courseQuery.data) {
        const updated = await mutations.update.mutateAsync({ course: courseQuery.data, values });
        form.reset(courseToFormValues(updated));
        toast({ title: "Curso atualizado", description: `Versão ${updated.version} salva com todos os campos persistidos.` });
      } else {
        const created = await mutations.create.mutateAsync(values);
        toast({ title: "Rascunho criado" });
        navigate(`/admin/cursos/${created.id}/editar`, { replace: true });
      }
    } catch (error: unknown) {
      toast({ title: "Não foi possível salvar", description: getErrorMessage(error), variant: "destructive" });
    }
  };

  if (isEditing && courseQuery.isLoading) {
    return <div className="min-h-screen bg-black text-white grid place-items-center">Carregando todos os dados persistidos do curso...</div>;
  }
  if (courseQuery.error) {
    return <div className="min-h-screen bg-black text-white grid place-items-center">{getErrorMessage(courseQuery.error)}</div>;
  }

  const releaseMode = form.watch("releaseMode");
  const certificateEnabled = form.watch("certificateEnabled");
  const busy = mutations.create.isPending || mutations.update.isPending || imageUpload.isUploading;

  return (
    <AdminCourseLayout
      title={isEditing ? `Editar ${courseQuery.data?.title ?? "curso"}` : "Novo curso"}
      description="O formulário somente é exibido após carregar o registro integral. Salvar nunca substitui campos persistidos por fallbacks ou strings vazias."
      actions={(
        <>
          <Button variant="outline" onClick={() => navigate("/admin/cursos")}><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Button>
          {courseId && <Button variant="outline" onClick={() => navigate(`/admin/cursos/${courseId}/preview`)}><Eye className="mr-2 h-4 w-4" /> Preview</Button>}
          <Button onClick={form.handleSubmit(onSubmit)} disabled={busy} className="btn-neon"><Save className="mr-2 h-4 w-4" /> Salvar</Button>
        </>
      )}
    >
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Tabs defaultValue="identidade" className="space-y-6">
          <TabsList className="h-auto flex-wrap bg-white/10">
            <TabsTrigger value="identidade">Identidade</TabsTrigger>
            <TabsTrigger value="pedagogico">Pedagógico</TabsTrigger>
            <TabsTrigger value="comercial">Comercial</TabsTrigger>
            <TabsTrigger value="acesso">Acesso e conclusão</TabsTrigger>
          </TabsList>

          <TabsContent value="identidade" className="space-y-6">
            <Card className="border-white/10 bg-white/5 text-white">
              <CardHeader><CardTitle>Identidade e apresentação</CardTitle><CardDescription>Título, URL, descrições, classificação e imagens.</CardDescription></CardHeader>
              <CardContent className="grid gap-5 md:grid-cols-2">
                <div><Label htmlFor="title">Título</Label><Input id="title" className={fieldClass} {...form.register("title")} /><ErrorText message={form.formState.errors.title?.message} /></div>
                <div><Label htmlFor="slug">Slug</Label><Input id="slug" className={fieldClass} {...form.register("slug")} /><ErrorText message={form.formState.errors.slug?.message} /></div>
                <div><Label htmlFor="category">Categoria</Label><Input id="category" className={fieldClass} {...form.register("category")} /><ErrorText message={form.formState.errors.category?.message} /></div>
                <div><Label htmlFor="languageCode">Idioma</Label><Input id="languageCode" className={fieldClass} {...form.register("languageCode")} /><ErrorText message={form.formState.errors.languageCode?.message} /></div>
                <div>
                  <Label htmlFor="level">Nível</Label>
                  <select id="level" className={`h-10 w-full rounded-md px-3 ${fieldClass}`} {...form.register("level")}>
                    <option value="all_levels">Todos os níveis</option><option value="beginner">Iniciante</option><option value="intermediate">Intermediário</option><option value="advanced">Avançado</option>
                  </select>
                </div>
                <div className="md:col-span-2"><Label htmlFor="shortDescription">Descrição curta</Label><Textarea id="shortDescription" className={fieldClass} {...form.register("shortDescription")} /><ErrorText message={form.formState.errors.shortDescription?.message} /></div>
                <div className="md:col-span-2"><Label htmlFor="description">Descrição completa</Label><Textarea id="description" rows={10} className={fieldClass} {...form.register("description")} /><ErrorText message={form.formState.errors.description?.message} /></div>
                <div className="space-y-2">
                  <Label htmlFor="cover">Capa</Label><Input id="cover" type="file" accept="image/jpeg,image/png,image/webp,image/avif" className={fieldClass} onChange={(event) => uploadImage(event.target.files?.[0], "coverAssetId")} />
                  <p className="break-all text-xs text-gray-400">Asset: {form.watch("coverAssetId") || "não definido"}</p><ErrorText message={form.formState.errors.coverAssetId?.message} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="thumbnail">Thumbnail</Label><Input id="thumbnail" type="file" accept="image/jpeg,image/png,image/webp,image/avif" className={fieldClass} onChange={(event) => uploadImage(event.target.files?.[0], "thumbnailAssetId")} />
                  <p className="break-all text-xs text-gray-400">Asset: {form.watch("thumbnailAssetId") || "não definido"}</p><ErrorText message={form.formState.errors.thumbnailAssetId?.message} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pedagogico" className="space-y-6">
            <Card className="border-white/10 bg-white/5 text-white">
              <CardHeader><CardTitle>Planejamento pedagógico</CardTitle><CardDescription>Informe um item por linha. A ordem digitada é preservada.</CardDescription></CardHeader>
              <CardContent className="grid gap-5 md:grid-cols-2">
                <div><Label htmlFor="objectivesText">Objetivos</Label><Textarea id="objectivesText" rows={10} className={fieldClass} {...form.register("objectivesText")} /><ErrorText message={form.formState.errors.objectivesText?.message} /></div>
                <div><Label htmlFor="prerequisitesText">Pré-requisitos</Label><Textarea id="prerequisitesText" rows={10} className={fieldClass} {...form.register("prerequisitesText")} /><ErrorText message={form.formState.errors.prerequisitesText?.message} /></div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="comercial" className="space-y-6">
            <Card className="border-white/10 bg-white/5 text-white">
              <CardHeader><CardTitle>Preço, promoção e afiliados</CardTitle></CardHeader>
              <CardContent className="grid gap-5 md:grid-cols-3">
                <div><Label htmlFor="priceAmount">Preço</Label><Input id="priceAmount" type="number" step="0.01" className={fieldClass} {...form.register("priceAmount")} /><ErrorText message={form.formState.errors.priceAmount?.message} /></div>
                <div><Label htmlFor="currencyCode">Moeda</Label><Input id="currencyCode" className={fieldClass} {...form.register("currencyCode")} /><ErrorText message={form.formState.errors.currencyCode?.message} /></div>
                <div><Label htmlFor="promotionalPriceAmount">Preço promocional</Label><Input id="promotionalPriceAmount" type="number" step="0.01" className={fieldClass} {...form.register("promotionalPriceAmount")} /><ErrorText message={form.formState.errors.promotionalPriceAmount?.message} /></div>
                <div><Label htmlFor="promotionStartsAt">Início da promoção</Label><Input id="promotionStartsAt" type="datetime-local" className={fieldClass} {...form.register("promotionStartsAt")} /></div>
                <div><Label htmlFor="promotionEndsAt">Fim da promoção</Label><Input id="promotionEndsAt" type="datetime-local" className={fieldClass} {...form.register("promotionEndsAt")} /></div>
                <Controller control={form.control} name="affiliateEligible" render={({ field }) => <div className="flex items-center justify-between rounded-lg border border-white/10 p-4"><Label>Elegível para afiliados</Label><Switch checked={field.value} onCheckedChange={field.onChange} /></div>} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="acesso" className="space-y-6">
            <Card className="border-white/10 bg-white/5 text-white">
              <CardHeader><CardTitle>Disponibilidade, liberação e conclusão</CardTitle></CardHeader>
              <CardContent className="grid gap-5 md:grid-cols-3">
                <div><Label htmlFor="availabilityStartsAt">Disponível a partir de</Label><Input id="availabilityStartsAt" type="datetime-local" className={fieldClass} {...form.register("availabilityStartsAt")} /></div>
                <div><Label htmlFor="availabilityEndsAt">Disponível até</Label><Input id="availabilityEndsAt" type="datetime-local" className={fieldClass} {...form.register("availabilityEndsAt")} /></div>
                <div><Label htmlFor="accessDurationDays">Prazo de acesso em dias</Label><Input id="accessDurationDays" type="number" className={fieldClass} {...form.register("accessDurationDays")} /></div>
                <div>
                  <Label htmlFor="releaseMode">Modo de liberação</Label>
                  <select id="releaseMode" className={`h-10 w-full rounded-md px-3 ${fieldClass}`} {...form.register("releaseMode")}>
                    <option value="immediate">Imediata</option><option value="scheduled">Agendada</option><option value="drip">Gradual</option>
                  </select>
                </div>
                {releaseMode === "scheduled" && <div><Label htmlFor="releaseAt">Data de liberação</Label><Input id="releaseAt" type="datetime-local" className={fieldClass} {...form.register("releaseAt")} /><ErrorText message={form.formState.errors.releaseAt?.message} /></div>}
                {releaseMode === "drip" && <div><Label htmlFor="dripIntervalDays">Intervalo em dias</Label><Input id="dripIntervalDays" type="number" className={fieldClass} {...form.register("dripIntervalDays")} /><ErrorText message={form.formState.errors.dripIntervalDays?.message} /></div>}
                <div>
                  <Label htmlFor="completionMode">Regra de conclusão</Label>
                  <select id="completionMode" className={`h-10 w-full rounded-md px-3 ${fieldClass}`} {...form.register("completionMode")}>
                    <option value="all_required_lessons">Todas as aulas obrigatórias</option><option value="percentage">Percentual</option><option value="manual">Manual</option>
                  </select>
                </div>
                <div><Label htmlFor="completionRequiredPercent">Percentual necessário</Label><Input id="completionRequiredPercent" type="number" className={fieldClass} {...form.register("completionRequiredPercent")} /></div>
                <Controller control={form.control} name="certificateEnabled" render={({ field }) => <div className="flex items-center justify-between rounded-lg border border-white/10 p-4"><Label>Emitir certificado</Label><Switch checked={field.value} onCheckedChange={field.onChange} /></div>} />
                {certificateEnabled && <div><Label htmlFor="certificateMinCompletionPercent">Percentual para certificado</Label><Input id="certificateMinCompletionPercent" type="number" className={fieldClass} {...form.register("certificateMinCompletionPercent")} /></div>}
                <Controller control={form.control} name="previewEnabled" render={({ field }) => <div className="flex items-center justify-between rounded-lg border border-white/10 p-4"><Label>Preview administrativo habilitado</Label><Switch checked={field.value} onCheckedChange={field.onChange} /></div>} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-8 flex justify-end">
          <Button type="submit" disabled={busy} className="btn-neon"><ImagePlus className="mr-2 h-4 w-4" /> {busy ? "Salvando..." : "Salvar curso"}</Button>
        </div>
      </form>
    </AdminCourseLayout>
  );
};

export default CourseEditor;