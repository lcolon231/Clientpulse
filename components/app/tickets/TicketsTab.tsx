"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import {
  ExternalLinkIcon,
  Loader2Icon,
  MessageSquareIcon,
  PlusIcon,
} from "lucide-react";
import type { Role, TicketPriority, TicketStatus, TicketSource } from "@prisma/client";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  OPEN_TICKET_STATUSES,
  TICKET_PRIORITY_LABELS,
  TICKET_PRIORITY_VARIANTS,
  TICKET_SOURCE_LABELS,
  TICKET_STATUS_LABELS,
  TICKET_STATUS_VARIANTS,
} from "@/types/ticket";
import {
  addCommentAction,
  closeTicketAction,
  createTicketAction,
  deleteTicketAction,
  updateTicketAction,
} from "@/lib/actions/tickets";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CommentUser = { id: string; name: string | null; email: string };
type TicketCommentRow = {
  id: string;
  ticketId: string;
  userId: string;
  body: string;
  createdAt: Date;
  user: CommentUser;
};
type AssigneeUser = { id: string; name: string | null; email: string };
export type TicketWithDetails = {
  id: string;
  organizationId: string;
  clientId: string | null;
  source: TicketSource | null;
  externalId: string | null;
  number: string | null;
  title: string;
  description: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  assignee: string | null;
  assigneeId: string | null;
  assigneeUser: AssigneeUser | null;
  dueDate: Date | null;
  url: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  comments: TicketCommentRow[];
};
type OrgMember = { id: string; name: string | null; email: string };

interface TicketsTabProps {
  tickets: TicketWithDetails[];
  clientId: string;
  orgMembers: OrgMember[];
  role: Role;
}

// ---------------------------------------------------------------------------
// Form schema
// ---------------------------------------------------------------------------

const ticketFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  status: z.enum(["OPEN", "IN_PROGRESS", "WAITING", "RESOLVED", "CLOSED"]),
  assigneeId: z.string().optional(),
  dueDate: z.string().optional(),
});
type TicketFormValues = z.infer<typeof ticketFormSchema>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(date: Date | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function displayAssignee(ticket: TicketWithDetails): string {
  return ticket.assigneeUser?.name ?? ticket.assigneeUser?.email ?? ticket.assignee ?? "—";
}

// ---------------------------------------------------------------------------
// Ticket form (shared between create and edit dialogs)
// ---------------------------------------------------------------------------

function TicketForm({
  form,
  orgMembers,
  isEdit,
  onCancel,
}: {
  form: ReturnType<typeof useForm<TicketFormValues>>;
  orgMembers: OrgMember[];
  isEdit: boolean;
  onCancel: () => void;
}) {
  const { register, formState: { errors, isSubmitting } } = form;
  return (
    <fieldset disabled={isSubmitting} className="contents">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="tf-title">
          Title <span className="text-destructive">*</span>
        </Label>
        <Input id="tf-title" placeholder="Describe the issue…" {...register("title")} />
        {errors.title && (
          <p className="text-xs text-destructive">{errors.title.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="tf-desc">Description</Label>
        <Textarea
          id="tf-desc"
          rows={3}
          placeholder="Additional details…"
          {...register("description")}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tf-priority">Priority</Label>
          <Select id="tf-priority" {...register("priority")}>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </Select>
        </div>
        {isEdit && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tf-status">Status</Label>
            <Select id="tf-status" {...register("status")}>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="WAITING">Waiting</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </Select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tf-assignee">Assignee</Label>
          <Select id="tf-assignee" {...register("assigneeId")}>
            <option value="">Unassigned</option>
            {orgMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name ?? m.email}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tf-due">Due Date</Label>
          <Input id="tf-due" type="date" {...register("dueDate")} />
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting} className="gap-2">
          {isSubmitting && <Loader2Icon className="h-4 w-4 animate-spin" />}
          {isSubmitting ? "Saving…" : isEdit ? "Save Changes" : "Create Ticket"}
        </Button>
      </DialogFooter>
    </fieldset>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const STATUS_FILTER_OPTIONS = [
  { value: "ALL", label: "All Statuses" },
  { value: "OPEN", label: "Open" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "WAITING", label: "Waiting" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "CLOSED", label: "Closed" },
  { value: "NEW", label: "New" },
];

const PRIORITY_FILTER_OPTIONS = [
  { value: "ALL", label: "All Priorities" },
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
];

export function TicketsTab({ tickets, clientId, orgMembers, role }: TicketsTabProps) {
  const router = useRouter();
  const isOwner = role === "OWNER";
  const canWrite = role !== "READONLY";

  // Filters
  const [statusFilter, setStatusFilter] = React.useState("ALL");
  const [priorityFilter, setPriorityFilter] = React.useState("ALL");

  // UI open/close state
  const [createOpen, setCreateOpen] = React.useState(false);
  const [selectedTicketId, setSelectedTicketId] = React.useState<string | null>(null);
  const [editTicketId, setEditTicketId] = React.useState<string | null>(null);
  const [deleteTicketId, setDeleteTicketId] = React.useState<string | null>(null);

  // Comment input
  const [commentBody, setCommentBody] = React.useState("");
  const [commentPending, setCommentPending] = React.useState(false);

  // General action pending (close/delete)
  const [actionPending, setActionPending] = React.useState(false);

  // Derived: selected / editing ticket from live prop
  const selectedTicket = React.useMemo(
    () => tickets.find((t) => t.id === selectedTicketId) ?? null,
    [tickets, selectedTicketId],
  );
  const editTicket = React.useMemo(
    () => tickets.find((t) => t.id === editTicketId) ?? null,
    [tickets, editTicketId],
  );

  // Filtered list
  const filteredTickets = React.useMemo(
    () =>
      tickets.filter((t) => {
        if (statusFilter !== "ALL" && t.status !== statusFilter) return false;
        if (priorityFilter !== "ALL" && t.priority !== priorityFilter) return false;
        return true;
      }),
    [tickets, statusFilter, priorityFilter],
  );

  const openCount = tickets.filter((t) =>
    OPEN_TICKET_STATUSES.includes(t.status),
  ).length;

  // ---------------------------------------------------------------------------
  // Forms
  // ---------------------------------------------------------------------------

  const createForm = useForm<TicketFormValues>({
    resolver: zodResolver(ticketFormSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "MEDIUM",
      status: "OPEN",
      assigneeId: "",
      dueDate: "",
    },
  });

  const editForm = useForm<TicketFormValues>({
    resolver: zodResolver(ticketFormSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "MEDIUM",
      status: "OPEN",
      assigneeId: "",
      dueDate: "",
    },
  });

  React.useEffect(() => {
    if (editTicket) {
      editForm.reset({
        title: editTicket.title,
        description: editTicket.description ?? "",
        priority: (editTicket.priority === "UNKNOWN" ? "MEDIUM" : editTicket.priority) as
          | "LOW"
          | "MEDIUM"
          | "HIGH"
          | "URGENT",
        status: editTicket.status as
          | "OPEN"
          | "IN_PROGRESS"
          | "WAITING"
          | "RESOLVED"
          | "CLOSED",
        assigneeId: editTicket.assigneeId ?? "",
        dueDate: editTicket.dueDate
          ? new Date(editTicket.dueDate).toISOString().slice(0, 10)
          : "",
      });
    }
  }, [editTicket, editForm]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  async function handleCreate(values: TicketFormValues) {
    const result = await createTicketAction(clientId, {
      title: values.title,
      description: values.description,
      priority: values.priority,
      assigneeId: values.assigneeId || undefined,
      dueDate: values.dueDate || undefined,
    });
    if (result.success) {
      toast.success("Ticket created");
      createForm.reset();
      setCreateOpen(false);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  async function handleEdit(values: TicketFormValues) {
    if (!editTicketId) return;
    const result = await updateTicketAction(editTicketId, {
      title: values.title,
      description: values.description,
      priority: values.priority,
      status: values.status,
      assigneeId: values.assigneeId || undefined,
      dueDate: values.dueDate || undefined,
    });
    if (result.success) {
      toast.success("Ticket updated");
      setEditTicketId(null);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  async function handleClose(ticketId: string) {
    setActionPending(true);
    try {
      const result = await closeTicketAction(ticketId);
      if (result.success) {
        toast.success("Ticket closed");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } finally {
      setActionPending(false);
    }
  }

  async function handleDelete(ticketId: string) {
    setActionPending(true);
    try {
      const result = await deleteTicketAction(ticketId);
      if (result.success) {
        toast.success("Ticket deleted");
        setDeleteTicketId(null);
        setSelectedTicketId(null);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } finally {
      setActionPending(false);
    }
  }

  async function handleComment() {
    if (!selectedTicketId || !commentBody.trim()) return;
    setCommentPending(true);
    try {
      const result = await addCommentAction(selectedTicketId, commentBody.trim());
      if (result.success) {
        setCommentBody("");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } finally {
      setCommentPending(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex flex-col gap-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-36"
        >
          {STATUS_FILTER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        <Select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="w-36"
        >
          {PRIORITY_FILTER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        <div className="flex-1" />
        {canWrite && (
          <Button
            size="sm"
            onClick={() => setCreateOpen(true)}
            className="gap-1.5"
          >
            <PlusIcon className="h-4 w-4" />
            Create Ticket
          </Button>
        )}
      </div>

      {/* Ticket list card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>Tickets</CardTitle>
          <span className="text-sm text-muted-foreground">
            <span className="tabular-nums font-medium text-foreground">{openCount}</span>{" "}
            open of{" "}
            <span className="tabular-nums">{tickets.length}</span>
          </span>
        </CardHeader>
        <CardContent className="p-0">
          {filteredTickets.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {tickets.length === 0 ? (
                <div className="flex flex-col items-center gap-3">
                  <p>No tickets yet. Create your first ticket.</p>
                  {canWrite && (
                    <Button
                      size="sm"
                      onClick={() => setCreateOpen(true)}
                      className="gap-1.5"
                    >
                      <PlusIcon className="h-4 w-4" />
                      Create Ticket
                    </Button>
                  )}
                </div>
              ) : (
                <p>No tickets match the selected filters.</p>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assignee</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets.map((ticket) => (
                  <TableRow
                    key={ticket.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedTicketId(ticket.id)}
                  >
                    <TableCell className="min-w-[220px]">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium">{ticket.title}</span>
                          {ticket.source && (
                            <Badge variant="default" className="text-[10px] py-0">
                              {TICKET_SOURCE_LABELS[ticket.source]}
                            </Badge>
                          )}
                          {ticket.url && (
                            <a
                              href={ticket.url}
                              target="_blank"
                              rel="noreferrer"
                              aria-label="Open in PSA"
                              className="text-muted-foreground hover:text-foreground"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLinkIcon className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                        {(ticket.number ?? ticket.externalId) && (
                          <span className="text-xs text-muted-foreground">
                            {ticket.number ?? ticket.externalId}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={TICKET_PRIORITY_VARIANTS[ticket.priority]}>
                        {TICKET_PRIORITY_LABELS[ticket.priority]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={TICKET_STATUS_VARIANTS[ticket.status]}>
                        {TICKET_STATUS_LABELS[ticket.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>{displayAssignee(ticket)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(ticket.dueDate)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(ticket.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Create Ticket Dialog                                                 */}
      {/* ------------------------------------------------------------------ */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Ticket</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={createForm.handleSubmit(handleCreate)}
            className="flex flex-col gap-4"
            noValidate
          >
            <TicketForm
              form={createForm}
              orgMembers={orgMembers}
              isEdit={false}
              onCancel={() => {
                setCreateOpen(false);
                createForm.reset();
              }}
            />
          </form>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------------ */}
      {/* Edit Ticket Dialog                                                   */}
      {/* ------------------------------------------------------------------ */}
      <Dialog
        open={!!editTicketId}
        onOpenChange={(open) => {
          if (!open) setEditTicketId(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Ticket</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={editForm.handleSubmit(handleEdit)}
            className="flex flex-col gap-4"
            noValidate
          >
            <TicketForm
              form={editForm}
              orgMembers={orgMembers}
              isEdit={true}
              onCancel={() => setEditTicketId(null)}
            />
          </form>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------------ */}
      {/* Ticket Detail Sheet                                                  */}
      {/* ------------------------------------------------------------------ */}
      <Sheet
        open={!!selectedTicketId}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedTicketId(null);
            setCommentBody("");
          }
        }}
      >
        <SheetContent
          side="right"
          className="flex flex-col overflow-hidden sm:max-w-lg p-0"
        >
          {selectedTicket && (
            <>
              {/* Header */}
              <SheetHeader className="px-6 pt-6 pb-3 border-b shrink-0">
                <div className="flex flex-wrap items-center gap-1.5 pr-8">
                  <Badge variant={TICKET_PRIORITY_VARIANTS[selectedTicket.priority]}>
                    {TICKET_PRIORITY_LABELS[selectedTicket.priority]}
                  </Badge>
                  <Badge variant={TICKET_STATUS_VARIANTS[selectedTicket.status]}>
                    {TICKET_STATUS_LABELS[selectedTicket.status]}
                  </Badge>
                  {selectedTicket.source && (
                    <Badge variant="default">
                      {TICKET_SOURCE_LABELS[selectedTicket.source]}
                    </Badge>
                  )}
                </div>
                <SheetTitle className="leading-snug">{selectedTicket.title}</SheetTitle>
              </SheetHeader>

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-5">
                {/* Metadata */}
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-0.5">
                      Assignee
                    </dt>
                    <dd>{displayAssignee(selectedTicket)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-0.5">
                      Due Date
                    </dt>
                    <dd>{formatDate(selectedTicket.dueDate)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-0.5">
                      Created
                    </dt>
                    <dd>{formatDate(selectedTicket.createdAt)}</dd>
                  </div>
                  {selectedTicket.resolvedAt && (
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-0.5">
                        Resolved
                      </dt>
                      <dd>{formatDate(selectedTicket.resolvedAt)}</dd>
                    </div>
                  )}
                </dl>

                {selectedTicket.description && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
                      Description
                    </p>
                    <p className="text-sm whitespace-pre-line">{selectedTicket.description}</p>
                  </div>
                )}

                {/* Action buttons — only for native tickets */}
                {canWrite && !selectedTicket.source && (
                  <>
                    <Separator />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditTicketId(selectedTicket.id);
                          setSelectedTicketId(null);
                        }}
                      >
                        Edit Ticket
                      </Button>
                      {selectedTicket.status !== "CLOSED" &&
                        selectedTicket.status !== "RESOLVED" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={actionPending}
                            onClick={() => handleClose(selectedTicket.id)}
                            className="gap-2"
                          >
                            {actionPending && (
                              <Loader2Icon className="h-4 w-4 animate-spin" />
                            )}
                            Close Ticket
                          </Button>
                        )}
                      {isOwner && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setDeleteTicketId(selectedTicket.id)}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </>
                )}

                <Separator />

                {/* Comments */}
                <div className="flex flex-col gap-3">
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    <MessageSquareIcon className="h-4 w-4" />
                    Comments ({selectedTicket.comments.length})
                  </p>

                  {selectedTicket.comments.length === 0 && (
                    <p className="text-xs text-muted-foreground">No comments yet.</p>
                  )}

                  {selectedTicket.comments.map((c) => (
                    <div
                      key={c.id}
                      className="flex flex-col gap-1 rounded-lg border bg-muted/30 px-3 py-2.5"
                    >
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {c.user.name ?? c.user.email}
                        </span>
                        <span>·</span>
                        <span>{formatTimeAgo(c.createdAt)}</span>
                      </div>
                      <p className="text-sm whitespace-pre-line">{c.body}</p>
                    </div>
                  ))}

                  {canWrite ? (
                    <div className="flex flex-col gap-2">
                      <Textarea
                        value={commentBody}
                        onChange={(e) => setCommentBody(e.target.value)}
                        placeholder="Add a comment…"
                        rows={2}
                        disabled={commentPending}
                      />
                      <Button
                        size="sm"
                        disabled={!commentBody.trim() || commentPending}
                        onClick={handleComment}
                        className="self-end gap-2"
                      >
                        {commentPending && (
                          <Loader2Icon className="h-4 w-4 animate-spin" />
                        )}
                        Submit
                      </Button>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      Read-only users cannot add comments.
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ------------------------------------------------------------------ */}
      {/* Delete confirm                                                       */}
      {/* ------------------------------------------------------------------ */}
      <AlertDialog
        open={!!deleteTicketId}
        onOpenChange={(open) => {
          if (!open) setDeleteTicketId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Ticket</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The ticket and all its comments will
              be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setDeleteTicketId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={actionPending}
              onClick={() => deleteTicketId && handleDelete(deleteTicketId)}
              className="gap-2"
            >
              {actionPending && <Loader2Icon className="h-4 w-4 animate-spin" />}
              Delete Ticket
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
