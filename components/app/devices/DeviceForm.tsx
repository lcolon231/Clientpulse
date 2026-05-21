"use client";

import * as React from "react";
import { XIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TagBadge } from "@/components/app/devices/TagBadge";

// ---------------------------------------------------------------------------
// Shared device form state type
// ---------------------------------------------------------------------------

export interface DeviceFormFields {
  hostname: string;
  type: "Server" | "Workstation" | "Laptop" | "Network" | "Other";
  os: string;
  osVersion: string;
  lastSeen: string;
  patchAgeDays: number | "";
  tags: string[];
}

export const DEVICE_FORM_INITIAL: DeviceFormFields = {
  hostname: "",
  type: "Workstation",
  os: "",
  osVersion: "",
  lastSeen: new Date().toISOString().split("T")[0],
  patchAgeDays: 0,
  tags: [],
};

const BASE_TAG_LIST = [
  "Server",
  "Workstation",
  "Laptop",
  "Network",
  "Firewall",
  "NAS",
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface DeviceFormProps {
  fields: DeviceFormFields;
  errors: Record<string, string>;
  onChange: <K extends keyof DeviceFormFields>(
    key: K,
    value: DeviceFormFields[K]
  ) => void;
}

export function DeviceForm({ fields, errors, onChange }: DeviceFormProps) {
  const [tagInput, setTagInput] = React.useState("");

  function addTag(tag: string) {
    const trimmed = tag.trim();
    if (!trimmed || fields.tags.includes(trimmed)) return;
    onChange("tags", [...fields.tags, trimmed]);
    setTagInput("");
  }

  function removeTag(tag: string) {
    onChange("tags", fields.tags.filter((t) => t !== tag));
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tagInput);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Hostname */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="dev-hostname">
          Hostname <span className="text-destructive">*</span>
        </Label>
        <Input
          id="dev-hostname"
          value={fields.hostname}
          onChange={(e) => onChange("hostname", e.target.value)}
          placeholder="server-01.acme.local"
          aria-invalid={!!errors.hostname}
        />
        {errors.hostname && (
          <p className="text-xs text-destructive">{errors.hostname}</p>
        )}
      </div>

      {/* Type */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="dev-type">
          Type <span className="text-destructive">*</span>
        </Label>
        <Select
          id="dev-type"
          value={fields.type}
          onChange={(e) =>
            onChange("type", e.target.value as DeviceFormFields["type"])
          }
        >
          <option value="Server">Server</option>
          <option value="Workstation">Workstation</option>
          <option value="Laptop">Laptop</option>
          <option value="Network">Network</option>
          <option value="Other">Other</option>
        </Select>
      </div>

      {/* OS */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dev-os">OS</Label>
          <Input
            id="dev-os"
            value={fields.os}
            onChange={(e) => onChange("os", e.target.value)}
            placeholder="Windows Server 2022"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dev-osver">OS Version</Label>
          <Input
            id="dev-osver"
            value={fields.osVersion}
            onChange={(e) => onChange("osVersion", e.target.value)}
            placeholder="10.0.20348"
          />
        </div>
      </div>

      {/* Last Seen + Patch Age */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dev-lastseen">Last Seen</Label>
          <Input
            id="dev-lastseen"
            type="date"
            value={fields.lastSeen}
            onChange={(e) => onChange("lastSeen", e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dev-patch">Patch Age (days)</Label>
          <Input
            id="dev-patch"
            type="number"
            min={0}
            value={fields.patchAgeDays}
            onChange={(e) =>
              onChange(
                "patchAgeDays",
                e.target.value === "" ? "" : parseInt(e.target.value, 10)
              )
            }
          />
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-col gap-1.5">
        <Label>Tags</Label>
        {/* Quick-select from base list */}
        <div className="flex flex-wrap gap-1">
          {BASE_TAG_LIST.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => addTag(tag)}
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
                fields.tags.includes(tag)
                  ? "opacity-40 cursor-default"
                  : "bg-muted text-muted-foreground hover:bg-muted/70 cursor-pointer"
              }`}
              disabled={fields.tags.includes(tag)}
            >
              + {tag}
            </button>
          ))}
        </div>
        {/* Free-form input */}
        <Input
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={handleTagKeyDown}
          onBlur={() => { if (tagInput.trim()) addTag(tagInput); }}
          placeholder="Type a tag and press Enter"
        />
        {/* Selected tags */}
        {fields.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {fields.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1"
              >
                <TagBadge tag={tag} />
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <XIcon className="h-3 w-3" />
                  <span className="sr-only">Remove {tag}</span>
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
