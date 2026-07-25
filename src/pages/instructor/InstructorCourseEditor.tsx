import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowDown, ArrowLeft, ArrowUp, FileUp, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  useCourseEditor,
  useCreateLesson,
  useCreateLessonAsset,
  useCreateModule,
  useUpdateCourse,
  useUpdateLesson,
  useUpdateModule,
} from "@/hooks/useInstructorData";
import { useSaveCourseOffer } from "@/hooks/useOfferManagement";
import { db, formatCurrency, slugify } from "@/lib/platform";
import { useQueryClient } from "@tanstack/react-query";

function CourseSettings({ course }: { course: any }) {
  const { toast } = useToast();
  const updateCourse = useUpdateCourse();
  const [form, setForm] = useState({
    title: course.title ?? "",
    slug: course.slug ?? "",
    short_description: course.short_description ?? "",
    description: course.description ?? "",
    category: course.category ?? "",
    level: course.level ?? "all",
    language: course.language ?? "pt-BR",
    workload_minutes: course.workload_minutes ?? 0,
    promotional_video_url: course.promotional_video_url ?? "",
    seo_title: course.seo_title ?? "",
    seo_description: course.seo_description ?? "",
  });

  const save = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await updateCourse.mutateAsync({
        id: course.id,
        values: {
          ...form,
          slug: form.slug || slugify(form.title),
          workload_minutes: Number(form.workload_minutes) || 0,
          promotional_video_url: form.promotional_video_url || null,
          seo_title: form.seo_title || null,
          seo_description: form.seo_description || null,
        },
      });
      toast({ title: "Curso salvo", description: "Os dados gerais foram atualizados." });
    } catch (error) {
      toast({ title: "Erro", description: error instanceof Error ? error.message : "Não foi possível salvar.", variant: "destructive" });
    }
  };

  return (
    <Card className="glass-card border-white/10">
      <CardHeader><CardTitle className="text-white">Informações do curso</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={save} className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          <div className="space-y-2 xl:col-span-2"><Label>Título</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
          <div className="space-y-2"><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} /></div>
          <div className="space-y-2"><Label>Categoria</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
          <div className="space-y-2"><Label>Nível</Label><select className="w-full h-10 rounded-md border border-white/20 bg-black px-3" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}><option value="all">Todos</option><option value="beginner">Iniciante</option><option value="intermediate">Intermediário</option><option value="advanced">Avançado</option></select></div>
          <div className="space-y-2"><Label>Carga horária em minutos</Label><Input type="number" min="0" value={form.workload_minutes} onChange={(e) => setForm({ ...form, workload_minutes: Number(e.target.value) })} /></div>
          <div className="space-y-2 md:col-span-2 xl:col-span-3"><Label>Descrição curta</Label><Input value={form.short_description} onChange={(e) => setForm({ ...form, short_description: e.target.value })} /></div>
          <div className="space-y-2 md:col-span-2 xl:col-span-3"><Label>Descrição completa</Label><Textarea rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="space-y-2 md:col-span-2"><Label>Vídeo promocional</Label><Input type="url" value={form.promotional_video_url} onChange={(e) => setForm({ ...form, promotional_video_url: e.target.value })} placeholder="https://..." /></div>
          <div className="space-y-2"><Label>Idioma</Label><Input value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} /></div>
          <div className="space-y-2"><Label>Título SEO</Label><Input value={form.seo_title} onChange={(e) => setForm({ ...form, seo_title: e.target.value })} /></div>
          <div className="space-y-2 md:col-span-2"><Label>Descrição SEO</Label><Input value={form.seo_description} onChange={(e) => setForm({ ...form, seo_description: e.target.value })} /></div>
          <div className="md:col-span-2 xl:col-span-3 flex justify-end"><Button type="submit" disabled={updateCourse.isPending}><Save className="w-4 h-4 mr-2" />Salvar informações</Button></div>
        </form>
      </CardContent>
    </Card>
  );
}

