
import { useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Upload, FolderOpen, FileCheck2, Inbox } from "lucide-react";

export const ReceiptProcessor = () => {
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState<{
    processed: number;
    total: number;
  } | null>(null);
  const { toast } = useToast();
  const [folderSelected, setFolderSelected] = useState(false);

  const handleFolderSelect = async () => {
    try {
      const response = await fetch("http://localhost:5003/select-folder", {
        method: "POST",
      });

      if (!response.ok) throw new Error("Folder selection failed");

      const data = await response.json();
      if (data.success) {
        setFolderSelected(true);
        toast({
          title: "Folder Selected",
          description: "Receipt folder has been selected successfully.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to select folder. Please try again.",
      });
    }
  };

  const handleProcess = async () => {
    try {
      setProcessing(true);
      setProgress(0);
      setSummary(null);

      const response = await fetch("http://localhost:5003/process", {
        method: "POST",
      });

      if (!response.ok) throw new Error("Processing failed");

      // Set up event source for progress updates
      const eventSource = new EventSource("http://localhost:5003/progress");
      
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        setProgress(data.progress);
        
        if (data.progress === 100) {
          eventSource.close();
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
      };

      const data = await response.json();
      setSummary({
        processed: data.processed || 0,
        total: data.total || 0,
      });

      toast({
        title: "Processing Complete",
        description: `Successfully processed ${data.processed} receipts.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to process receipts. Please try again.",
      });
    } finally {
      setProcessing(false);
    }
  };

  const openOutputFolder = () => {
    // This will be replaced with the actual path later
    const outputPath = "/Volumes/Local/New_Documents/Recipt_Reader_Project/data/output";
    
    try {
      window.open(`file://${outputPath}`, '_blank');
      toast({
        title: "Opening Output Folder",
        description: "The output folder should open in your file explorer.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to open output folder. Please check the path.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 p-8 animate-fade-in">
      <Card className="max-w-2xl mx-auto backdrop-blur-sm bg-white/80 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-medium text-neutral-800 flex items-center gap-2">
            <FileCheck2 className="w-6 h-6" />
            Receipt Processor
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Button
              onClick={handleFolderSelect}
              disabled={processing}
              variant="outline"
              className="w-full h-12 text-lg font-medium border-2 border-dashed"
            >
              <span className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5" />
                Select Receipt Folder
              </span>
            </Button>

            <Button
              onClick={handleProcess}
              disabled={processing || !folderSelected}
              className="w-full h-12 text-lg font-medium bg-neutral-800 hover:bg-neutral-900 transition-colors"
            >
              {processing ? (
                <span className="flex items-center gap-2">
                  <Upload className="w-5 h-5 animate-spin" />
                  Processing... {progress}%
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Process Receipts
                </span>
              )}
            </Button>

            {processing && (
              <div className="space-y-2 animate-fade-in">
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-center text-neutral-600">
                  Processing receipts... {progress}%
                </p>
              </div>
            )}

            {summary && (
              <div className="rounded-lg bg-neutral-100 p-4 space-y-4 animate-fade-in">
                <h3 className="font-medium text-neutral-800">Summary</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-semibold text-neutral-800">
                      {summary.processed}
                    </p>
                    <p className="text-sm text-neutral-600">Processed</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-semibold text-neutral-800">
                      {summary.total}
                    </p>
                    <p className="text-sm text-neutral-600">Total Files</p>
                  </div>
                </div>
                <Button
                  onClick={openOutputFolder}
                  variant="outline"
                  className="w-full"
                >
                  <span className="flex items-center gap-2">
                    <Inbox className="w-5 h-5" />
                    Open Output Folder
                  </span>
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
