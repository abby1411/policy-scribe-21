import { useState } from "react";
import { Send, Loader2, CheckCircle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface QueryInterfaceProps {
  documentId: string;
}

interface QueryResult {
  answer: string;
  evidence: string[];
  confidence_score: number;
  reasoning: string;
}

export const QueryInterface = ({ documentId }: QueryInterfaceProps) => {
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setIsLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("analyze-document", {
        body: { documentId, question },
      });

      if (error) throw error;

      setResult(data);
      setQuestion("");
    } catch (error) {
      console.error("Query error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to analyze document",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getConfidenceVariant = (score: number): "default" | "secondary" | "destructive" => {
    if (score >= 80) return "default";
    if (score >= 60) return "secondary";
    return "destructive";
  };

  return (
    <div className="space-y-6">
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            Ask Questions About Your Document
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g., Does this policy cover knee surgery?"
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={isLoading || !question.trim()}
              className="bg-gradient-to-r from-primary to-secondary hover:opacity-90"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {result && (
        <Card className="border-border/50 shadow-elegant animate-fade-in">
          <CardContent className="pt-6 space-y-6">
            {/* Answer Section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-lg">Answer</h3>
              </div>
              <p className="text-foreground leading-relaxed">{result.answer}</p>
            </div>

            {/* Confidence Score */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Confidence Score</span>
                <Badge variant={getConfidenceVariant(result.confidence_score)}>
                  {result.confidence_score}%
                </Badge>
              </div>
              <Progress value={result.confidence_score} className="h-2" />
            </div>

            {/* Evidence */}
            {result.evidence && result.evidence.length > 0 && (
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Supporting Evidence
                </h4>
                <div className="space-y-2">
                  {result.evidence.map((evidence, idx) => (
                    <Card key={idx} className="bg-muted/30 border-primary/20">
                      <CardContent className="p-4">
                        <p className="text-sm italic text-muted-foreground">"{evidence}"</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Reasoning */}
            {result.reasoning && (
              <div>
                <h4 className="font-semibold mb-2">Reasoning</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {result.reasoning}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
