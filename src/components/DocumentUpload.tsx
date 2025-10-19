import { useState } from "react";
import { Upload, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface DocumentUploadProps {
  onUploadComplete: () => void;
}

export const DocumentUpload = ({ onUploadComplete }: DocumentUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  const processDocument = async (file: File) => {
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("process-document", {
        body: formData,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Document processed successfully",
      });

      onUploadComplete();
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process document",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type === "application/pdf" || 
          file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        processDocument(file);
      } else {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF or DOCX file",
          variant: "destructive",
        });
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      if (file.type === "application/pdf" || 
          file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        processDocument(file);
      } else {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF or DOCX file",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <Card
      className={`border-2 border-dashed transition-all duration-300 ${
        isDragging 
          ? "border-primary bg-primary/5 shadow-glow" 
          : "border-border hover:border-primary/50"
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <div className="p-12 text-center">
        {isUploading ? (
          <div className="space-y-4">
            <Loader2 className="w-16 h-16 mx-auto text-primary animate-spin" />
            <p className="text-muted-foreground">Processing your document...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-glow">
              {isDragging ? (
                <Upload className="w-10 h-10 text-white animate-bounce" />
              ) : (
                <FileText className="w-10 h-10 text-white" />
              )}
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Upload Document</h3>
              <p className="text-muted-foreground mb-4">
                Drag and drop or click to upload
              </p>
              <p className="text-sm text-muted-foreground">
                Supports PDF and DOCX files
              </p>
            </div>
            <label htmlFor="file-upload">
              <Button asChild className="bg-gradient-to-r from-primary to-secondary hover:opacity-90">
                <span>
                  <Upload className="w-4 h-4 mr-2" />
                  Choose File
                </span>
              </Button>
              <input
                id="file-upload"
                type="file"
                className="hidden"
                accept=".pdf,.docx"
                onChange={handleFileSelect}
                disabled={isUploading}
              />
            </label>
          </div>
        )}
      </div>
    </Card>
  );
};
