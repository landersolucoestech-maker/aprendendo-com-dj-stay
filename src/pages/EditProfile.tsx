import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Camera, Loader2, Save, User } from "lucide-react";
import { Link } from "react-router-dom";

import { getAuthErrorMessage } from "@/auth/auth-errors";
import { useAuth } from "@/auth/use-auth";
import { getUserMetadataProfile } from "@/auth/user-metadata";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAvatarUpload } from "@/hooks/useAvatarUpload";
import { useToast } from "@/hooks/use-toast";
import { useUpdateProfile, useUserProfile } from "@/hooks/useUserProfile";
import { supabase } from "@/integrations/supabase/client";

interface ProfileForm {
  name: string;
  email: string;
  phone: string;
  bio: string;
  instagram: string;
  youtube: string;
  website: string;
}

const EMPTY_FORM: ProfileForm = { name: "", email: "", phone: "", bio: "", instagram: "", youtube: "", website: "" };

const EditProfile = () => {
  const { user, refreshSession } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: profile, isLoading: profileLoading } = useUserProfile();
  const updateProfile = useUpdateProfile();
  const { uploadAvatar, isUploading } = useAvatarUpload();
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }

    const metadata = getUserMetadataProfile(user);
    setForm({
      name: metadata.fullName,
      email: user.email ?? "",
      phone: metadata.phone,
      bio: metadata.bio,
      instagram: metadata.instagram,
      youtube: metadata.youtube,
      website: metadata.website,
    });
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

    await updateProfile.mutateAsync({ avatar_url: avatarUrl });
    toast({ title: "Avatar atualizado", description: "Sua foto de perfil foi salva." });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: form.name.trim(),
        phone: form.phone.trim(),
        bio: form.bio.trim(),
        instagram: form.instagram.trim(),
        youtube: form.youtube.trim(),
        website: form.website.trim(),
      },
    });
    setIsSaving(false);

    if (error) {
      toast({ title: "Não foi possível atualizar o perfil", description: getAuthErrorMessage(error), variant: "destructive" });
      return;
    }

    await refreshSession();
    toast({ title: "Perfil atualizado", description: "As informações foram salvas no seu usuário." });
  };

  if (profileLoading || !user) {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="bg-gradient-to-r from-black via-gray-900 to-black border-b border-white/10"><div className="container mx-auto px-4 py-6 flex items-center gap-4"><Link to="/dashboard"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link><div><h1 className="text-3xl font-bold gradient-text">Editar perfil</h1><p className="text-gray-300">Atualize suas informações pessoais.</p></div></div></div>
      <div className="container mx-auto px-4 py-8"><form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-8">
        <Card className="glass-card border-white/10"><CardHeader><CardTitle>Foto do perfil</CardTitle><CardDescription className="text-gray-400">Imagem vinculada ao seu usuário.</CardDescription></CardHeader><CardContent className="flex items-center gap-6"><Avatar className="w-24 h-24"><AvatarImage src={profile?.avatar_url ?? ""} /><AvatarFallback><User className="w-10 h-10" /></AvatarFallback></Avatar><input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarChange} /><Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading}><Camera className="w-4 h-4 mr-2" />{isUploading ? "Enviando..." : "Alterar foto"}</Button></CardContent></Card>
        <Card className="glass-card border-white/10"><CardHeader><CardTitle>Informações pessoais</CardTitle></CardHeader><CardContent className="space-y-4">
          <div><Label htmlFor="name">Nome</Label><Input id="name" name="name" value={form.name} onChange={handleInputChange} className="bg-white/5 border-white/20 text-white" required /></div>
          <div><Label htmlFor="email">Email</Label><Input id="email" value={form.email} className="bg-white/5 border-white/20 text-white" disabled /></div>
          <div><Label htmlFor="phone">Telefone</Label><Input id="phone" name="phone" value={form.phone} onChange={handleInputChange} className="bg-white/5 border-white/20 text-white" /></div>
          <div><Label htmlFor="bio">Biografia</Label><Textarea id="bio" name="bio" value={form.bio} onChange={handleInputChange} className="bg-white/5 border-white/20 text-white" /></div>
          <div><Label htmlFor="instagram">Instagram</Label><Input id="instagram" name="instagram" value={form.instagram} onChange={handleInputChange} className="bg-white/5 border-white/20 text-white" /></div>
          <div><Label htmlFor="youtube">YouTube</Label><Input id="youtube" name="youtube" value={form.youtube} onChange={handleInputChange} className="bg-white/5 border-white/20 text-white" /></div>
          <div><Label htmlFor="website">Website</Label><Input id="website" name="website" type="url" value={form.website} onChange={handleInputChange} className="bg-white/5 border-white/20 text-white" /></div>
        </CardContent></Card>
        <div className="flex justify-end gap-4"><Link to="/dashboard"><Button type="button" variant="outline">Cancelar</Button></Link><Button type="submit" className="btn-brand" disabled={isSaving || isUploading}><Save className="w-4 h-4 mr-2" />{isSaving ? "Salvando..." : "Salvar alterações"}</Button></div>
      </form></div>
    </div>
  );
};

export default EditProfile;
