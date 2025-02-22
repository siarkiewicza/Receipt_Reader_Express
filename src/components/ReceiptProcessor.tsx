
import { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Upload, FolderOpen, FileCheck2, Download, List } from "lucide-react";

interface Receipt {
  id: string;
  filename: string;
  status: 'pending' | 'processed';
  date?: string;
}

export const ReceiptProcessor = () => {
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [summary, setSummary] = useState<{
    processed: number;
    total: number;
  } | null>(null);
  const { toast } = useToast();
  const [folderSelected, setFolderSelected] = useState(false);
  const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:5003';

  // Fetch receipts on component mount
  useEffect(() => {
    fetchReceipts();
  }, []);

  const fetchReceipts = async () => {
    try {
      console.log('Fetching receipts from:', `${baseUrl}/api/receipts`);
      const response = await fetch(`${baseUrl}/api/receipts`);
      
      if (!response.ok) throw new Error("Failed to fetch receipts");
      
      const data = await response.json();
      console.log('Receipts data:', data);
      setReceipts(data);
    } catch (error) {
      console.error('Error fetching receipts:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch receipts list.",
      });
    }
  };

  const handleFolderSelect = async () => {
    try {
      console.log('Making request to:', `${baseUrl}/select-folder`);
      const response = await fetch(`${baseUrl}/select-folder`, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('Response:', response);
      if (!response.ok) throw new Error("Folder selection failed");

      const data = await response.json();
      console.log('Response data:', data);
      
      if (data.success) {
        setFolderSelected(true);
        // Upload files after folder selection
        await handleUpload();
        toast({
          title: "Folder Selected",
          description: "Receipt folder has been selected successfully.",
        });
      }
    } catch (error) {
      console.error('Error in handleFolderSelect:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to select folder. Please try again.",
      });
    }
  };

  const handleUpload = async () => {
    try {
      console.log('Uploading files to:', `${baseUrl}/upload`);
      const response = await fetch(`${baseUrl}/upload`, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error("Upload failed");

      const data = await response.json();
      console.log('Upload response:', data);
      
      // Refresh receipts list after upload
      await fetchReceipts();
      
      toast({
        title: "Upload Complete",
        description: "Files have been uploaded successfully.",
      });
    } catch (error) {
      console.error('Error uploading files:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to upload files. Please try again.",
      });
    }
  };

  const handleProcess = async () => {
    try {
      setProcessing(true);
      setProgress(0);
      setSummary(null);

      console.log('Making process request to:', `${baseUrl}/process`);
      const response = await fetch(`${baseUrl}/process`, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error("Processing failed");

      console.log('Setting up EventSource at:', `${baseUrl}/progress`);
      const eventSource = new EventSource(`${baseUrl}/progress`);
      
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('Progress update:', data);
        setProgress(data.progress);
        
        if (data.progress === 100) {
          eventSource.close();
          fetchReceipts(); // Refresh receipts list after processing
        }
      };

      eventSource.onerror = (error) => {
        console.error('EventSource error:', error);
        eventSource.close();
      };

      const data = await response.json();
      console.log('Process response data:', data);
      setSummary({
        processed: data.processed || 0,
        total: data.total || 0,
      });

      toast({
        title: "Processing Complete",
        description: `Successfully processed ${data.processed} receipts.`,
      });
    } catch (error) {
      console.error('Error in handleProcess:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to process receipts. Please try again.",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = async () => {
    try {
      console.log('Downloading from:', `${baseUrl}/download`);
      const response = await fetch(`${baseUrl}/download`);
      
      if (!response.ok) throw new Error("Download failed");
      
      // Create a blob from the response
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary link and trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = 'processed_receipts.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Download Started",
        description: "Your processed receipts file is being downloaded.",
      });
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to download processed receipts.",
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

            {receipts.length > 0 && (
              <div className="rounded-lg bg-neutral-100 p-4 space-y-4 animate-fade-in">
                <h3 className="font-medium text-neutral-800 flex items-center gap-2">
                  <List className="w-4 h-4" />
                  Receipts List
                </h3>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {receipts.map((receipt) => (
                    <div
                      key={receipt.id}
                      className="bg-white p-3 rounded-md flex justify-between items-center"
                    >
                      <span className="text-sm">{receipt.filename}</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        receipt.status === 'processed' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {receipt.status}
                      </span>
                    </div>
                  ))}
                </div>
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
                  onClick={handleDownload}
                  variant="outline"
                  className="w-full"
                >
                  <span className="flex items-center gap-2">
                    <Download className="w-5 h-5" />
                    Download Processed Receipts
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
