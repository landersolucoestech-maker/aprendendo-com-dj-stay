import { CheckCircle, Clock3, Home, Loader2, ReceiptText } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getActiveEnrollments, useCourseAccess } from "@/hooks/useCourseAccess";
import { getErrorMessage } from "@/lib/error-message";

const PaymentSuccess = () => {
  const accessQuery = useCourseAccess();
  const activeEnrollments = accessQuery.data ? getActiveEnrollments(accessQuery.data) : [];
  const activeEnrollment = activeEnrollments[0];

  return (
    <div className="min-h-screen w-full bg-repeat flex items-center justify-center p-4">
      <Card className="glass-card border-white/10 max-w-md w-full text-center">
        <CardHeader className="pb-4">
          <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
            {accessQuery.isLoading ? (
              <Loader2 className="w-10 h-10 animate-spin text-white" />
            ) : activeEnrollment ? (
              <CheckCircle className="w-10 h-10 text-green-400" />
            ) : (
              <Clock3 className="w-10 h-10 text-amber-300" />
            )}
          </div>
          <CardTitle className="text-2xl font-bold text-white mb-2">
            {accessQuery.isLoading
              ? "Confirmando seu acesso"
              : activeEnrollment
                ? "Acesso ao curso liberado"
                : "Confirmação em processamento"}
          </CardTitle>
          <CardDescription className="text-gray-300">
            {activeEnrollment
              ? `Sua matrícula em ${activeEnrollment.courses.title} está ativa.`
              : "Esta página não libera conteúdo por conta própria. O acesso aparece assim que a confirmação confiável do pagamento criar ou ativar sua matrícula."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {accessQuery.error ? (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-left text-sm text-red-200">
              {getErrorMessage(accessQuery.error, "Não foi possível consultar sua matrícula agora.")}
            </div>
          ) : null}

          {activeEnrollment ? (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-left">
              <h3 className="text-green-400 font-semibold mb-2">Matrícula confirmada</h3>
              <p className="text-sm text-gray-300">
                Início: {new Date(activeEnrollment.starts_at).toLocaleString("pt-BR")}
              </p>
              <p className="text-sm text-gray-300">
                Validade: {activeEnrollment.expires_at === null
                  ? "sem data de expiração definida"
                  : new Date(activeEnrollment.expires_at).toLocaleString("pt-BR")}
              </p>
            </div>
          ) : (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 text-left">
              <h3 className="text-amber-300 font-semibold mb-2">Acesso ainda não confirmado</h3>
              <p className="text-sm text-gray-300">
                Atualize esta página após a confirmação do provedor. Nenhum conteúdo é liberado apenas por acessar esta URL.
              </p>
            </div>
          )}

          <div className="space-y-3">
            {activeEnrollment ? (
              <Link to="/dashboard" className="block">
                <Button className="w-full btn-brand">
                  <ReceiptText className="w-4 h-4 mr-2" />
                  Acessar curso
                </Button>
              </Link>
            ) : (
              <Button className="w-full btn-brand" disabled>
                <ReceiptText className="w-4 h-4 mr-2" />
                Acesso ainda não liberado
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20"
              onClick={() => void accessQuery.refetch()}
              disabled={accessQuery.isFetching}
            >
              {accessQuery.isFetching ? "Atualizando..." : "Verificar novamente"}
            </Button>
            <Link to="/" className="block">
              <Button variant="secondary" className="w-full">
                <Home className="w-4 h-4 mr-2" />
                Voltar ao início
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;
