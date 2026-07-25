import { useState, useRef, useMemo } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Progress } from "./ui/progress";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import { Alert, AlertDescription } from "./ui/alert";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "./ui/table";
import {
  FileText, Upload, CheckCircle, AlertCircle, Database, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, Eye, ArrowUp, ArrowDown, Search, Copy, RefreshCw,
} from "./icons";
import { parseCSV, ParsedAsset } from "../utils/csvParser";
import { bulkCreateAssets, getExistingFilenames } from "../utils/appwriteApi";
import { copyWithFeedback } from "../utils/clipboard";
import { toast } from "sonner";

const VIEW_PAGE_SIZE = 100;

type RowStatus = "new" | "existing" | "unknown";
type SelectionMode = "new" | "manual" | "range";
type StatusFilter = "all" | "new" | "existing";

/**
 * Collapse a sorted list of row numbers into readable ranges.
 * [1,2,3,7,9,10] -> "1-3, 7, 9-10"
 * Makes "which rows are missing?" answerable at a glance instead of as a wall
 * of 300 comma-separated numbers.
 */
function formatRowRanges(nums: number[], maxParts = 40): string {
  if (nums.length === 0) return "-";
  const parts: string[] = [];
  let start = nums[0];
  let prev = nums[0];
  for (let i = 1; i <= nums.length; i++) {
    const n = nums[i];
    if (n === prev + 1) {
      prev = n;
      continue;
    }
    parts.push(start === prev ? `${start}` : `${start}-${prev}`);
    start = n;
    prev = n;
  }
  if (parts.length <= maxParts) return parts.join(", ");
  return `${parts.slice(0, maxParts).join(", ")} … (+${parts.length - maxParts} grup lagi)`;
}

