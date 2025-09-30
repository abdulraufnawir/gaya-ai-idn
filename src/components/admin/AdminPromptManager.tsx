import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface AIPrompt {
  id: string;
  feature_name: string;
  system_prompt: string;
  user_prompt_template: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function AdminPromptManager() {
  const [prompts, setPrompts] = useState<AIPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [newPrompt, setNewPrompt] = useState({
    feature_name: "",
    system_prompt: "",
    user_prompt_template: "",
    description: "",
    is_active: true,
  });
  const [showNewDialog, setShowNewDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    try {
      const { data, error } = await supabase
        .from("ai_prompts")
        .select("*")
        .order("feature_name");

      if (error) throw error;
      setPrompts(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePrompt = async (promptId: string, updates: Partial<AIPrompt>) => {
    setSaving(promptId);
    try {
      const { error } = await supabase
        .from("ai_prompts")
        .update(updates)
        .eq("id", promptId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Prompt updated successfully",
      });

      loadPrompts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  };

  const handleCreatePrompt = async () => {
    if (!newPrompt.feature_name || !newPrompt.system_prompt) {
      toast({
        title: "Validation Error",
        description: "Feature name and system prompt are required",
        variant: "destructive",
      });
      return;
    }

    setSaving("new");
    try {
      const { error } = await supabase.from("ai_prompts").insert([newPrompt]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "New prompt created successfully",
      });

      setShowNewDialog(false);
      setNewPrompt({
        feature_name: "",
        system_prompt: "",
        user_prompt_template: "",
        description: "",
        is_active: true,
      });
      loadPrompts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">AI Prompt Management</h2>
          <p className="text-muted-foreground">
            Configure system prompts for AI features in Busana.ai
          </p>
        </div>
        <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add New Prompt
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New AI Prompt</DialogTitle>
              <DialogDescription>
                Add a new AI prompt configuration for a feature
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-feature-name">Feature Name *</Label>
                <Input
                  id="new-feature-name"
                  value={newPrompt.feature_name}
                  onChange={(e) =>
                    setNewPrompt({ ...newPrompt, feature_name: e.target.value })
                  }
                  placeholder="e.g., virtual_tryon"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-description">Description</Label>
                <Input
                  id="new-description"
                  value={newPrompt.description}
                  onChange={(e) =>
                    setNewPrompt({ ...newPrompt, description: e.target.value })
                  }
                  placeholder="Brief description of this feature"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-system-prompt">System Prompt *</Label>
                <Textarea
                  id="new-system-prompt"
                  value={newPrompt.system_prompt}
                  onChange={(e) =>
                    setNewPrompt({ ...newPrompt, system_prompt: e.target.value })
                  }
                  placeholder="Enter the system prompt for the AI"
                  rows={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-user-template">User Prompt Template</Label>
                <Textarea
                  id="new-user-template"
                  value={newPrompt.user_prompt_template}
                  onChange={(e) =>
                    setNewPrompt({ ...newPrompt, user_prompt_template: e.target.value })
                  }
                  placeholder="Optional template for user prompts (use {variable} for dynamic values)"
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="new-active"
                  checked={newPrompt.is_active}
                  onCheckedChange={(checked) =>
                    setNewPrompt({ ...newPrompt, is_active: checked })
                  }
                />
                <Label htmlFor="new-active">Active</Label>
              </div>

              <Button
                onClick={handleCreatePrompt}
                disabled={saving === "new"}
                className="w-full"
              >
                {saving === "new" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Prompt
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        {prompts.map((prompt) => (
          <Card key={prompt.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl">{prompt.feature_name}</CardTitle>
                  <CardDescription>{prompt.description}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={prompt.is_active}
                    onCheckedChange={(checked) =>
                      handleUpdatePrompt(prompt.id, { is_active: checked })
                    }
                  />
                  <Label className="text-sm">Active</Label>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor={`system-${prompt.id}`}>System Prompt</Label>
                <Textarea
                  id={`system-${prompt.id}`}
                  defaultValue={prompt.system_prompt}
                  onBlur={(e) =>
                    handleUpdatePrompt(prompt.id, { system_prompt: e.target.value })
                  }
                  rows={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`user-${prompt.id}`}>User Prompt Template</Label>
                <Textarea
                  id={`user-${prompt.id}`}
                  defaultValue={prompt.user_prompt_template || ""}
                  onBlur={(e) =>
                    handleUpdatePrompt(prompt.id, {
                      user_prompt_template: e.target.value || null,
                    })
                  }
                  placeholder="Optional template (use {variable} for dynamic values)"
                  rows={3}
                />
              </div>

              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span>Last updated: {new Date(prompt.updated_at).toLocaleString()}</span>
                {saving === prompt.id && (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Saving...</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {prompts.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No prompts configured yet</p>
            <Button onClick={() => setShowNewDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Prompt
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