function OfferSettings({ course }: { course: any }) {
  const { toast } = useToast();
  const saveOffer = useSaveCourseOffer();
  const product = course.products?.[0];
  const offer = product?.offers?.[0];
  const [amount, setAmount] = useState(offer ? offer.amount_cents / 100 : 0);
  const [compareAt, setCompareAt] = useState(offer?.compare_at_cents ? offer.compare_at_cents / 100 : 0);
  const [installments, setInstallments] = useState(offer?.max_installments ?? 12);
  const [lifetime, setLifetime] = useState(offer?.lifetime_access ?? true);
  const [accessDays, setAccessDays] = useState(offer?.access_days ?? 365);
  const [active, setActive] = useState(offer?.is_active ?? true);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await saveOffer.mutateAsync({
        courseId: course.id,
        productId: product?.id,
        offerId: offer?.id,
        courseTitle: course.title,
        amountCents: Math.round(Number(amount) * 100),
        compareAtCents: compareAt ? Math.round(Number(compareAt) * 100) : null,
        maxInstallments: Number(installments),
        lifetimeAccess: lifetime,
        accessDays: lifetime ? null : Number(accessDays),
        active,
      });
      toast({ title: "Oferta salva", description: `Preço atual: ${formatCurrency(Math.round(Number(amount) * 100))}` });
    } catch (error) {
      toast({ title: "Erro", description: error instanceof Error ? error.message : "Não foi possível salvar a oferta.", variant: "destructive" });
    }
  };

  return (
    <Card className="glass-card border-white/10">
      <CardHeader><CardTitle className="text-white">Oferta comercial</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={save} className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          <div className="space-y-2"><Label>Preço em R$</Label><Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(Number(e.target.value))} /></div>
          <div className="space-y-2"><Label>Preço comparativo em R$</Label><Input type="number" min="0" step="0.01" value={compareAt} onChange={(e) => setCompareAt(Number(e.target.value))} /></div>
          <div className="space-y-2"><Label>Máximo de parcelas</Label><Input type="number" min="1" max="24" value={installments} onChange={(e) => setInstallments(Number(e.target.value))} /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={lifetime} onChange={(e) => setLifetime(e.target.checked)} />Acesso vitalício</label>
          {!lifetime && <div className="space-y-2"><Label>Dias de acesso</Label><Input type="number" min="1" value={accessDays} onChange={(e) => setAccessDays(Number(e.target.value))} /></div>}
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />Oferta ativa</label>
          <div className="md:col-span-2 xl:col-span-3 flex justify-end"><Button type="submit" disabled={saveOffer.isPending}>Salvar oferta</Button></div>
        </form>
      </CardContent>
    </Card>
  );
}

