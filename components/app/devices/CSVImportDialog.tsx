"use client";

import * as React from "react";
import Papa from "papaparse";
import { UploadIcon, FileIcon, AlertCircleIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import {
  importDevicesAction,
  type CsvDeviceRow,
} from "@/app/(app)/clients/[id]/actions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ParsedRow extends CsvDeviceRow {
  _valid: boolean;
  _errors: string[];
  _rowIndex: number;
}

interface CSVImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_TYPES = new Set([
  "Server",
  "Workstation",
  "Laptop",
  "Network",
  "Other",
]);

function validateRow(row: CsvDeviceRow, index: number): ParsedRow {
  const errors: string[] = [];

  if (!row.hostname?.trim()) errors.push("hostname required");
  if (!row.type?.trim()) errors.push("type required");
  else if (!VALID_TYPES.has(row.type.trim()))
    errors.push(`type must be one of: ${[...VALID_TYPES].join(", ")}`);

  return {
    ...row,
    hostname: row.hostname?.trim() ?? "",
    type: row.type?.trim() ?? "",
    _valid: errors.length === 0,
    _errors: errors,
    _rowIndex: index,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type Step = "upload" | "preview" | "importing";

export function CSVImportDialog({
  open,
  onOpenChange,
  clientId,
}: CSVImportDialogProps) {
  const { toast } = useToast();
  const fileRef = React.useRef<HTMLInputElement>(null);

  const [step, setStep] = React.useState<Step>("upload");
  const [rows, setRows] = React.useState<ParsedRow[]>([]);
  const [fileName, setFileName] = React.useState("");
  const [parseError, setParseError] = React.useState("");
  const [pending, setPending] = React.useState(false);

  // Reset when dialog closes
  React.useEffect(() => {
    if (!open) {
      setStep("upload");
      setRows([]);
      setFileName("");
      setParseError("");
      setPending(false);
    }
  }, [open]);

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
    if (file && file.name.endsWith(".csv")) handleFile(file);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset input so same file can be re-selected
    e.target.value = "";
  }

  async function handleImport() {
    const validRows = rows.filter((r) => r._valid);
    if (validRows.length === 0) return;

    setPending(true);
    setStep("importing");

    const result = await importDevicesAction(
      clientId,
      validRows.map(({ _valid, _errors, _rowIndex, ...row }) => row)
    );

    setPending(false);

    if (result.success) {
      toast({
        variant: "success",
        title: `${result.count} ${result.count === 1 ? "device" : "devices"} imported successfully`,
      });
      onOpenChange(false);
    } else {
      toast({ variant: "error", title: result.error });
      setStep("preview");
    }
  }

  const validCount = rows.filter((r) => r._valid).length;
  const invalidCount = rows.length - validCount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Devices from CSV</DialogTitle>
          <DialogDescription>
            Expected columns:{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              hostname, type, os, os_version, last_seen, patch_age_days, tags
            </code>
          </DialogDescription>
        </DialogHeader>

        {/* ── Upload step ── */}
        {step === "upload" && (
          <div className="flex flex-col gap-4">
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
                <p className="text-xs text-muted-foreground mt-0.5">
                  .csv files only
                </p>
              </div>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="sr-only"
              onChange={handleInputChange}
            />
            {parseError && (
              <p className="flex items-center gap-1.5 text-sm text-destructive">
                <AlertCircleIcon className="h-4 w-4 shrink-0" />
                {parseError}
              </p>
            )}
            <DialogFooter showCloseButton />
          </div>
        )}

        {/* ── Preview step ── */}
        {(step === "preview" || step === "importing") && (
          <div className="flex flex-col gap-4">
            {/* Summary bar */}
            <div className="flex items-center gap-3">
              <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-sm text-muted-foreground truncate">
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
                      className={!row._valid ? "bg-red-50/40 dark:bg-red-900/10" : ""}
                    >
                      <TableCell className="text-muted-foreground text-xs">
                        {row._rowIndex + 1}
                      </TableCell>
                      <TableCell
                        className={
                          !row.hostname ? "text-red-600 font-medium" : "font-medium"
                        }
                      >
                        {row.hostname || <em className="text-red-600">missing</em>}
                      </TableCell>
                      <TableCell
                        className={!row.type ? "text-red-600" : ""}
                      >
                        {row.type || <em className="text-red-600">missing</em>}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.os || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
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
                <AlertCircleIcon className="mr-1 inline-block h-3.5 w-3.5 text-orange-500" />
                {invalidCount} invalid {invalidCount === 1 ? "row" : "rows"} will
                be skipped. Only the {validCount} valid{" "}
                {validCount === 1 ? "row" : "rows"} will be imported.
              </p>
            )}

            <DialogFooter showCloseButton>
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
              >
                {pending
                  ? "Importing…"
                  : `Import ${validCount} ${validCount === 1 ? "device" : "devices"}`}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
