import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Sparkles, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface GeminiProcessorProps {
  userId: string;
}

const GeminiProcessor: React.FC<GeminiProcessorProps> = ({ userId }) => {
  const { toast } = useToast();
  const [modelImage, setModelImage] = useState<File | null>(null);
  const [modelImagePreview, setModelImagePreview] = useState<string>('');
  const [garmentImage, setGarmentImage] = useState<File | null>(null);
  const [garmentImagePreview, setGarmentImagePreview] = useState<string>('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [processType, setProcessType] = useState<'analyze' | 'generate' | 'process'>('process');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleModelImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setModelImage(file);
      const previewUrl = URL.createObjectURL(file);
      setModelImagePreview(previewUrl);
    }
  };

  const handleGarmentImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setGarmentImage(file);
      const previewUrl = URL.createObjectURL(file);
      setGarmentImagePreview(previewUrl);
    }
  };

  const uploadImage = async (file: File, type: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${type}_${Date.now()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('tryon-images')
      .upload(fileName, file);

    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage
      .from('tryon-images')
      .getPublicUrl(fileName);
    
    return publicUrl;
  };

  const handleProcess = async () => {
    if (!modelImage && processType !== 'generate') {
      toast({
        title: "Image Required",
        description: "Please upload a model image",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      let modelImageUrl = '';
      let garmentImageUrl = '';

      // Upload images if provided
      if (modelImage) {
        modelImageUrl = await uploadImage(modelImage, 'model');
      }
      if (garmentImage) {
        garmentImageUrl = await uploadImage(garmentImage, 'garment');
      }

      // Create project record
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          title: `Gemini ${processType} - ${new Date().toLocaleString()}`,
          description: customPrompt || `AI-powered ${processType} using Gemini 2.5`,
          project_type: `gemini_${processType}`,
          status: 'processing',
          original_image_url: modelImageUrl,
          metadata: {
            process_type: processType,
            model_image_url: modelImageUrl,
            garment_image_url: garmentImageUrl,
            custom_prompt: customPrompt,
          }
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Call Gemini API
      const { data: result, error: apiError } = await supabase.functions.invoke('gemini-api', {
        body: {
          action: processType,
          modelImage: modelImageUrl,
          garmentImage: garmentImageUrl,
          prompt: customPrompt,
          projectId: project.id
        }
      });

      if (apiError) throw apiError;

      console.log('Gemini API result:', result);

      // Update project with results
      const { error: updateError } = await supabase
        .from('projects')
        .update({
          status: 'completed',
          result_url: result.result,
          metadata: {
            process_type: processType,
            model_image_url: modelImageUrl,
            garment_image_url: garmentImageUrl,
            custom_prompt: customPrompt,
            gemini_result: result.result,
            analysis: result.analysis,
            usage: result.usage,
            completed_at: new Date().toISOString()
          }
        })
        .eq('id', project.id);

      if (updateError) throw updateError;

      toast({
        title: "Processing Complete!",
        description: `Gemini ${processType} completed successfully`,
      });

      // Reset form
      setModelImage(null);
      setModelImagePreview('');
      setGarmentImage(null);
      setGarmentImagePreview('');
      setCustomPrompt('');

    } catch (error) {
      console.error('Error processing with Gemini:', error);
      toast({
        title: "Processing Failed",
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center gap-2 justify-center">
          <Sparkles className="h-6 w-6 text-primary" />
          Gemini 2.5 AI Processor
        </CardTitle>
        <CardDescription>
          Analyze, generate, or process fashion images using Google's Gemini 2.5 AI
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Process Type Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Processing Type</label>
          <Select value={processType} onValueChange={(value: any) => setProcessType(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select processing type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="analyze">Analyze Image</SelectItem>
              <SelectItem value="process">Process Images</SelectItem>
              <SelectItem value="generate">Generate Content</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Custom Prompt */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Custom Prompt (Optional)</label>
          <Textarea
            placeholder="Describe what you want Gemini to do with the images..."
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            rows={3}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Model Image Upload */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Model Image
            </h3>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-primary transition-colors">
              {modelImagePreview ? (
                <div className="space-y-4">
                  <img
                    src={modelImagePreview}
                    alt="Model preview"
                    className="max-w-full h-40 object-contain mx-auto rounded"
                  />
                  <Button
                    variant="outline"
                    onClick={() => setModelImagePreview('')}
                  >
                    Change Image
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">PNG, JPG up to 10MB</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleModelImageChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Garment Image Upload */}
          {processType !== 'analyze' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Garment Image (Optional)
              </h3>
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-primary transition-colors">
                {garmentImagePreview ? (
                  <div className="space-y-4">
                    <img
                      src={garmentImagePreview}
                      alt="Garment preview"
                      className="max-w-full h-40 object-contain mx-auto rounded"
                    />
                    <Button
                      variant="outline"
                      onClick={() => setGarmentImagePreview('')}
                    >
                      Change Image
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">PNG, JPG up to 10MB</p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleGarmentImageChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Process Button */}
        <Button
          onClick={handleProcess}
          disabled={isProcessing || (!modelImage && processType !== 'generate')}
          className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white font-semibold py-3"
          size="lg"
        >
          {isProcessing ? (
            <>
              <Sparkles className="animate-spin h-5 w-5 mr-2" />
              Processing with Gemini...
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5 mr-2" />
              Process with Gemini 2.5
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default GeminiProcessor;