export function CsvViewer() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedAssets, setParsedAssets] = useState<ParsedAsset[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [viewPage, setViewPage] = useState(1);
  const [jumpToPageInput, setJumpToPageInput] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // --- Database checker ---
  // null = not checked yet. A Set (even an empty one) = we have a real answer.
  const [existingFilenames, setExistingFilenames] = useState<Set<string> | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [checkedCount, setCheckedCount] = useState(0);

  // --- Selection ---
  const [selectionMode, setSelectionMode] = useState<SelectionMode>("range");
  const [manualSelected, setManualSelected] = useState<Set<number>>(new Set());
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Range inputs stay as raw text so they can be cleared and retyped freely.
  const [fromRowInput, setFromRowInput] = useState("1");
  const [toRowInput, setToRowInput] = useState("");

  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState<"idle" | "success" | "error">("idle");
  const [importMessage, setImportMessage] = useState("");
  const [updateExistingType, setUpdateExistingType] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const total = parsedAssets.length;

  const rowStatus = (rowNo: number): RowStatus => {
    if (!existingFilenames) return "unknown";
    const name = parsedAssets[rowNo - 1]?.nama_file?.trim();
    if (!name) return "unknown";
    return existingFilenames.has(name) ? "existing" : "new";
  };

  const newRowNos = useMemo(() => {
    if (!existingFilenames) return [];
    const out: number[] = [];
    parsedAssets.forEach((row, i) => {
      const name = row.nama_file?.trim();
      if (name && !existingFilenames.has(name)) out.push(i + 1);
    });
    return out;
  }, [parsedAssets, existingFilenames]);

  const existingRowNos = useMemo(() => {
    if (!existingFilenames) return [];
    const out: number[] = [];
    parsedAssets.forEach((row, i) => {
      const name = row.nama_file?.trim();
      if (name && existingFilenames.has(name)) out.push(i + 1);
    });
    return out;
  }, [parsedAssets, existingFilenames]);

  // Rows tagged with their permanent CSV row number BEFORE sorting/filtering, so
  // the displayed number always matches what gets imported.
  const numberedRows = useMemo(
    () => parsedAssets.map((row, idx) => ({ row, rowNo: idx + 1 })),
    [parsedAssets]
  );

  const visibleRows = useMemo(() => {
    let rows = numberedRows;
    if (existingFilenames && statusFilter !== "all") {
      const wanted = statusFilter === "new" ? "new" : "existing";
      rows = rows.filter(({ rowNo }) => rowStatus(rowNo) === wanted);
    }
    return sortDir === "asc" ? rows : [...rows].reverse();
  }, [numberedRows, sortDir, statusFilter, existingFilenames]);

  const totalViewPages = Math.max(1, Math.ceil(visibleRows.length / VIEW_PAGE_SIZE));
  const safeViewPage = Math.min(viewPage, totalViewPages);
  const viewStart = (safeViewPage - 1) * VIEW_PAGE_SIZE;
  const pageRows = useMemo(
    () => visibleRows.slice(viewStart, viewStart + VIEW_PAGE_SIZE),
    [visibleRows, viewStart]
  );

  const toggleSortDir = () => {
    setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    setViewPage(1);
  };

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
    // A new file invalidates any previous check — stale statuses would be worse
    // than no statuses.
    setExistingFilenames(null);
    setManualSelected(new Set());
    setStatusFilter("all");
    setSelectionMode("range");
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleCheckDatabase = async () => {
    setIsChecking(true);
    setCheckedCount(0);
    try {
      const res = await getExistingFilenames((n) => setCheckedCount(n));
      if (!res.success || !res.data) throw new Error(res.error || "Gagal baca database");
      setExistingFilenames(res.data);
      setViewPage(1);

      const newCount = parsedAssets.filter((r) => {
        const n = r.nama_file?.trim();
        return n && !res.data!.has(n);
      }).length;

      // Once we know exactly what's missing, picking rows by hand is busywork —
      // so jump straight to the "new only" selection.
      if (newCount > 0) {
        setSelectionMode("new");
        toast.success(`${newCount} baris belum ada di database`, {
          description: `${parsedAssets.length - newCount} baris sudah ada dan akan dilewati.`,
        });
      } else {
        toast.info("Semua baris di CSV ini sudah ada di database", {
          description: "Gak ada asset baru buat di-import.",
        });
      }
    } catch (error) {
      toast.error("Gagal cek database", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsChecking(false);
    }
  };

  const goToPage = (page: number) => setViewPage(Math.max(1, Math.min(totalViewPages, page)));

  const handleJumpToPage = () => {
    const parsed = parseInt(jumpToPageInput, 10);
    if (!isNaN(parsed)) goToPage(parsed);
    setJumpToPageInput("");
  };

  // --- Range mode maths (no cap on range size) ---
  const fromRowNum = parseInt(fromRowInput, 10);
  const toRowNum = parseInt(toRowInput, 10);
  const hasValidFrom = !isNaN(fromRowNum) && fromRowNum > 0;
  const hasValidTo = !isNaN(toRowNum) && toRowNum > 0;
  const clampedFrom = hasValidFrom ? Math.max(1, Math.min(fromRowNum, total || 1)) : NaN;
  const clampedTo = hasValidTo
    ? Math.max(hasValidFrom ? clampedFrom : 1, Math.min(toRowNum, total || 1))
    : NaN;
  const rangeValid = total > 0 && hasValidFrom && hasValidTo && clampedTo >= clampedFrom;

  /** The row numbers the current mode resolves to. Single source of truth for import. */
  const selectedRowNos = useMemo<number[]>(() => {
    if (total === 0) return [];
    if (selectionMode === "new") return newRowNos;
    if (selectionMode === "manual") return [...manualSelected].sort((a, b) => a - b);
    if (!rangeValid) return [];
    const out: number[] = [];
    for (let n = clampedFrom; n <= clampedTo; n++) out.push(n);
    return out;
  }, [selectionMode, newRowNos, manualSelected, rangeValid, clampedFrom, clampedTo, total]);

  const selectedCount = selectedRowNos.length;

  const toggleManualRow = (rowNo: number) => {
    setManualSelected((prev) => {
      const next = new Set(prev);
      next.has(rowNo) ? next.delete(rowNo) : next.add(rowNo);
      return next;
    });
  };

  const selectAllOnPage = () => {
    setManualSelected((prev) => {
      const next = new Set(prev);
      pageRows.forEach(({ rowNo }) => next.add(rowNo));
      return next;
    });
  };

  const clearPageSelection = () => {
    setManualSelected((prev) => {
      const next = new Set(prev);
      pageRows.forEach(({ rowNo }) => next.delete(rowNo));
      return next;
    });
  };

  const handleCopyNewRows = () =>
    copyWithFeedback(
      formatRowRanges(newRowNos, Number.MAX_SAFE_INTEGER),
      () => toast.success("Daftar baris baru dicopy"),
      (msg) => toast.error("Copy gagal", { description: msg })
    );

  const handleImport = async () => {
    if (total === 0) return;

    if (selectedCount === 0) {
      toast.error("Belum ada baris yang dipilih", {
        description:
          selectionMode === "range"
            ? "Isi 'dari baris' dan 'sampai baris' dengan angka yang valid dulu."
            : selectionMode === "manual"
            ? "Centang minimal satu baris di tabel dulu."
            : "Cek database dulu, atau semua baris di CSV ini memang sudah ada.",
      });
      return;
    }

    const slice = selectedRowNos.map((n) => parsedAssets[n - 1]).filter(Boolean);

    setIsImporting(true);
    setImportProgress(0);
    setImportStatus("idle");

    try {
      const response = await bulkCreateAssets(
        slice,
        (done, doneTotal) => setImportProgress(doneTotal > 0 ? Math.round((done / doneTotal) * 100) : 100),
        { updateExistingType }
      );

      if (!response.success) throw new Error(response.error || "Failed to import selected rows");

      const createdCount = response.data?.length || 0;
      const updatedCount = response.updatedCount || 0;
      setImportStatus("success");
      setImportMessage(
        `${selectedCount} baris dipilih: ${createdCount} asset baru dibuat` +
          (updateExistingType
            ? `, ${updatedCount} asset lama diperbarui type-nya`
            : `, sisanya (kalau ada) sudah ada di database dan dilewati`) +
          `.`
      );
      // The database just changed, so the cached check is now stale.
      setExistingFilenames(null);
      setManualSelected(new Set());
    } catch (error) {
      setImportStatus("error");
      setImportMessage(error instanceof Error ? error.message : "Gagal import baris yang dipilih");
    } finally {
      setIsImporting(false);
    }
  };

  const StatusBadge = ({ rowNo }: { rowNo: number }) => {
    const s = rowStatus(rowNo);
    if (s === "unknown") return <span className="text-xs text-muted-foreground">-</span>;
    if (s === "new")
      return (
        <Badge className="border-transparent bg-[var(--pp-bg-green-low)] text-[var(--pp-text-positive)] text-xs">
          Baru
        </Badge>
      );
    return (
      <Badge variant="secondary" className="text-xs text-muted-foreground">
        Sudah ada
      </Badge>
    );
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
            Buka file CSV dari komputer kamu buat di-review dulu isinya, cek baris mana yang
            belum ada di database, baru pilih yang mau di-import.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer border-muted-foreground/25 hover:border-muted-foreground/50 transition-all"
            onClick={() => fileInputRef.current?.click()}
          >
            <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
            {selectedFile ? (
              <p className="font-medium text-[var(--pp-text-positive)]">{selectedFile.name}</p>
            ) : (
              <p className="font-medium">Klik untuk pilih file CSV dari komputer</p>
            )}
            <p className="text-sm text-muted-foreground mt-1">
              Kolom: nama_file, asset_name, url_lightroom, type
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileInputChange}
            className="hidden"
          />
        </CardContent>
      </Card>

      {parseErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-medium mb-1">{parseErrors.length} baris dilewati</p>
            <ul className="text-sm list-disc pl-4 max-h-32 overflow-y-auto">
              {parseErrors.slice(0, 20).map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {total > 0 && (
        <>
          {/* ---------- Database checker ---------- */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                Cek Database
              </CardTitle>
              <CardDescription>
                Bandingin nama_file di CSV ini sama yang sudah ada di database, biar kelihatan
                baris mana aja yang beneran baru.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={handleCheckDatabase} disabled={isChecking} className="w-full sm:w-auto">
                <RefreshCw className={`w-4 h-4 mr-2 ${isChecking ? "animate-spin" : ""}`} />
                {isChecking
                  ? `Ngecek... (${checkedCount} asset dibaca)`
                  : existingFilenames
                  ? "Cek Ulang"
                  : "Cek Sekarang"}
              </Button>

              {existingFilenames && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-muted p-3">
                      <div className="text-xl font-bold">{total}</div>
                      <div className="text-xs text-muted-foreground">baris di CSV</div>
                    </div>
                    <div className="rounded-lg bg-[var(--pp-bg-green-low)] p-3">
                      <div className="text-xl font-bold text-[var(--pp-text-positive)]">
                        {newRowNos.length}
                      </div>
                      <div className="text-xs text-[var(--pp-text-positive)]">belum ada</div>
                    </div>
                    <div className="rounded-lg bg-muted p-3">
                      <div className="text-xl font-bold text-muted-foreground">
                        {existingRowNos.length}
                      </div>
                      <div className="text-xs text-muted-foreground">sudah ada</div>
                    </div>
                  </div>

                  {newRowNos.length > 0 && (
                    <div className="rounded-lg border p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">Baris yang belum ada</span>
                        <Button variant="ghost" size="sm" onClick={handleCopyNewRows}>
                          <Copy className="w-3.5 h-3.5 mr-1.5" />
                          Copy
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground break-words font-mono leading-relaxed">
                        {formatRowRanges(newRowNos)}
                      </p>
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground">
                    Database punya {existingFilenames.size} asset total. Hasil cek ini bakal
                    di-reset otomatis setelah import atau kalau kamu buka file lain, biar gak
                    kelihatan status yang sudah kedaluwarsa.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ---------- Preview ---------- */}
          <Card>
            <CardHeader>
              <CardTitle>Review Data ({total} baris total)</CardTitle>
              <CardDescription>
                Nampilin {VIEW_PAGE_SIZE} baris per halaman.
                {statusFilter !== "all" && ` Difilter: ${visibleRows.length} baris.`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={toggleSortDir}>
                  {sortDir === "asc" ? (
                    <ArrowUp className="w-4 h-4 mr-1.5" />
                  ) : (
                    <ArrowDown className="w-4 h-4 mr-1.5" />
                  )}
                  {sortDir === "asc" ? "Baris 1 dulu" : "Baris terakhir dulu"}
                </Button>

                {existingFilenames && (
                  <div className="flex items-center gap-1">
                    {(["all", "new", "existing"] as StatusFilter[]).map((f) => (
                      <Button
                        key={f}
                        variant={statusFilter === f ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setStatusFilter(f);
                          setViewPage(1);
                        }}
                      >
                        {f === "all" ? "Semua" : f === "new" ? `Baru (${newRowNos.length})` : `Sudah ada (${existingRowNos.length})`}
                      </Button>
                    ))}
                  </div>
                )}

                {selectionMode === "manual" && (
                  <div className="flex items-center gap-1 ml-auto">
                    <Button variant="outline" size="sm" onClick={selectAllOnPage}>
                      Centang halaman ini
                    </Button>
                    <Button variant="ghost" size="sm" onClick={clearPageSelection}>
                      Hapus centang
                    </Button>
                  </div>
                )}
              </div>

              <div className="border rounded-lg overflow-auto max-h-[420px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {selectionMode === "manual" && <TableHead className="w-10" />}
                      <TableHead className="w-24">
                        <button
                          type="button"
                          onClick={toggleSortDir}
                          className="inline-flex items-center gap-1 font-medium transition-colors hover:text-foreground"
                          title={
                            sortDir === "asc"
                              ? "Klik buat liat baris terakhir (yang baru ditambahin) dulu"
                              : "Klik buat balik ke urutan asli"
                          }
                        >
                          Baris
                          {sortDir === "asc" ? (
                            <ArrowUp className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </TableHead>
                      <TableHead className="w-24">Status</TableHead>
                      <TableHead>nama_file</TableHead>
                      <TableHead>asset_name</TableHead>
                      <TableHead>type</TableHead>
                      <TableHead>url_lightroom</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageRows.map(({ row, rowNo }) => (
                      <TableRow
                        key={rowNo}
                        className={
                          selectionMode === "manual" && manualSelected.has(rowNo)
                            ? "bg-accent/50"
                            : undefined
                        }
                      >
                        {selectionMode === "manual" && (
                          <TableCell>
                            <Checkbox
                              checked={manualSelected.has(rowNo)}
                              onCheckedChange={() => toggleManualRow(rowNo)}
                              aria-label={`Pilih baris ${rowNo}`}
                            />
                          </TableCell>
                        )}
                        <TableCell className="text-muted-foreground">{rowNo}</TableCell>
                        <TableCell>
                          <StatusBadge rowNo={rowNo} />
                        </TableCell>
                        <TableCell className="max-w-[220px] truncate">{row.nama_file}</TableCell>
                        <TableCell className="max-w-[180px] truncate">{row.asset_name}</TableCell>
                        <TableCell>{row.type}</TableCell>
                        <TableCell className="max-w-[260px] truncate text-xs text-muted-foreground">
                          {row.url_lightroom}
                        </TableCell>
                      </TableRow>
                    ))}
                    {pageRows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                          Gak ada baris yang cocok sama filter ini.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => goToPage(1)} disabled={safeViewPage <= 1} title="Halaman pertama">
                    <ChevronsLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => goToPage(safeViewPage - 1)} disabled={safeViewPage <= 1}>
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Sebelumnya
                  </Button>
                </div>

                <span className="text-sm text-muted-foreground">
                  Halaman {safeViewPage} / {totalViewPages}
                </span>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => goToPage(safeViewPage + 1)} disabled={safeViewPage >= totalViewPages}>
                    Berikutnya
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => goToPage(totalViewPages)} disabled={safeViewPage >= totalViewPages} title="Halaman terakhir">
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

          {/* ---------- Selection + import ---------- */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Pilih Baris untuk Di-import
              </CardTitle>
              <CardDescription>Tiga cara pilih baris — pakai yang paling cocok.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Mode switcher */}
              <div className="grid gap-2 sm:grid-cols-3">
                {(
                  [
                    { key: "new", label: "Yang belum ada", hint: "Otomatis pilih semua baris baru" },
                    { key: "manual", label: "Centang manual", hint: "Pilih baris satu-satu di tabel" },
                    { key: "range", label: "Rentang baris", hint: "Dari baris X sampai Y" },
                  ] as { key: SelectionMode; label: string; hint: string }[]
                ).map((m) => {
                  const disabled = m.key === "new" && !existingFilenames;
                  return (
                    <button
                      key={m.key}
                      type="button"
                      disabled={disabled}
                      onClick={() => setSelectionMode(m.key)}
                      className={`rounded-lg border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                        selectionMode === m.key
                          ? "border-[var(--pp-stroke-active)] bg-accent"
                          : "hover:bg-muted"
                      }`}
                    >
                      <div className="text-sm font-medium">{m.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {disabled ? "Cek database dulu" : m.hint}
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectionMode === "range" && (
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
              )}

              {selectionMode === "manual" && (
                <p className="text-sm text-muted-foreground">
                  Centang baris di tabel di atas. Kepilih sekarang: <strong>{manualSelected.size}</strong> baris.
                  {existingFilenames && newRowNos.length > 0 && (
                    <>
                      {" "}
                      <button
                        type="button"
                        className="underline hover:no-underline"
                        onClick={() => setManualSelected(new Set(newRowNos))}
                      >
                        Centang semua yang belum ada ({newRowNos.length})
                      </button>
                    </>
                  )}
                </p>
              )}

              <div className="rounded-lg bg-muted p-3 text-sm">
                {selectedCount > 0 ? (
                  <>
                    <strong>{selectedCount}</strong> baris akan di-import
                    {selectionMode === "range" && rangeValid && ` (baris ${clampedFrom}-${clampedTo})`}
                    {selectionMode === "new" && ` — baris ${formatRowRanges(newRowNos, 8)}`}
                    .
                    {existingFilenames && selectionMode !== "new" && (
                      <span className="text-muted-foreground">
                        {" "}
                        Dari jumlah itu,{" "}
                        {selectedRowNos.filter((n) => rowStatus(n) === "new").length} beneran baru.
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-muted-foreground">Belum ada baris yang dipilih.</span>
                )}
              </div>

              <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
                <Checkbox
                  id="csv-viewer-update-existing-type"
                  checked={updateExistingType}
                  onCheckedChange={(checked) => setUpdateExistingType(checked === true)}
                  className="mt-0.5"
                />
                <Label htmlFor="csv-viewer-update-existing-type" className="text-sm font-normal leading-snug cursor-pointer">
                  Update <strong>type</strong> untuk asset yang nama filenya sudah ada di database
                  (asset_name & URL yang lama gak berubah, cuma type-nya aja yang di-update ke
                  yang ada di baris terpilih ini). Kalau gak dicentang, asset yang sudah ada
                  dibiarkan seperti semula.
                </Label>
              </div>

              {!isImporting && importStatus !== "success" && (
                <Button className="w-full" size="lg" onClick={handleImport} disabled={total === 0}>
                  <Upload className="w-4 h-4 mr-2" />
                  {selectedCount > 0 ? `Import ${selectedCount} Baris` : "Import Baris Terpilih"}
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
                <Alert className="border-[var(--pp-stroke-positive)] bg-[var(--pp-bg-green-low)]">
                  <CheckCircle className="h-4 w-4 text-[var(--pp-icon-positive)]" />
                  <AlertDescription className="text-[var(--pp-text-positive)] space-y-2">
                    <p>{importMessage}</p>
                    <p className="text-xs opacity-80">
                      Status "belum ada / sudah ada" sudah di-reset. Klik Cek Ulang di atas kalau
                      mau lihat kondisi terbaru.
                    </p>
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
