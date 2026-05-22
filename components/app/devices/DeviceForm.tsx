"use client";

import * as React from "react";
import { XIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { TagBadge } from "@/components/app/devices/TagBadge";
import { DEVICE_TYPE_OPTIONS, OS_OPTIONS, type DeviceType } from "@/types";

// ---------------------------------------------------------------------------
// Shared device form state
// ---------------------------------------------------------------------------

export interface DeviceFormFields {
  hostname: string;
  type: DeviceType;
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
          onChange={(e) => onChange("type", e.target.value as DeviceType)}
        >
          {DEVICE_TYPE_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </Select>
      </div>

      {/* OS + OS Version */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dev-os">OS</Label>
          <Select
            id="dev-os"
            value={fields.os}
            onChange={(e) => onChange("os", e.target.value)}
          >
            <option value="">Select OS</option>
            {OS_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </Select>
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
        <Label htmlFor="dev-tags">Tags</Label>
        <Input
          id="dev-tags"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={handleTagKeyDown}
          onBlur={() => {
            if (tagInput.trim()) addTag(tagInput);
          }}
          placeholder="Type a tag and press Enter or comma"
        />
        {fields.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {fields.tags.map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1">
                <TagBadge tag={tag} />
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={`Remove tag ${tag}`}
                >
                  <XIcon className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
