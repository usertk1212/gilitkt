import { useState, useRef, useMemo } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Progress } from "./ui/progress";
import { Alert, AlertDescription } from "./ui/alert";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "./ui/table";
import { FileText, Upload, CheckCircle, AlertCircle, Database, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Eye } from "lucide-react";
import { parseCSV, ParsedAsset } from "../utils/csvParser";
import { bulkCreateAssets } from "../utils/appwriteApi";
import { toast } from "sonner";

const VIEW_PAGE_SIZE = 100;

export function CsvViewer() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedAssets, setParsedAssets] = useState<ParsedAsset[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [viewPage, setViewPage] = useState(1);
  const [jumpToPageInput, setJumpToPageInput] = useState("");

  // Kept as raw text (not number) so the field can be cleared and retyped
  // freely — coercing to a number on every keystroke made it snap back to 1
  // the instant the digit was deleted.
  const [fromRowInput, setFromRowInput] = useState("1");
  const [toRowInput, setToRowInput] = useState("");

  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState<"idle" | "success" | "error">("idle");
  const [importMessage, setImportMessage] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const total = parsedAssets.length;
  const totalViewPages = Math.max(1, Math.ceil(total / VIEW_PAGE_SIZE));
  const viewStart = (viewPage - 1) * VIEW_PAGE_SIZE;
  const viewRows = useMemo(
    () => parsedAssets.slice(viewStart, viewStart + VIEW_PAGE_SIZE),
    [parsedAssets, viewStart]
  );

  const handleFile = async (file: File) => {
    if (!file.name.endsWith(".csv")) {
      setParseErrors(["Please select a CSV file"]);
      return;
    }

    setSelectedFile(file);
    setImportStatus("idle");
    setImportMessage("");

    const content = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });

    const { assets, errors } = parseCSV(content);
    setParsedAssets(assets);
    setParseErrors(errors);
    setViewPage(1);
    setFromRowInput(assets.length > 0 ? "1" : "");
    setToRowInput(assets.length > 0 ? String(Math.min(assets.length, VIEW_PAGE_SIZE)) : "");
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const goToPage = (page: number) => {
    const clamped = Math.max(1, Math.min(totalViewPages, page));
    setViewPage(clamped);
  };

  const handleJumpToPage = () => {
    const parsed = parseInt(jumpToPageInput, 10);
    if (!isNaN(parsed)) {
      goToPage(parsed);
    }
    setJumpToPageInput("");
  };

  // Parse the raw text inputs — no cap on range size, any size can be imported.
  const fromRowNum = parseInt(fromRowInput, 10);
  const toRowNum = parseInt(toRowInput, 10);
  const hasValidFrom = !isNaN(fromRowNum) && fromRowNum > 0;
  const hasValidTo = !isNaN(toRowNum) && toRowNum > 0;

  const clampedFrom = hasValidFrom ? Math.max(1, Math.min(fromRowNum, total || 1)) : NaN;
  const clampedTo = hasValidTo
    ? Math.max(hasValidFrom ? clampedFrom : 1, Math.min(toRowNum, total || 1))
    : NaN;
  const selectedCount =
    total > 0 && hasValidFrom && hasValidTo && clampedTo >= clampedFrom
      ? clampedTo - clampedFrom + 1
      : 0;

  const handleImportSelected = async () => {
    if (total === 0) return;

    if (selectedCount === 0) {
      toast.error("Rentang baris gak valid", {
        description: "Isi 'dari baris' dan 'sampai baris' dengan angka yang valid dulu (gak boleh 0 atau kosong)."
      });
      return;
    }

    const slice = parsedAssets.slice(clampedFrom - 1, clampedTo);

    setIsImporting(true);
    setImportProgress(0);
    setImportStatus("idle");

    try {
      const response = await bulkCreateAssets(slice, (done, doneTotal) => {
        setImportProgress(doneTotal > 0 ? Math.round((done / doneTotal) * 100) : 100);
      });

      if (!response.success) {
        throw new Error(response.error || "Failed to import selected rows");
      }

      const createdCount = response.data?.length || 0;
      setImportStatus("success");
      setImportMessage(
        `Berhasil import ${createdCount} asset baru dari baris ${clampedFrom}-${clampedTo} (${selectedCount} baris dipilih${
          selectedCount !== createdCount ? `, sisanya sudah ada di database dan di-skip` : ""
        }).`
      );
    } catch (error) {
      setImportStatus("error");
      setImportMessage(error instanceof Error ? error.message : "Gagal import baris yang dipilih");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="flex-1 p-6 max-w-4xl mx-auto space-y-6">
      {/* File Picker */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            CSV Viewer & Import
          </CardTitle>
          <CardDescription>
            Buka file CSV dari komputer kamu buat di-review dulu isinya, baru pilih baris ke berapa
            sampai ke berapa yang mau di-import — gak perlu proses semua ribuan baris sekaligus tiap kali.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer border-muted-foreground/25 hover:border-muted-foreground/50 transition-all"
            onClick={() => fileInputRef.current?.click()}
          >
            <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
            {selectedFile ? (
              <p className="font-medium text-green-700 dark:text-green-400">{selectedFile.name}</p>
            ) : (
              <p className="font-medium">Klik untuk pilih file CSV dari komputer</p>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileInputChange}
            className="hidden"
          />

          {parseErrors.length > 0 && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="whitespace-pre-line">{parseErrors[0]}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Preview + Row Range Selection */}
      {total > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Review Data ({total} baris total)</CardTitle>
              <CardDescription>
                Halaman {viewPage} dari {totalViewPages} — nampilin {VIEW_PAGE_SIZE} baris per halaman
                cuma buat preview, gak ngaruh ke baris yang mau di-import.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="border rounded-lg overflow-auto max-h-[420px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Baris</TableHead>
                      <TableHead>nama_file</TableHead>
                      <TableHead>asset_name</TableHead>
                      <TableHead>type</TableHead>
                      <TableHead>url_lightroom</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewRows.map((row, i) => (
                      <TableRow key={viewStart + i}>
                        <TableCell className="text-muted-foreground">{viewStart + i + 1}</TableCell>
                        <TableCell className="max-w-[220px] truncate">{row.nama_file}</TableCell>
                        <TableCell className="max-w-[180px] truncate">{row.asset_name}</TableCell>
                        <TableCell>{row.type}</TableCell>
                        <TableCell className="max-w-[260px] truncate text-xs text-muted-foreground">
                          {row.url_lightroom}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(1)}
                    disabled={viewPage <= 1}
                    title="Halaman pertama"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(viewPage - 1)}
                    disabled={viewPage <= 1}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Sebelumnya
                  </Button>
                </div>

                <span className="text-sm text-muted-foreground">
                  Halaman {viewPage} / {totalViewPages}
                </span>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(viewPage + 1)}
                    disabled={viewPage >= totalViewPages}
                  >
                    Berikutnya
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(totalViewPages)}
                    disabled={viewPage >= totalViewPages}
                    title="Halaman terakhir"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2 justify-end">
                <label className="text-sm text-muted-foreground whitespace-nowrap">Lompat ke halaman</label>
                <Input
                  type="number"
                  min={1}
                  max={totalViewPages}
                  placeholder={`1-${totalViewPages}`}
                  value={jumpToPageInput}
                  onChange={(e) => setJumpToPageInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleJumpToPage()}
                  className="w-24 h-9"
                />
                <Button variant="outline" size="sm" onClick={handleJumpToPage}>
                  Ke Halaman
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Pilih Baris untuk Di-import
              </CardTitle>
              <CardDescription>
                Masukin dari baris ke berapa sampai ke berapa (1 sampai {total}) yang mau kamu import sekarang.
                Gak ada batas jumlah baris — bisa import sebanyak apapun sekaligus.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="text-sm text-muted-foreground mb-1 block">Dari baris</label>
                  <Input
                    type="number"
                    min={1}
                    max={total}
                    value={fromRowInput}
                    onChange={(e) => setFromRowInput(e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-sm text-muted-foreground mb-1 block">Sampai baris</label>
                  <Input
                    type="number"
                    min={1}
                    max={total}
                    value={toRowInput}
                    onChange={(e) => setToRowInput(e.target.value)}
                  />
                </div>
              </div>

              <p className="text-sm">
                {selectedCount > 0 ? (
                  <>
                    <strong>{selectedCount}</strong> baris dipilih (baris {clampedFrom}-{clampedTo}).
                  </>
                ) : (
                  <span className="text-muted-foreground">Isi rentang baris yang valid dulu (gak boleh 0 atau kosong).</span>
                )}
              </p>

              {!isImporting && importStatus !== "success" && (
                <Button className="w-full" size="lg" onClick={handleImportSelected} disabled={total === 0}>
                  <Upload className="w-4 h-4 mr-2" />
                  {selectedCount > 0 ? `Import ${selectedCount} Baris Terpilih` : "Import Baris Terpilih"}
                </Button>
              )}

              {isImporting && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Mengimpor ke Database: Appwrite...</span>
                    <span>{importProgress}%</span>
                  </div>
                  <Progress value={importProgress} />
                </div>
              )}

              {importStatus === "success" && (
                <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700 dark:text-green-400 space-y-2">
                    <p>{importMessage}</p>
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => {
                        setImportStatus("idle");
                        setImportMessage("");
                      }}
                    >
                      Pilih Baris Lain / Import Lagi
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {importStatus === "error" && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-medium">Import gagal</p>
                    <p className="text-sm">{importMessage}</p>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
