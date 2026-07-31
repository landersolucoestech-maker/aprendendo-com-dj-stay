import { existsSync, readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };

const progressHook = read("src/hooks/useUserProgress.ts");
const tracker = read("src/hooks/useLessonProgressTracker.ts");
const client = read("src/lib/lesson-progress-client.ts");
const player = read("src/components/VideoPlayer.tsx");
const privateMedia = read("src/components/PrivateLessonMedia.tsx");
const externalMedia = read("src/components/ExternalLessonMedia.tsx");
const externalBridge = read("src/lib/external-player-bridge.ts");
const lessonPage = read("src/pages/Lesson.tsx");

expect(!progressHook.includes(".upsert("), "Progresso não pode usar upsert direto.");
expect(progressHook.includes('rpc("save_lesson_progress_event"'), "Progresso deve usar o RPC ordenado.");
expect(tracker.includes('persist("heartbeat")'), "Player deve persistir heartbeat periódico.");
expect(tracker.includes('persist("pause")'), "Player deve persistir pausa.");
expect(tracker.includes('persist("ended")'), "Player deve persistir término.");
expect(tracker.includes('persist("visibility_hidden")'), "Player deve persistir ao ocultar a aba.");
expect(tracker.includes("15_000"), "Heartbeat deve possuir intervalo periódico explícito.");
expect(client.includes("sessionStorage"), "Cada aba deve manter identidade e sequência próprias.");
expect(client.includes("BroadcastChannel"), "Abas devem sincronizar atualizações de progresso.");
expect(player.includes("useLessonProgressTracker"), "Player deve usar o rastreador ordenado.");
expect(player.includes('aria-live="polite"'), "Estado de salvamento deve ser anunciado por tecnologia assistiva.");
expect(privateMedia.includes('controlsList="nodownload"') || privateMedia.includes('controlsList: "nodownload"'), "Mídia privada deve manter controles acessíveis sem download direto.");
expect(!privateMedia.includes("noplaybackrate"), "Controle de velocidade não deve ser removido.");
expect(externalMedia.includes("parseExternalPlayerMessage"), "Mídia externa deve reportar eventos reais.");
expect(externalBridge.includes("enablejsapi"), "YouTube deve habilitar API de acompanhamento.");
expect(externalBridge.includes('url.searchParams.set("api", "1")'), "Vimeo deve habilitar API de acompanhamento.");
expect(player.includes('completionMode === "manual"'), "Conclusão manual deve respeitar o modo configurado.");
expect(player.includes('completionMode === "reading_acknowledgement"'), "Confirmação de leitura deve respeitar o modo configurado.");
expect(player.includes('completionMode === "media_progress"'), "Conclusão por mídia deve ser automática.");
expect(!lessonPage.includes('/dashboard'), "Aula não pode retornar ao dashboard legado.");
expect(lessonPage.includes('/aluno/cursos'), "Aula deve retornar ao Portal do Aluno.");

for (const path of [
  "supabase/migrations/20260731040000_lesson_progress_events.sql",
  "supabase/migrations/20260731040100_lesson_progress_rpc.sql",
  "supabase/migrations/20260731040200_lesson_progress_public_rpc.sql",
  "supabase/tests/24_lesson_progress_schema.test.sql",
  "supabase/tests/25_lesson_progress_events.test.sql",
]) expect(existsSync(path), `${path} deve existir.`);

if (failures.length) {
  console.error("Contrato B15 inválido:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log("Contrato estático da FASE B15 aprovado.");
