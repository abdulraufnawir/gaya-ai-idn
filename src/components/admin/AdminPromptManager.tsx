import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
interface AIPrompt {
  id: string;
  feature_name: string;
  system_prompt: string;
  user_prompt_template: string | null;
  description: string | null;
  is_active: boolean;
  clothing_types: string[];
  created_at: string;
  updated_at: string;
}
const CLOTHING_TYPES = [{
  id: 'atasan',
  label: 'Atasan (Tops)'
}, {
  id: 'bawahan',
  label: 'Bawahan (Bottoms)'
}, {
  id: 'gaun',
  label: 'Gaun (Dress)'
}, {
  id: 'hijab',
  label: 'Hijab'
}];
const AdminPromptManager = () => {
  const [prompts, setPrompts] = useState<AIPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newPrompt, setNewPrompt] = useState({
    feature_name: "",
    system_prompt: "",
    user_prompt_template: "",
    description: "",
    is_active: true,
    clothing_types: [] as string[]
  });
  const {
    toast
  } = useToast();
  useEffect(() => {
    loadPrompts();
  }, []);
  const loadPrompts = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from("ai_prompts").select("*").order("feature_name");
      if (error) throw error;
      setPrompts(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading prompts",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const handleSave = async (prompt: AIPrompt) => {
    setSaving(prompt.id);
    try {
      const {
        error
      } = await supabase.from("ai_prompts").update({
        system_prompt: prompt.system_prompt,
        user_prompt_template: prompt.user_prompt_template,
        description: prompt.description,
        is_active: prompt.is_active,
        clothing_types: prompt.clothing_types
      }).eq("id", prompt.id);
      if (error) throw error;
      toast({
        title: "Prompt updated",
        description: `Successfully updated ${prompt.feature_name} prompt`
      });
    } catch (error: any) {
      toast({
        title: "Error updating prompt",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(null);
    }
  };
  const handleCreate = async () => {
    if (!newPrompt.feature_name || !newPrompt.system_prompt) {
      toast({
        title: "Missing required fields",
        description: "Feature name and system prompt are required",
        variant: "destructive"
      });
      return;
    }
    try {
      const {
        error
      } = await supabase.from("ai_prompts").insert([newPrompt]);
      if (error) throw error;
      toast({
        title: "Prompt created",
        description: "Successfully created new AI prompt"
      });
      setIsDialogOpen(false);
      setNewPrompt({
        feature_name: "",
        system_prompt: "",
        user_prompt_template: "",
        description: "",
        is_active: true,
        clothing_types: []
      });
      loadPrompts();
    } catch (error: any) {
      toast({
        title: "Error creating prompt",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  const handleDelete = async (id: string, featureName: string) => {
    if (!confirm(`Are you sure you want to delete the prompt for ${featureName}?`)) {
      return;
    }
    try {
      const {
        error
      } = await supabase.from("ai_prompts").delete().eq("id", id);
      if (error) throw error;
      toast({
        title: "Prompt deleted",
        description: `Successfully deleted ${featureName} prompt`
      });
      loadPrompts();
    } catch (error: any) {
      toast({
        title: "Error deleting prompt",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  const updatePrompt = (id: string, field: keyof AIPrompt, value: any) => {
    setPrompts(prompts.map(p => p.id === id ? {
      ...p,
      [field]: value
    } : p));
  };
  if (loading) {
    return <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>;
  }
  return <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">AI Prompt Management</h2>
          <p className="text-muted-foreground">
            Configure AI prompts for each feature in Busana.AI
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add New Prompt
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New AI Prompt</DialogTitle>
              <DialogDescription>
                Add a new AI prompt configuration for a feature
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-feature-name">Feature Name</Label>
                <Input id="new-feature-name" value={newPrompt.feature_name} onChange={e => setNewPrompt({
                ...newPrompt,
                feature_name: e.target.value
              })} placeholder="e.g., virtual_tryon, model_generation" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-description">Description</Label>
                <Input id="new-description" value={newPrompt.description} onChange={e => setNewPrompt({
                ...newPrompt,
                description: e.target.value
              })} placeholder="Brief description of this prompt" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-system-prompt">System Prompt</Label>
                <Textarea id="new-system-prompt" value={newPrompt.system_prompt} onChange={e => setNewPrompt({
                ...newPrompt,
                system_prompt: e.target.value
              })} placeholder="Enter the system prompt..." className="min-h-[120px]" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-user-prompt-template">
                  User Prompt Template
                </Label>
                <Textarea id="new-user-prompt-template" value={newPrompt.user_prompt_template} onChange={e => setNewPrompt({
                ...newPrompt,
                user_prompt_template: e.target.value
              })} placeholder="Enter the user prompt template (optional)..." className="min-h-[80px]" />
              </div>

              <div className="space-y-2">
                <Label>Applicable Clothing Types</Label>
                <div className="grid grid-cols-2 gap-3">
                  {CLOTHING_TYPES.map(type => <div key={type.id} className="flex items-center space-x-2">
                      <Checkbox id={`new-type-${type.id}`} checked={newPrompt.clothing_types.includes(type.id)} onCheckedChange={checked => {
                    const updatedTypes = checked ? [...newPrompt.clothing_types, type.id] : newPrompt.clothing_types.filter(t => t !== type.id);
                    setNewPrompt({
                      ...newPrompt,
                      clothing_types: updatedTypes
                    });
                  }} />
                      <Label htmlFor={`new-type-${type.id}`} className="font-normal cursor-pointer">
                        {type.label}
                      </Label>
                    </div>)}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch id="new-is-active" checked={newPrompt.is_active} onCheckedChange={checked => setNewPrompt({
                ...newPrompt,
                is_active: checked
              })} />
                <Label htmlFor="new-is-active">Active</Label>
              </div>

              <Button onClick={handleCreate} className="w-full">
                Create Prompt
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        {prompts.map(prompt => <Card key={prompt.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl">{prompt.feature_name}</CardTitle>
                  <CardDescription>{prompt.description}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center space-x-2">
                    <Switch id={`active-${prompt.id}`} checked={prompt.is_active} onCheckedChange={checked => updatePrompt(prompt.id, "is_active", checked)} />
                    <Label htmlFor={`active-${prompt.id}`}>Active</Label>
                  </div>
                  <Button variant="destructive" size="icon" onClick={() => handleDelete(prompt.id, prompt.feature_name)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor={`system-${prompt.id}`}>System Prompt</Label>
                <Textarea id={`system-${prompt.id}`} value={prompt.system_prompt} onChange={e => updatePrompt(prompt.id, "system_prompt", e.target.value)} className="min-h-[120px]" />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`user-${prompt.id}`}>
                  User Prompt Template
                </Label>
                <Textarea id={`user-${prompt.id}`} value={prompt.user_prompt_template || ""} onChange={e => updatePrompt(prompt.id, "user_prompt_template", e.target.value)} placeholder="Optional user prompt template" className="min-h-[80px]" />
              </div>

              

              <Button onClick={() => handleSave(prompt)} disabled={saving === prompt.id}>
                {saving === prompt.id ? <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </> : <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>}
              </Button>
            </CardContent>
          </Card>)}
      </div>
    </div>;
};
export default AdminPromptManager;