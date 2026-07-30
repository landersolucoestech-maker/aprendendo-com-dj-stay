export function AuthLoadingScreen() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center" role="status" aria-live="polite">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
        <p className="text-gray-300">Verificando sua sessão...</p>
      </div>
    </div>
  );
}
