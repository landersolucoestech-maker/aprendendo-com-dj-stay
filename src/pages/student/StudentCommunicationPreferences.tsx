import { Bell, Loader2, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { StudentPortalPageFrame } from "@/components/student/StudentPortalPageFrame";
import { StudentSectionHeader } from "@/components/student/StudentPortalPrimitives";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { PageState } from "@/components/ui/page-state";
import { Switch } from "@/components/ui/switch";
import {
  useStudentCommunicationPreferences,
  useUpdateStudentCommunicationPreferences,
} from "@/hooks/useStudentCommunicationPreferences";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/error-message";

const CONSENT_VERSION = "privacy-2026-08-01";

const StudentCommunicationPreferences = () => {
  const { toast } = useToast();
  const preferencesQuery = useStudentCommunicationPreferences();
  const updatePreferences = useUpdateStudentCommunicationPreferences();
  const [emailTransactional, setEmailTransactional] = useState(false);
  const [emailProductUpdates, setEmailProductUpdates] = useState(false);
  const [emailMarketing, setEmailMarketing] = useState(false);
  const [privacyAnalytics, setPrivacyAnalytics] = useState(false);

  useEffect(() => {
    if (!preferencesQuery.data) return;
    setEmailTransactional(preferencesQuery.data.email_transactional);
    setEmailProductUpdates(preferencesQuery.data.email_product_updates);
    setEmailMarketing(preferencesQuery.data.email_marketing);
    setPrivacyAnalytics(preferencesQuery.data.privacy_analytics);
  }, [preferencesQuery.data]);

  const handleSave = async () => {
    try {
      await updatePreferences.mutateAsync({
        email_transactional: emailTransactional,
        email_product_updates: emailProductUpdates,
        email_marketing: emailMarketing,
        privacy_analytics: privacyAnalytics,
        consent_version:
          emailMarketing || privacyAnalytics ? CONSENT_VERSION : null,
      });
      toast({
        title: "Preferências salvas",
        description: "Suas escolhas foram atualizadas com segurança.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Não foi possível salvar",
        description: getErrorMessage(error, "Tente novamente."),
      });
    }
  };

  return (
    <StudentPortalPageFrame>
      <div className="space-y-8">
        <StudentSectionHeader
          eyebrow="Conta e privacidade"
          title="Preferências de comunicação"
          description="Controle comunicações opcionais sem desativar avisos essenciais da plataforma."
          action={
            <Button
              type="button"
              onClick={() => void handleSave()}
              disabled={preferencesQuery.isLoading || updatePreferences.isPending}
            >
              {updatePreferences.isPending ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <ShieldCheck aria-hidden="true" />
              )}
              Salvar preferências
            </Button>
          }
        />

        {preferencesQuery.isLoading ? (
          <PageState
            variant="loading"
            title="Carregando preferências"
            description="Consultando as escolhas vinculadas à sua conta."
          />
        ) : preferencesQuery.error ? (
          <PageState
            variant="error"
            title="Preferências indisponíveis"
            description={getErrorMessage(
              preferencesQuery.error,
              "Não foi possível carregar suas preferências.",
            )}
          />
        ) : (
          <div className="grid gap-6 xl:grid-cols-2">
            <Card variant="course">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" aria-hidden="true" />
                  Avisos essenciais
                </CardTitle>
                <CardDescription>
                  Mensagens necessárias para operar sua conta e seus serviços.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-start justify-between gap-4 rounded-xl border border-border p-4">
                  <div>
                    <Label htmlFor="in-app-transactional">Notificações internas</Label>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Suporte, pagamentos, acessos e certificados. Permanecem ativas.
                    </p>
                  </div>
                  <Switch id="in-app-transactional" checked disabled />
                </div>
                <div className="flex items-start justify-between gap-4 rounded-xl border border-border p-4">
                  <div>
                    <Label htmlFor="email-transactional">E-mails transacionais</Label>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Autoriza o envio por e-mail quando esse canal for integrado.
                    </p>
                  </div>
                  <Switch
                    id="email-transactional"
                    checked={emailTransactional}
                    onCheckedChange={setEmailTransactional}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" aria-hidden="true" />
                  Comunicações opcionais
                </CardTitle>
                <CardDescription>
                  Todas começam desativadas e podem ser alteradas a qualquer momento.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-start justify-between gap-4 rounded-xl border border-border p-4">
                  <div>
                    <Label htmlFor="email-product-updates">Atualizações de produtos</Label>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Novos conteúdos, melhorias e alterações relevantes nos produtos.
                    </p>
                  </div>
                  <Switch
                    id="email-product-updates"
                    checked={emailProductUpdates}
                    onCheckedChange={setEmailProductUpdates}
                  />
                </div>
                <div className="flex items-start justify-between gap-4 rounded-xl border border-border p-4">
                  <div>
                    <Label htmlFor="email-marketing">Marketing</Label>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Campanhas, lançamentos e ofertas promocionais.
                    </p>
                  </div>
                  <Switch
                    id="email-marketing"
                    checked={emailMarketing}
                    onCheckedChange={setEmailMarketing}
                  />
                </div>
                <div className="flex items-start justify-between gap-4 rounded-xl border border-border p-4">
                  <div>
                    <Label htmlFor="privacy-analytics">Analytics opcionais</Label>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Autoriza métricas adicionais para melhorar a experiência.
                    </p>
                  </div>
                  <Switch
                    id="privacy-analytics"
                    checked={privacyAnalytics}
                    onCheckedChange={setPrivacyAnalytics}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="xl:col-span-2">
              <CardContent className="flex items-start gap-3 p-5 text-sm text-muted-foreground">
                <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-course" aria-hidden="true" />
                <p>
                  Ativar marketing ou analytics registra a versão do consentimento e o horário da escolha. Esta fase apenas persiste preferências; nenhum envio externo foi implementado.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </StudentPortalPageFrame>
  );
};

export default StudentCommunicationPreferences;
