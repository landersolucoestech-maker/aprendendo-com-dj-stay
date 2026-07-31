import {
  ClipboardCheck,
  Loader2,
  MessageSquareText,
  Send,
  ShieldCheck,
} from "lucide-react";
import { useState, type ChangeEvent, type FormEvent } from "react";

import Footer from "@/components/Footer";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ContactSubmissionResult } from "@/contracts/contact-messages";
import { useSubmitContactMessage } from "@/hooks/useContactMessages";
import { getErrorMessage } from "@/lib/error-message";

const emptyForm = {
  name: "",
  email: "",
  subject: "",
  message: "",
};

const formatDateTime = (value: string): string =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));

const Contact = () => {
  const submitContact = useSubmitContactMessage();
  const [formData, setFormData] = useState(emptyForm);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const [confirmation, setConfirmation] = useState<ContactSubmissionResult | null>(null);

  const handleInputChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    if (submitContact.error) submitContact.reset();
    setConfirmation(null);
    setFormData((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setConfirmation(null);

    try {
      const result = await submitContact.mutateAsync({
        name: formData.name,
        email: formData.email,
        subject: formData.subject,
        message: formData.message,
        idempotencyKey,
      });
      setConfirmation(result);
      setFormData(emptyForm);
      setIdempotencyKey(crypto.randomUUID());
    } catch {
      // A mutação mantém o erro disponível para a mensagem abaixo.
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />

      <main>
        <section className="bg-gradient-to-b from-background via-surface-overlay to-background pb-16 pt-28">
          <div className="container mx-auto px-4 text-center">
            <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">
              Canal oficial
            </p>
            <h1 className="gradient-text mb-6 mt-4 text-4xl font-bold md:text-5xl">
              Solicitação de contato
            </h1>
            <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
              Registre sua dúvida ou solicitação. O sistema fornecerá um protocolo
              somente depois que o registro for confirmado no banco de dados.
            </p>
          </div>
        </section>

        <div className="container mx-auto px-4 py-16">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="space-y-6">
              <Card className="glass-card border-border">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-brand-light text-primary-foreground">
                      <ShieldCheck className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <div>
                      <h2 className="font-semibold">Registro verificável</h2>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        O protocolo apresentado após o envio identifica a solicitação
                        persistida. Nenhuma confirmação é exibida antes do commit
                        transacional.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card border-border">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-brand-light text-primary-foreground">
                      <MessageSquareText className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <div>
                      <h2 className="font-semibold">Informações úteis</h2>
                      <p
                        id="contact-security-guidance"
                        className="mt-2 text-sm leading-6 text-muted-foreground"
                      >
                        Informe o contexto, o curso ou produto relacionado e o resultado
                        esperado. Não inclua senhas, dados bancários ou credenciais de
                        acesso.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {confirmation ? (
                <Card
                  className="border-emerald-500/30 bg-emerald-950/60"
                  role="status"
                  aria-live="polite"
                >
                  <CardContent className="flex items-start gap-4 p-6 text-emerald-100">
                    <ClipboardCheck
                      className="mt-0.5 h-7 w-7 shrink-0"
                      aria-hidden="true"
                    />
                    <div>
                      <h2 className="text-lg font-semibold">Solicitação registrada</h2>
                      <p className="mt-2 text-sm text-emerald-100">
                        Protocolo:{" "}
                        <strong className="font-mono">
                          {confirmation.reference_code}
                        </strong>
                      </p>
                      <p className="mt-1 text-sm text-emerald-100">
                        Registrada em {formatDateTime(confirmation.submitted_at)}.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : null}
            </div>

            <Card className="glass-card border-border">
              <CardHeader>
                <CardTitle className="text-2xl">Registrar solicitação</CardTitle>
                <CardDescription
                  id="contact-form-description"
                  className="text-muted-foreground"
                >
                  Todos os campos são validados novamente no servidor.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={(event) => void handleSubmit(event)}
                  className="space-y-6"
                  aria-describedby="contact-form-description contact-security-guidance"
                  aria-busy={submitContact.isPending}
                >
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome</Label>
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        autoComplete="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="Seu nome"
                        required
                        minLength={2}
                        maxLength={150}
                        className="border-input bg-background/40 text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="seu@email.com"
                        required
                        maxLength={320}
                        className="border-input bg-background/40 text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject">Assunto</Label>
                    <Input
                      id="subject"
                      name="subject"
                      type="text"
                      value={formData.subject}
                      onChange={handleInputChange}
                      placeholder="Motivo da solicitação"
                      required
                      minLength={3}
                      maxLength={200}
                      className="border-input bg-background/40 text-foreground placeholder:text-muted-foreground"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Mensagem</Label>
                    <Textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      placeholder="Descreva a situação com detalhes suficientes para análise."
                      required
                      minLength={10}
                      maxLength={5000}
                      rows={8}
                      className="resize-none border-input bg-background/40 text-foreground placeholder:text-muted-foreground"
                      aria-describedby="contact-security-guidance"
                    />
                  </div>

                  {submitContact.error ? (
                    <div
                      role="alert"
                      className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive-foreground"
                    >
                      {getErrorMessage(
                        submitContact.error,
                        "A solicitação não foi registrada. Revise os dados e tente novamente.",
                      )}
                    </div>
                  ) : null}

                  <Button
                    type="submit"
                    variant="brand"
                    disabled={submitContact.isPending}
                    className="w-full"
                  >
                    {submitContact.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Send className="h-4 w-4" aria-hidden="true" />
                    )}
                    {submitContact.isPending
                      ? "Registrando..."
                      : "Registrar solicitação"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Contact;
