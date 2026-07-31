import { ClipboardCheck, Loader2, MessageSquareText, Send, ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";

import Footer from "@/components/Footer";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
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
    <div className="min-h-screen bg-black text-white">
      <Navigation />

      <section className="bg-gradient-to-b from-black via-gray-900 to-black pb-16 pt-20">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-gray-500">Canal oficial</p>
          <h1 className="gradient-text mb-6 mt-4 text-4xl font-bold md:text-5xl">
            Solicitação de contato
          </h1>
          <p className="mx-auto max-w-2xl text-xl text-gray-300">
            Registre sua dúvida ou solicitação. O sistema fornecerá um protocolo somente depois que o registro for confirmado no banco de dados.
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-16">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="space-y-6">
            <Card className="glass-card border-white/10">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-neon">
                    <ShieldCheck className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-white">Registro verificável</h2>
                    <p className="mt-2 text-sm leading-6 text-gray-300">
                      O protocolo apresentado após o envio identifica a solicitação persistida. Nenhuma confirmação é exibida antes do commit transacional.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-white/10">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-neon">
                    <MessageSquareText className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-white">Informações úteis</h2>
                    <p className="mt-2 text-sm leading-6 text-gray-300">
                      Informe o contexto, o curso ou produto relacionado e o resultado esperado. Não inclua senhas, dados bancários ou credenciais de acesso.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {confirmation ? (
              <Card className="border-emerald-500/20 bg-emerald-500/10">
                <CardContent className="flex items-start gap-4 p-6 text-emerald-100">
                  <ClipboardCheck className="mt-0.5 h-7 w-7 shrink-0" />
                  <div>
                    <h2 className="text-lg font-semibold">Solicitação registrada</h2>
                    <p className="mt-2 text-sm text-emerald-200">
                      Protocolo: <strong className="font-mono">{confirmation.reference_code}</strong>
                    </p>
                    <p className="mt-1 text-sm text-emerald-200">
                      Registrada em {formatDateTime(confirmation.submitted_at)}.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </div>

          <Card className="glass-card border-white/10">
            <CardHeader>
              <CardTitle className="text-2xl text-white">Registrar solicitação</CardTitle>
              <CardDescription className="text-gray-300">
                Todos os campos são validados novamente no servidor.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={(event) => void handleSubmit(event)} className="space-y-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-white">Nome</Label>
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Seu nome"
                      required
                      minLength={2}
                      maxLength={150}
                      className="border-white/20 bg-white/5 text-white placeholder:text-gray-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-white">E-mail</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="seu@email.com"
                      required
                      maxLength={320}
                      className="border-white/20 bg-white/5 text-white placeholder:text-gray-400"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject" className="text-white">Assunto</Label>
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
                    className="border-white/20 bg-white/5 text-white placeholder:text-gray-400"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message" className="text-white">Mensagem</Label>
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
                    className="resize-none border-white/20 bg-white/5 text-white placeholder:text-gray-400"
                  />
                </div>

                {submitContact.error ? (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">
                    {getErrorMessage(
                      submitContact.error,
                      "A solicitação não foi registrada. Revise os dados e tente novamente.",
                    )}
                  </div>
                ) : null}

                <Button type="submit" disabled={submitContact.isPending} className="btn-neon w-full">
                  {submitContact.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  {submitContact.isPending ? "Registrando..." : "Registrar solicitação"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Contact;