function LessonEditor({ lesson, courseId, moduleId, refresh }: { lesson: any; courseId: string; moduleId: string; refresh: () => void }) {
  const { toast } = useToast();
  const updateLesson = useUpdateLesson();
  const createAsset = useCreateLessonAsset();
  const [form, setForm] = useState({
    title: lesson.title ?? "",
    description: lesson.description ?? "",
    content: lesson.content ?? "",
    content_type: lesson.content_type ?? "video",
    video_url: lesson.video_url ?? "",
    duration_minutes: Math.ceil((lesson.duration_seconds ?? 0) / 60),
    is_preview: Boolean(lesson.is_preview),
    is_required: lesson.is_required !== false,
    is_published: Boolean(lesson.is_published),
  });
  const [assetTitle, setAssetTitle] = useState("");
  const [assetType, setAssetType] = useState("pdf");
  const [externalUrl, setExternalUrl] = useState("");
  const [assetFile, setAssetFile] = useState<File | null>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const save = async () => {
    try {
      await updateLesson.mutateAsync({ id: lesson.id, courseId, values: {
        title: form.title.trim(), description: form.description || null, content: form.content || null,
        content_type: form.content_type, video_url: form.video_url || null,
        duration_seconds: Math.max(0, Number(form.duration_minutes) * 60),
        is_preview: form.is_preview, is_required: form.is_required, is_published: form.is_published,
      } });
      toast({ title: "Aula salva" });
    } catch (error) {
      toast({ title: "Erro", description: error instanceof Error ? error.message : "Não foi possível salvar a aula.", variant: "destructive" });
    }
  };

  const uploadMedia = async () => {
    if (!mediaFile) return;
    setUploading(true);
    try {
      const path = `${courseId}/${moduleId}/${lesson.id}/${crypto.randomUUID()}-${mediaFile.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
      const { error } = await supabase.storage.from("course-videos").upload(path, mediaFile, { upsert: false, contentType: mediaFile.type });
      if (error) throw error;
      await updateLesson.mutateAsync({ id: lesson.id, courseId, values: form.content_type === "audio" ? { audio_storage_path: path, video_storage_path: null, video_url: null } : { video_storage_path: path, audio_storage_path: null, video_url: null } });
      setMediaFile(null);
      toast({ title: "Mídia enviada" });
    } catch (error) {
      toast({ title: "Erro no upload", description: error instanceof Error ? error.message : "Não foi possível enviar.", variant: "destructive" });
    } finally { setUploading(false); }
  };

  const addAsset = async () => {
    if (!assetTitle.trim() || (!assetFile && !externalUrl.trim())) return;
    setUploading(true);
    try {
      let storagePath: string | null = null;
      if (assetFile) {
        storagePath = `${courseId}/${lesson.id}/${crypto.randomUUID()}-${assetFile.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
        const { error } = await supabase.storage.from("course-assets").upload(storagePath, assetFile, { upsert: false, contentType: assetFile.type });
        if (error) throw error;
      }
      await createAsset.mutateAsync({ courseId, lessonId: lesson.id, values: {
        title: assetTitle.trim(), asset_type: assetType, storage_path: storagePath,
        external_url: externalUrl.trim() || null, mime_type: assetFile?.type || null,
        file_size_bytes: assetFile?.size || null, sort_order: lesson.lesson_assets?.length ?? 0,
        visibility: "enrolled", is_downloadable: true,
      } });
      setAssetTitle(""); setAssetFile(null); setExternalUrl("");
      toast({ title: "Material adicionado" });
    } catch (error) {
      toast({ title: "Erro", description: error instanceof Error ? error.message : "Não foi possível adicionar o material.", variant: "destructive" });
    } finally { setUploading(false); }
  };

  const deleteLesson = async () => {
    if (!window.confirm(`Excluir a aula “${lesson.title}” e seus materiais?`)) return;
    const { error } = await db.from("lessons").delete().eq("id", lesson.id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" }); else refresh();
  };

  const deleteAsset = async (asset: any) => {
    if (!window.confirm(`Excluir o material “${asset.title}”?`)) return;
    if (asset.storage_path) await supabase.storage.from("course-assets").remove([asset.storage_path]);
    const { error } = await db.from("lesson_assets").delete().eq("id", asset.id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" }); else refresh();
  };

  return (
    <Card className="border-white/10 bg-black/30">
      <CardContent className="p-4 space-y-4">
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
          <div className="space-y-1 xl:col-span-2"><Label>Título da aula</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div className="space-y-1"><Label>Tipo</Label><select className="w-full h-10 rounded-md border border-white/20 bg-black px-3" value={form.content_type} onChange={(e) => setForm({ ...form, content_type: e.target.value })}><option value="video">Vídeo gravado</option><option value="audio">Áudio</option><option value="text">Texto</option></select></div>
          <div className="space-y-1 md:col-span-2 xl:col-span-3"><Label>Descrição</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          {form.content_type === "text" && <div className="space-y-1 md:col-span-2 xl:col-span-3"><Label>Conteúdo textual</Label><Textarea rows={8} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} /></div>}
          {form.content_type === "video" && <div className="space-y-1 md:col-span-2"><Label>URL externa do vídeo</Label><Input type="url" value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} /></div>}
          <div className="space-y-1"><Label>Duração em minutos</Label><Input type="number" min="0" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })} /></div>
          {form.content_type !== "text" && <div className="md:col-span-2 xl:col-span-3 flex flex-wrap items-center gap-2"><Input type="file" accept={form.content_type === "audio" ? "audio/*" : "video/*"} onChange={(e) => setMediaFile(e.target.files?.[0] ?? null)} className="max-w-xl" /><Button type="button" variant="outline" onClick={uploadMedia} disabled={!mediaFile || uploading}><FileUp className="w-4 h-4 mr-2" />Enviar mídia</Button></div>}
          <div className="md:col-span-2 xl:col-span-3 flex flex-wrap gap-4 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} />Publicada</label><label className="flex items-center gap-2"><input type="checkbox" checked={form.is_preview} onChange={(e) => setForm({ ...form, is_preview: e.target.checked })} />Prévia pública</label><label className="flex items-center gap-2"><input type="checkbox" checked={form.is_required} onChange={(e) => setForm({ ...form, is_required: e.target.checked })} />Obrigatória</label></div>
        </div>
        <div className="flex justify-between"><Button variant="destructive" size="sm" onClick={deleteLesson}><Trash2 className="w-4 h-4 mr-2" />Excluir aula</Button><Button size="sm" onClick={save} disabled={updateLesson.isPending}><Save className="w-4 h-4 mr-2" />Salvar aula</Button></div>

        <div className="border-t border-white/10 pt-4 space-y-3">
          <h4 className="font-medium">Materiais adicionais</h4>
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-2">
            <Input placeholder="Título do material" value={assetTitle} onChange={(e) => setAssetTitle(e.target.value)} />
            <select className="h-10 rounded-md border border-white/20 bg-black px-3" value={assetType} onChange={(e) => setAssetType(e.target.value)}><option value="pdf">PDF</option><option value="zip">ZIP</option><option value="ableton_project">Projeto Ableton</option><option value="samples">Samples</option><option value="stems">Stems</option><option value="preset">Preset</option><option value="audio">Áudio</option><option value="external_link">Link externo</option><option value="other">Outro</option></select>
            <Input type="file" onChange={(e) => setAssetFile(e.target.files?.[0] ?? null)} />
            <Input type="url" placeholder="ou URL externa" value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} />
          </div>
          <Button type="button" size="sm" variant="outline" onClick={addAsset} disabled={uploading || !assetTitle.trim() || (!assetFile && !externalUrl.trim())}><Plus className="w-4 h-4 mr-2" />Adicionar material</Button>
          <div className="grid md:grid-cols-2 gap-2">{lesson.lesson_assets?.map((asset: any) => <div key={asset.id} className="flex items-center justify-between rounded-md border border-white/10 p-3 text-sm"><div><p>{asset.title}</p><p className="text-xs text-gray-500">{asset.asset_type}</p></div><Button variant="ghost" size="icon" onClick={() => deleteAsset(asset)}><Trash2 className="w-4 h-4" /></Button></div>)}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function ModuleEditor({ module, courseId, index, total, reorder, refresh }: { module: any; courseId: string; index: number; total: number; reorder: (from: number, to: number) => void; refresh: () => void }) {
  const { toast } = useToast();
  const updateModule = useUpdateModule();
  const createLesson = useCreateLesson();
  const [title, setTitle] = useState(module.title ?? "");
  const [description, setDescription] = useState(module.description ?? "");
  const [published, setPublished] = useState(Boolean(module.is_published));
  const [lessonTitle, setLessonTitle] = useState("");

  const saveModule = async () => {
    try { await updateModule.mutateAsync({ id: module.id, courseId, values: { title, description: description || null, is_published: published } }); toast({ title: "Módulo salvo" }); }
    catch (error) { toast({ title: "Erro", description: error instanceof Error ? error.message : "Não foi possível salvar.", variant: "destructive" }); }
  };
  const addLesson = async () => {
    if (!lessonTitle.trim()) return;
    try { await createLesson.mutateAsync({ courseId, moduleId: module.id, title: lessonTitle, sortOrder: module.lessons?.length ?? 0 }); setLessonTitle(""); }
    catch (error) { toast({ title: "Erro", description: error instanceof Error ? error.message : "Não foi possível criar a aula.", variant: "destructive" }); }
  };
  const deleteModule = async () => {
    if (!window.confirm(`Excluir o módulo “${module.title}” e todas as aulas?`)) return;
    const { error } = await db.from("course_modules").delete().eq("id", module.id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" }); else refresh();
  };

  return (
    <Card className="glass-card border-white/10">
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between gap-3"><CardTitle className="text-white">Módulo {index + 1}</CardTitle><div className="flex gap-1"><Button size="icon" variant="ghost" disabled={index === 0} onClick={() => reorder(index, index - 1)}><ArrowUp className="w-4 h-4" /></Button><Button size="icon" variant="ghost" disabled={index === total - 1} onClick={() => reorder(index, index + 1)}><ArrowDown className="w-4 h-4" /></Button><Button size="icon" variant="ghost" onClick={deleteModule}><Trash2 className="w-4 h-4" /></Button></div></div>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3"><div className="space-y-1 xl:col-span-2"><Label>Título</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />Módulo publicado</label><div className="space-y-1 md:col-span-2 xl:col-span-3"><Label>Descrição</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} /></div></div>
        <div className="flex justify-end"><Button size="sm" variant="outline" onClick={saveModule}>Salvar módulo</Button></div>
      </CardHeader>
      <CardContent className="space-y-4">
        {module.lessons?.map((lesson: any) => <LessonEditor key={lesson.id} lesson={lesson} courseId={courseId} moduleId={module.id} refresh={refresh} />)}
        <div className="flex gap-2"><Input placeholder="Título da nova aula" value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void addLesson(); } }} /><Button onClick={addLesson} disabled={!lessonTitle.trim() || createLesson.isPending}><Plus className="w-4 h-4 mr-2" />Adicionar aula</Button></div>
      </CardContent>
    </Card>
  );
}

