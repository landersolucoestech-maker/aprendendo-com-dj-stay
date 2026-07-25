import { FormEvent, useEffect, useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PortalHeader from "@/components/portal/PortalHeader";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/platform";

export default function EditProfile() {
  const navigate = useNavigate();
  const { user, profile, refreshIdentity } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setPhone(profile?.phone ?? "");
  }, [profile]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const { error: profileError } = await db.from("profiles").update({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
      }).eq("id", user.id);
      if (profileError) throw profileError;

      const { error: metadataError } = await supabase.auth.updateUser({
        data: { full_name: fullName.trim(), phone: phone.trim() || null },
      });
      if (metadataError) throw metadataError;

      await refreshIdentity();
      toast({ title: "Perfil atualizado", description: "Suas informações foram salvas." });
    } catch (error) {
      toast({ title: "Erro", description: error instanceof Error ? error.message : "Não foi possível atualizar o perfil.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <PortalHeader />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center gap-3"><Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}><ArrowLeft className="w-5 h-5" /></Button><div><p className="text-sm text-gray-400">Conta</p><h1 className="text-3xl font-bold gradient-text">Editar perfil</h1></div></div>
          <Card className="glass-card border-white/10">
            <CardHeader><CardTitle className="text-white">Informações pessoais</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={submit} className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2"><Label htmlFor="profile-name">Nome completo</Label><Input id="profile-name" value={fullName} onChange={(event) => setFullName(event.target.value)} required /></div>
                <div className="space-y-2"><Label htmlFor="profile-email">E-mail</Label><Input id="profile-email" value={user?.email ?? ""} disabled /></div>
                <div className="space-y-2"><Label htmlFor="profile-phone">Telefone</Label><Input id="profile-phone" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="(00) 00000-0000" /></div>
                <div className="md:col-span-2 flex justify-end"><Button type="submit" disabled={saving}><Save className="w-4 h-4 mr-2" />{saving ? "Salvando..." : "Salvar alterações"}</Button></div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
