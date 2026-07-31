import {
  Archive,
  ArrowDown,
  ArrowUp,
  Copy,
  Edit3,
  FileUp,
  GripVertical,
  MoreHorizontal,
  Plus,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CurriculumLessonRow, CurriculumModuleRow } from "@/contracts/curriculum-cms";

interface CurriculumModuleCardProps {
  readonly module: CurriculumModuleRow;
  readonly lessons: CurriculumLessonRow[];
  readonly moduleIndex: number;
  readonly moduleCount: number;
  readonly busy: boolean;
  readonly onMoveModule: (module: CurriculumModuleRow, direction: -1 | 1) => Promise<void>;
  readonly onEditModule: (module: CurriculumModuleRow) => void;
  readonly onDuplicateModule: (module: CurriculumModuleRow) => Promise<void>;
  readonly onArchiveModule: (module: CurriculumModuleRow) => Promise<void>;
  readonly onDeleteModule: (module: CurriculumModuleRow) => Promise<void>;
  readonly onCreateLesson: (module: CurriculumModuleRow) => void;
  readonly onMoveLesson: (module: CurriculumModuleRow, lesson: CurriculumLessonRow, direction: -1 | 1) => Promise<void>;
  readonly onMoveLessonToModule: (source: CurriculumModuleRow, lesson: CurriculumLessonRow) => Promise<unknown>;
  readonly onEditLesson: (module: CurriculumModuleRow, lesson: CurriculumLessonRow) => void;
  readonly onDuplicateLesson: (lesson: CurriculumLessonRow) => Promise<void>;
  readonly onArchiveLesson: (lesson: CurriculumLessonRow) => Promise<void>;
  readonly onDeleteLesson: (lesson: CurriculumLessonRow) => Promise<void>;
  readonly onAssets: (lesson: CurriculumLessonRow) => void;
}

const statusLabel = { draft: "Rascunho", published: "Publicado", archived: "Arquivado" } as const;

export const CurriculumModuleCard = ({
  module,
  lessons,
  moduleIndex,
  moduleCount,
  busy,
  onMoveModule,
  onEditModule,
  onDuplicateModule,
  onArchiveModule,
  onDeleteModule,
  onCreateLesson,
  onMoveLesson,
  onMoveLessonToModule,
  onEditLesson,
  onDuplicateLesson,
  onArchiveLesson,
  onDeleteLesson,
  onAssets,
}: CurriculumModuleCardProps) => (
  <Card className="border-white/10 bg-white/5 text-white">
    <CardHeader className="gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex min-w-0 gap-3">
        <GripVertical className="mt-1 h-5 w-5 shrink-0 text-gray-500" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="truncate">{module.titulo}</CardTitle>
            <Badge variant="outline">{statusLabel[module.status]}</Badge>
            {module.obrigatorio && <Badge>Obrigatório</Badge>}
            {module.preview_enabled && <Badge variant="secondary">Preview</Badge>}
          </div>
          <p className="mt-2 text-sm text-gray-400">{module.descricao || "Sem descrição."}</p>
          <p className="mt-1 text-xs text-gray-500">ordem {module.ordem} · versão {module.version} · {module.release_mode}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="icon" variant="outline" disabled={busy || moduleIndex === 0} onClick={() => onMoveModule(module, -1)} aria-label="Subir módulo"><ArrowUp className="h-4 w-4" /></Button>
        <Button size="icon" variant="outline" disabled={busy || moduleIndex === moduleCount - 1} onClick={() => onMoveModule(module, 1)} aria-label="Descer módulo"><ArrowDown className="h-4 w-4" /></Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => onEditModule(module)}><Edit3 className="mr-2 h-4 w-4" /> Editar</Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => onDuplicateModule(module)}><Copy className="mr-2 h-4 w-4" /> Duplicar</Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => onArchiveModule(module)}><Archive className="mr-2 h-4 w-4" /> Arquivar</Button>
        <Button size="sm" variant="destructive" disabled={busy} onClick={() => onDeleteModule(module)}><Trash2 className="mr-2 h-4 w-4" /> Excluir</Button>
      </div>
    </CardHeader>
    <CardContent className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold">Aulas ({lessons.length})</h3>
        <Button size="sm" disabled={busy} onClick={() => onCreateLesson(module)}><Plus className="mr-2 h-4 w-4" /> Nova aula</Button>
      </div>
      {lessons.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/15 p-6 text-center text-sm text-gray-400">Nenhuma aula ativa neste módulo.</div>
      ) : lessons.map((lesson, lessonIndex) => (
        <div key={lesson.id} className="flex flex-col gap-3 rounded-lg border border-white/10 bg-black/25 p-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">{lesson.titulo}</p>
              <Badge variant="outline">{statusLabel[lesson.status]}</Badge>
              <Badge variant="secondary">{lesson.content_kind}</Badge>
              {lesson.obrigatoria && <Badge>Obrigatória</Badge>}
              {lesson.preview_enabled && <Badge variant="secondary">Preview</Badge>}
            </div>
            <p className="mt-1 text-xs text-gray-400">ordem {lesson.ordem} · versão {lesson.version} · duração {lesson.duracao ?? 0}s · {lesson.release_mode}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="icon" variant="outline" disabled={busy || lessonIndex === 0} onClick={() => onMoveLesson(module, lesson, -1)} aria-label="Subir aula"><ArrowUp className="h-4 w-4" /></Button>
            <Button size="icon" variant="outline" disabled={busy || lessonIndex === lessons.length - 1} onClick={() => onMoveLesson(module, lesson, 1)} aria-label="Descer aula"><ArrowDown className="h-4 w-4" /></Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => onMoveLessonToModule(module, lesson)}><MoreHorizontal className="mr-2 h-4 w-4" /> Mover</Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => onEditLesson(module, lesson)}><Edit3 className="mr-2 h-4 w-4" /> Editar</Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => onAssets(lesson)}><FileUp className="mr-2 h-4 w-4" /> Mídia</Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => onDuplicateLesson(lesson)}><Copy className="mr-2 h-4 w-4" /> Duplicar</Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => onArchiveLesson(lesson)}><Archive className="mr-2 h-4 w-4" /> Arquivar</Button>
            <Button size="sm" variant="destructive" disabled={busy} onClick={() => onDeleteLesson(lesson)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        </div>
      ))}
    </CardContent>
  </Card>
);
