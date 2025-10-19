import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, LogOut, Plus, Trash2 } from "lucide-react";
import { DocumentUpload } from "@/components/DocumentUpload";
import { QueryInterface } from "@/components/QueryInterface";
import { useToast } from "@/hooks/use-toast";

interface Document {
  id: string;
  title: string;
  file_name: string;
  created_at: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    checkAuth();
    loadDocuments();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const loadDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from("documents")
        .select("id, title, file_name, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
      
      if (data && data.length > 0 && !selectedDoc) {
        setSelectedDoc(data[0].id);
      }
    } catch (error) {
      console.error("Error loading documents:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("documents")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Document deleted",
        description: "The document has been removed",
      });

      if (selectedDoc === id) {
        setSelectedDoc(null);
      }
      loadDocuments();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete document",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-glow">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              DocuMind AI
            </h1>
          </div>
          <Button
            variant="outline"
            onClick={handleSignOut}
            className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-[320px_1fr] gap-6">
          {/* Sidebar */}
          <div className="space-y-4">
            <Button
              onClick={() => setShowUpload(true)}
              className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Upload New Document
            </Button>

            <Card className="border-border/50">
              <CardContent className="p-4 space-y-2">
                <h2 className="font-semibold mb-3">Your Documents</h2>
                {isLoading ? (
                  <p className="text-sm text-muted-foreground">Loading...</p>
                ) : documents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No documents yet</p>
                ) : (
                  documents.map((doc) => (
                    <div
                      key={doc.id}
                      className={`p-3 rounded-lg cursor-pointer transition-all group ${
                        selectedDoc === doc.id
                          ? "bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20"
                          : "hover:bg-muted/50"
                      }`}
                      onClick={() => setSelectedDoc(doc.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{doc.title}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {doc.file_name}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(doc.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div>
            {showUpload ? (
              <div className="space-y-4">
                <Button
                  variant="outline"
                  onClick={() => setShowUpload(false)}
                >
                  ← Back to Analysis
                </Button>
                <DocumentUpload
                  onUploadComplete={() => {
                    loadDocuments();
                    setShowUpload(false);
                  }}
                />
              </div>
            ) : selectedDoc ? (
              <QueryInterface documentId={selectedDoc} />
            ) : (
              <Card className="border-border/50">
                <CardContent className="p-12 text-center">
                  <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-glow mb-4">
                    <FileText className="w-10 h-10 text-white" />
                  </div>
                  <h2 className="text-2xl font-semibold mb-2">No Document Selected</h2>
                  <p className="text-muted-foreground mb-6">
                    Upload a document or select one from the sidebar to begin analysis
                  </p>
                  <Button
                    onClick={() => setShowUpload(true)}
                    className="bg-gradient-to-r from-primary to-secondary hover:opacity-90"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Upload Document
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
