import { existsSync, readFileSync } from "node:fs";

const paths = {
  contracts: "src/contracts/learning.ts",
  tests: "src/contracts/learning.test.ts",
  userProgress: "src/hooks/useUserProgress.ts",
  tracker: "src/hooks/useLessonProgressTracker.ts",
  lessons: "src/hooks/useLessons.ts",
  modules: "src/hooks/useModules.ts",
  canonicalSchema: "supabase/migrations/20260730140000_canonical_learning_schema.sql",
  curriculumSchema: "supabase/migrations/20260730230000_curriculum_cms_schema.sql",
  eventSchema: "supabase/migrations/20260731040000_lesson_progress_events.sql",
  privateRpc: "supabase/migrations/20260731040100_lesson_progress_rpc.sql",
  publicRpc: "supabase/migrations/20260731040200_lesson_progress_public_rpc.sql",
  documentation: "docs/refactor/FASE-B74-LEARNING-PROGRESS-CONTRACT-TESTS.md",
  package: "package.json",
};

const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

for (const path of Object.values(paths)) {
  expect(existsSync(path), `${path} deve existir.`);
}

const read = (path) => (existsSync(path) ? readFileSync(path, "utf8") : "");
const contracts = read(paths.contracts);
const tests = read(paths.tests);
const userProgress = read(paths.userProgress);
const tracker = read(paths.tracker);
const lessons = read(paths.lessons);
const modules = read(paths.modules);
const database = [
  paths.canonicalSchema,
  paths.curriculumSchema,
  paths.eventSchema,
  paths.privateRpc,
  paths.publicRpc,
]
  .map(read)
  .join("\n");
const documentation = read(paths.documentation);
const packageJson = existsSync(paths.package)
  ? JSON.parse(read(paths.package))
  : { scripts: {} };

for (const fragment of [
  "validateLessonCompletion",
  "O percentual de conclusão deve acompanhar o modo da aula.",
  "validateProgressRow",
  "Uma aula concluída deve possuir progresso de 100%.",
  "A revisão deve ser coerente com os dados do último evento.",
  "lessonProgressEventInputSchema",
  "value.positionSeconds > value.durationSeconds + 30",
  "lessonProgressStreamSchema",
  "lessonProgressEventSchema",
  "A aceitação do evento deve ser coerente com o motivo de descarte.",
  "value.position_seconds > value.duration_seconds + 30",
  "lessonProgressEventsSchema",
  ".strict()",
]) {
  expect(contracts.includes(fragment), `Contrato B74 ausente: ${fragment}`);
}

for (const fragment of [
  "aulas_completion_contract",
  "progresso_percentual_range",
  "progresso_tempo_nonnegative",
  "progresso_aulas_revision_nonnegative",
  "lesson_progress_streams_sequence_positive",
  "lesson_progress_streams_position_nonnegative",
  "lesson_progress_events_sequence_positive",
  "lesson_progress_events_position_range",
  "lesson_progress_events_duration_range",
  "lesson_progress_events_progress_range",
  "lesson_progress_events_revision_nonnegative",
  "lesson_progress_events_ignored_contract",
  "PROGRESS_POSITION_EXCEEDS_DURATION",
  "if v_result_completed then v_result_percent := 100",
  "returns public.progresso_aulas",
  "public.save_lesson_progress_event",
]) {
  expect(database.includes(fragment), `Constraint/RPC B74 ausente: ${fragment}`);
}

for (const fragment of [
  "aceita os quatro modos de conclusão coerentes",
  "rejeita media_progress sem percentual",
  "rejeita percentual residual nos demais modos",
  "rejeita campos extras nos recortes e níveis aninhados",
  "aceita agregado inicial e agregado com último evento",
  "aceita progresso concluído somente em 100%",
  "rejeita revisão zero com dados de evento",
  "rejeita revisão positiva com quarteto parcial",
  "preserva a coerência no recorte de atividades recentes",
  "aceita posição dentro da duração e tolerância de 30 segundos",
  "rejeita posição acima da tolerância",
  "aceita stream ordenado e coleção de streams",
  "aceita evento processado e coleção de eventos",
  "aceita evento descartado com motivo",
  "aceita duração nula no registro persistido",
  "rejeita accepted com motivo e rejected sem motivo",
  "rejeita posição persistida acima da duração e tolerância",
  "safeParse",
]) {
  expect(tests.includes(fragment), `Cobertura B74 ausente: ${fragment}`);
}

for (const fragment of [
  "lessonProgressEventInputSchema",
  "progressResponseSchema",
  "progressRowSchema",
  'rpc("save_lesson_progress_event"',
  "parseDataContract",
]) {
  expect(userProgress.includes(fragment), `Consumidor de progresso B74 ausente: ${fragment}`);
}
expect(
  tracker.includes("Math.min(positionSeconds, durationSeconds + 30)"),
  "Tracker deve limitar posição à duração mais 30 segundos.",
);
expect(
  tracker.includes("durationSeconds") && tracker.includes("observedAt: new Date().toISOString()"),
  "Tracker deve enviar duração e timestamp observado.",
);
expect(
  lessons.includes("lessonsResponseSchema") && lessons.includes("parseDataContract"),
  "Listagem de aulas deve consumir o recorte estrito B74.",
);
expect(
  modules.includes("modulesResponseSchema") && modules.includes("parseDataContract"),
  "Listagem de módulos deve consumir o recorte estrito B74.",
);
expect(
  documentation.includes("Fase B74") &&
    documentation.includes("B53") &&
    documentation.includes("Nenhuma migration") &&
    documentation.includes("Supabase remoto"),
  "Documentação B74 deve registrar escopo, exclusões e separação da B53.",
);
expect(
  packageJson.scripts?.["check:learning-progress-contract-tests"] ===
    "node scripts/check-learning-progress-contract-tests.mjs",
  "package.json deve expor check:learning-progress-contract-tests.",
);
expect(
  packageJson.scripts?.typecheck?.includes(
    "npm run check:learning-progress-contract-tests",
  ),
  "Contrato B74 deve estar encadeado ao typecheck.",
);

if (failures.length > 0) {
  console.error("Falhas no contrato B74:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(
  "Contrato B74 aprovado: aulas, agregados, streams e eventos de progresso reproduzem os constraints B12/B15 com cobertura unitária estrita.",
);