export default function InstructorCourseEditor() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: course, isLoading, error, refetch } = useCourseEditor(courseId);
  const updateCourse = useUpdateCourse();
  const createModule = useCreateModule();
  const [moduleTitle, setModuleTitle] = useState("");

  useEffect(() => { if (!courseId) navigate("/instrutor/cursos", { replace: true }); }, [courseId, navigate]);
  if (isLoading) return <div className="p-8 text-gray-400">Carregando editor...</div>;
  if (error || !course) return <div className="p-8 text-red-400">Não foi possível carregar o curso: {error?.message}</div>;

  const refresh = () => { void queryClient.invalidateQueries({ queryKey: ["course-editor", course.id] }); void refetch(); };
  const togglePublish = async () => {
    const nextStatus = course.status === "published" ? "draft" : "published";
    try { await updateCourse.mutateAsync({ id: course.id, values: { status: nextStatus, published_at: nextStatus === "published" ? new Date().toISOString() : null } }); toast({ title: nextStatus === "published" ? "Curso publicado" : "Curso voltou para rascunho" }); }
    catch (publishError) { toast({ title: "Erro", description: publishError instanceof Error ? publishError.message : "Não foi possível alterar a publicação.", variant: "destructive" }); }
  };
  const addModule = async () => {
    if (!moduleTitle.trim()) return;
    try { await createModule.mutateAsync({ courseId: course.id, title: moduleTitle, sortOrder: course.course_modules?.length ?? 0 }); setModuleTitle(""); }
    catch (creationError) { toast({ title: "Erro", description: creationError instanceof Error ? creationError.message : "Não foi possível criar o módulo.", variant: "destructive" }); }
  };
  const reorderModules = async (from: number, to: number) => {
    const ids = course.course_modules.map((module: any) => module.id); const [moved] = ids.splice(from, 1); ids.splice(to, 0, moved);
    const { error: reorderError } = await db.rpc("reorder_course_modules", { target_course_id: course.id, ordered_module_ids: ids });
    if (reorderError) toast({ title: "Erro", description: reorderError.message, variant: "destructive" }); else refresh();
  };

  return (
    <div className="p-5 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"><div className="flex items-center gap-3"><Button size="icon" variant="ghost" onClick={() => navigate("/instrutor/cursos")}><ArrowLeft className="w-5 h-5" /></Button><div><p className="text-sm text-gray-400">Editor de curso</p><h1 className="text-3xl font-bold gradient-text">{course.title}</h1></div></div><Button variant={course.status === "published" ? "outline" : "default"} onClick={togglePublish}>{course.status === "published" ? "Despublicar" : "Publicar curso"}</Button></div>
      <CourseSettings key={`settings-${course.updated_at}`} course={course} />
      <OfferSettings key={`offer-${course.products?.[0]?.offers?.[0]?.updated_at ?? "new"}`} course={course} />
      <section className="space-y-4"><div><p className="text-sm text-gray-400">Estrutura acadêmica</p><h2 className="text-2xl font-bold">Módulos e aulas</h2></div>{course.course_modules?.map((module: any, index: number) => <ModuleEditor key={module.id} module={module} courseId={course.id} index={index} total={course.course_modules.length} reorder={reorderModules} refresh={refresh} />)}<Card className="border-dashed border-white/20 bg-transparent"><CardContent className="p-5 flex flex-col md:flex-row gap-2"><Input placeholder="Título do novo módulo" value={moduleTitle} onChange={(e) => setModuleTitle(e.target.value)} /><Button onClick={addModule} disabled={!moduleTitle.trim() || createModule.isPending}><Plus className="w-4 h-4 mr-2" />Adicionar módulo</Button></CardContent></Card></section>
    </div>
  );
}
