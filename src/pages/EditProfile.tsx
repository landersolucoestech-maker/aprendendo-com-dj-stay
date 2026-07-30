import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Camera, Loader2, Save, User } from "lucide-react";
import { Link } from "react-router-dom";

import { getAuthErrorMessage } from "@/auth/auth-errors";
import { getUserMetadataProfile } from "@/auth/user-metadata";
import { useAuth } from "@/auth/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { parseDataContract } from "@/contracts/contract-error";
import { profileMetadataInputSchema } from "@/contracts/learning";
import { useAvatarUpload } from "@/hooks/useAvatarUpload";
import { useToast } from "@/hooks/use-toast";
import { useUpdateProfile, useUserProfile } from "@/hooks/useUserProfile";
import { supabase } from "@/integrations/supabase/client";
import { getErrorMessage } from "@/lib/error-message";

interface ProfileForm {
  name: string;
  email: string;
  phone: string;
  bio: string;
  instagram: string;
  youtube: string;
  website: string;
}

const EMPTY_FORM: ProfileForm = {
  name: "",
  email: "",
  phone: "",
  bio: "",
  instagram: "",
  youtube: "",
  website: "",
};

const EditProfile = () => {
  const { user, refreshSession } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const profileQuery = useUserProfile();
  const updateProfile = useUpdateProfile();
  const { uploadAvatar, isUploading } = useAvatarUpload();
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [metadataError, setMetadataError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
      return;
    }

    try {
      const metadata = getUserMetadataProfile(user);
      setMetadataError(null);
      setForm({
        name: metadata.fullName,
        email: user.email ?? "Email não informado",
        phone: metadata.phone,
        bio: metadata.bio,
        instagram: metadata.instagram,
        youtube: metadata.youtube,
        website: metadata.website,
      });
    } catch (error: unknown) {
      setMetadataError(error instanceof Error ? error : new Error("Metadados inválidos."));
    }
  }, [user]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const avatarUrl = await uploadAvatar(file);
    if (!avatarUrl) {
      return;
    }

    try {
      await updateProfile.mutateAsync({ avatarUrl });
      toast({ title: "Avatar atualizado", description: "Sua foto de perfil foi salva." });
    } catch (error: unknown) {
      toast({
        title: "Não foi possível salvar o avatar",
        description: getErrorMessage(error, "Tente novamente em alguns instantes."),
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      const metadata = parseDataContract(
        profileMetadataInputSchema,
        {
          name: form.name,
          phone: form.phone,
          bio: form.bio,
          instagram: form.instagram,
          youtube: form.youtube,
          website: form.website,
        },
        "formulário de perfil",
      );
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: metadata.name,
          phone: metadata.phone,
          bio: metadata.bio,
          instagram: metadata.instagram,
          youtube: metadata.youtube,
          website: metadata.website,
        },
      });

      if (error) {
        toast({
          title: "Não foi possível atualizar o perfil",
          description: getAuthErrorMessage(error),
          variant: "destructive",
        });
        return;
      }

      await refreshSession();
      toast({ title: "Perfil atualizado", description: "As informações foram salvas." });
    } catch (error: unknown) {
      toast({
        title: "Dados de perfil inválidos",
        description: getErrorMessage(
          error,
          "Revise os campos informados. Links devem utilizar endereço HTTPS completo.",
        ),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (profileQuery.isLoading || !user) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (profileQuery.error || metadataError) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center max-w-lg px-4">
          <h1 className="text-2xl font-bold mb-4">Erro ao carregar perfil</h1>
          <p className="text-gray-300 mb-4">
            {getErrorMessage(
              profileQuery.error ?? metadataError,
              "Não foi possível carregar seu perfil.",
            )}
          </p>
          <Link to="/portal">
            <Button className="btn-brand">Voltar ao portal</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="bg-gradient-to-r from-black via-gray-900 to-black border-b border-white/10">
        <div className="container mx-auto px-4 py-6 flex items-center gap-4">
          <Link to="/portal">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold gradient-text">Editar perfil</h1>
            <p className="text-gray-300">Atualize suas informações pessoais.</p>
          </div>
        </div>
      </div>
      <div className="container mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-8">
          <Card className="glass-card border-white/10">
            <CardHeader>
              <CardTitle>Foto do perfil</CardTitle>
              <CardDescription className="text-gray-400">
                Imagem vinculada ao seu usuário.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-6">
              <Avatar className="w-24 h-24">
                {profileQuery.data?.avatar_url ? <AvatarImage src={profileQuery.data.avatar_url} /> : null}
                <AvatarFallback>
                  <User className="w-10 h-10" />
                </AvatarFallback>
              </Avatar>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarChange}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || updateProfile.isPending}
              >
                <Camera className="w-4 h-4 mr-2" />
                {isUploading || updateProfile.isPending ? "Enviando..." : "Alterar foto"}
              </Button>
            </CardContent>
          </Card>
          <Card className="glass-card border-white/10">
            <CardHeader>
              <CardTitle>Informações pessoais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Nome</Label>
                <Input id="name" name="name" value={form.name} onChange={handleInputChange} maxLength={120} className="bg-white/5 border-white/20 text-white" required />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={form.email} className="bg-white/5 border-white/20 text-white" disabled />
              </div>
              <div>
                <Label htmlFor="phone">Telefone</Label>
                <Input id="phone" name="phone" value={form.phone} onChange={handleInputChange} maxLength={40} className="bg-white/5 border-white/20 text-white" />
              </div>
              <div>
                <Label htmlFor="bio">Biografia</Label>
                <Textarea id="bio" name="bio" value={form.bio} onChange={handleInputChange} maxLength={1000} className="bg-white/5 border-white/20 text-white" />
              </div>
              <div>
                <Label htmlFor="instagram">Instagram</Label>
                <Input id="instagram" name="instagram" type="url" value={form.instagram} onChange={handleInputChange} maxLength={500} placeholder="https://instagram.com/..." className="bg-white/5 border-white/20 text-white" />
              </div>
              <div>
                <Label htmlFor="youtube">YouTube</Label>
                <Input id="youtube" name="youtube" type="url" value={form.youtube} onChange={handleInputChange} maxLength={500} placeholder="https://youtube.com/..." className="bg-white/5 border-white/20 text-white" />
              </div>
              <div>
                <Label htmlFor="website">Website</Label>
                <Input id="website" name="website" type="url" value={form.website} onChange={handleInputChange} maxLength={500} placeholder="https://..." className="bg-white/5 border-white/20 text-white" />
              </div>
            </CardContent>
          </Card>
          <div className="flex justify-end gap-4">
            <Link to="/portal">
              <Button type="button" variant="outline">Cancelar</Button>
            </Link>
            <Button type="submit" className="btn-brand" disabled={isSaving || isUploading}>
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? "Salvando..." : "Salvar alterações"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfile;
