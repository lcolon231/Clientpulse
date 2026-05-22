"use client";

import * as React from "react";
import Papa from "papaparse";
import { UploadIcon, FileIcon, AlertCircleIcon, DownloadIcon, Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { bulkCreateDevices, type BulkCreateResult } from "@/lib/actions/devices";
import type { CsvDeviceRow } from "@/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ParsedRow extends CsvDeviceRow {
  _valid: boolean;
  _errors: string[];
  _rowIndex: number;
}

interface CSVImportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_TYPES = new Set([
  "Workstation",
  "Server",
  "Network Device",
  "Printer",
  "Mobile",
  "Other",
]);

function validateRow(row: CsvDeviceRow, index: number): ParsedRow {
  const errors: string[] = [];

  if (!row.hostname?.trim()) errors.push("hostname required");

  if (!row.type?.trim()) {
    errors.push("type required");
  } else if (!VALID_TYPES.has(row.type.trim())) {
    errors.push(`type must be one of: ${[...VALID_TYPES].join(", ")}`);
  }

  if (row.patch_age_days && isNaN(parseInt(row.patch_age_days, 10))) {
    errors.push("patch_age_days must be a number");
  }

  return {
    ...row,
    hostname: row.hostname?.trim() ?? "",
    type: row.type?.trim() ?? "",
    _valid: errors.length === 0,
    _errors: errors,
    _rowIndex: index,
  };
}

function downloadTemplate() {
  const csv =
    "hostname,type,os,os_version,last_seen,patch_age_days,tags\n" +
    "server-01.acme.local,Server,Windows,Server 2022,2024-01-15,7,backup\n" +
    "wks-finance-01,Workstation,Windows,11,2024-01-14,30,finance\n";
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "devices-template.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type Step = "upload" | "preview" | "importing";

export function CSVImportSheet({
  open,
  onOpenChange,
  clientId,
}: CSVImportSheetProps) {
  const router = useRouter();
  const fileRef = React.useRef<HTMLInputElement>(null);

  const [step, setStep] = React.useState<Step>("upload");
  const [rows, setRows] = React.useState<ParsedRow[]>([]);
  const [totalRows, setTotalRows] = React.useState(0);
  const [fileName, setFileName] = React.useState("");
  const [parseError, setParseError] = React.useState("");
  const [pending, setPending] = React.useState(false);

  function resetState() {
    setStep("upload");
    setRows([]);
    setTotalRows(0);
    setFileName("");
    setParseError("");
    setPending(false);
  }

  function handleOpenChange(next: boolean) {
    if (!next) resetState();
    onOpenChange(next);
  }

  function handleFile(file: File) {
    setParseError("");
    setFileName(file.name);

    Papa.parse<CsvDeviceRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        if (results.errors.length > 0 && results.data.length === 0) {
          setParseError("Could not parse file. Make sure it's a valid CSV.");
          return;
        }
        const parsed = (results.data as CsvDeviceRow[]).map((row, i) =>
          validateRow(row, i)
        );
        setTotalRows(parsed.length);
        setRows(parsed);
        setStep("preview");
      },
      error() {
        setParseError("Failed to read the file.");
      },
    });
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith(".csv")) handleFile(file);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  async function handleImport() {
    const validRows = rows.filter((r) => r._valid);
    if (validRows.length === 0) return;

    setPending(true);
    setStep("importing");

    const result: BulkCreateResult = await bulkCreateDevices(
      clientId,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      validRows.map(({ _valid, _errors, _rowIndex, ...row }) => row)
    );

    setPending(false);

    if (result.success) {
      const skipped = totalRows - result.count;
      const msg =
        skipped > 0
          ? `Imported ${result.count} devices, ${skipped} skipped due to errors.`
          : `Imported ${result.count} ${result.count === 1 ? "device" : "devices"} successfully.`;
      toast.success(msg);
      onOpenChange(false);
      router.refresh();
    } else {
      toast.error(result.error);
      setStep("preview");
    }
  }

  const validCount = rows.filter((r) => r._valid).length;
  const invalidCount = rows.length - validCount;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="flex flex-col overflow-y-auto sm:max-w-2xl"
      >
        <SheetHeader>
          <SheetTitle>Import Devices from CSV</SheetTitle>
          <SheetDescription>
            Expected columns:{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              hostname, type, os, os_version, last_seen, patch_age_days, tags
            </code>
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4 pb-4">
          {/* Upload step */}
          {step === "upload" && (
            <>
              {/* Template download */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Need a starting point?
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={downloadTemplate}
                  className="gap-1.5"
                >
                  <DownloadIcon className="h-3.5 w-3.5" />
                  Download template
                </Button>
              </div>

              {/* Drop zone */}
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
                className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border p-10 text-center transition-colors hover:border-ring hover:bg-muted/30"
              >
                <UploadIcon className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">
                    Drop a CSV file here or click to browse
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    .csv files only
                  </p>
                </div>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                className="sr-only"
                aria-label="Upload CSV file"
                onChange={handleInputChange}
              />
              {parseError && (
                <p className="flex items-center gap-1.5 text-sm text-destructive">
                  <AlertCircleIcon className="h-4 w-4 shrink-0" />
                  {parseError}
                </p>
              )}
            </>
          )}

          {/* Preview / importing step */}
          {(step === "preview" || step === "importing") && (
            <>
              {/* Summary bar */}
              <div className="flex items-center gap-3">
                <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate text-sm text-muted-foreground">
                  {fileName}
                </span>
                <div className="ml-auto flex shrink-0 gap-2">
                  <Badge variant="green">{validCount} valid</Badge>
                  {invalidCount > 0 && (
                    <Badge variant="red">{invalidCount} invalid</Badge>
                  )}
                </div>
              </div>

              {/* Preview table */}
              <div className="max-h-72 overflow-y-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Hostname</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>OS</TableHead>
                      <TableHead>Tags</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow
                        key={row._rowIndex}
                        className={
                          !row._valid ? "bg-red-50/40 dark:bg-red-900/10" : ""
                        }
                      >
                        <TableCell className="text-xs text-muted-foreground">
                          {row._rowIndex + 1}
                        </TableCell>
                        <TableCell className={!row.hostname ? "text-red-600 font-medium" : "font-medium"}>
                          {row.hostname || <em className="text-red-600">missing</em>}
                        </TableCell>
                        <TableCell className={!row.type ? "text-red-600" : ""}>
                          {row.type || <em className="text-red-600">missing</em>}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {row.os || "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {row.tags || "—"}
                        </TableCell>
                        <TableCell>
                          {row._valid ? (
                            <Badge variant="green">OK</Badge>
                          ) : (
                            <span
                              className="text-xs text-red-600"
                              title={row._errors.join("; ")}
                            >
                              {row._errors.join(", ")}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {invalidCount > 0 && (
                <p className="text-xs text-muted-foreground">
                  <AlertCircleIcon className="mr-1 inline-block h-3.5 w-3.5 text-amber-500" />
                  {invalidCount} invalid {invalidCount === 1 ? "row" : "rows"} will
                  be skipped.
                </p>
              )}

              <SheetFooter>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStep("upload")}
                  disabled={pending}
                >
                  Choose different file
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={pending || validCount === 0}
                  className="gap-2"
                >
                  {pending && <Loader2Icon className="h-4 w-4 animate-spin" />}
                  {pending
                    ? "Importing…"
                    : `Import ${validCount} valid ${validCount === 1 ? "row" : "rows"}`}
                </Button>
              </SheetFooter>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
