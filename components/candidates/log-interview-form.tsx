"use client";

import * as React from "react";
import { createInterview } from "@/lib/actions/interviews";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const OUTCOME_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "pass", label: "Pass" },
  { value: "fail", label: "Fail" },
] as const;

export type ApplicationOption = {
  id: string;
  jobTitle: string;
};

export function LogInterviewForm({
  candidateId,
  applications,
}: {
  candidateId: string;
  applications: ApplicationOption[];
}) {
  const [applicationId, setApplicationId] = React.useState<string | null>(
    applications.length === 1 ? applications[0].id : null,
  );
  const [outcome, setOutcome] = React.useState<string>("pending");
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  if (applications.length === 0) {
    return (
      <div className="rounded-lg border border-dashed px-6 py-6 text-center">
        <p className="text-muted-foreground text-[13px]">
          Add this candidate to a job before logging an interview.
        </p>
      </div>
    );
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    if (!applicationId) {
      setError("Choose an application.");
      return;
    }

    // datetime-local values carry no timezone - convert to a UTC instant here,
    // where the user's timezone is known, so the server never reinterprets it.
    const scheduledAtRaw = String(data.get("scheduledAt") ?? "");
    const scheduledAtDate = scheduledAtRaw ? new Date(scheduledAtRaw) : null;
    const scheduledAt =
      scheduledAtDate && !Number.isNaN(scheduledAtDate.getTime())
        ? scheduledAtDate.toISOString()
        : "";

    startTransition(async () => {
      const result = await createInterview({
        candidateId,
        applicationId,
        roundName: String(data.get("roundName") ?? ""),
        scheduledAt,
        interviewer: String(data.get("interviewer") ?? ""),
        feedbackText: String(data.get("feedbackText") ?? ""),
        outcome,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      form.reset();
      setOutcome("pending");
      setError(null);
    });
  }

  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle className="text-[13px] font-semibold">
          Log interview
        </CardTitle>
        <CardDescription className="text-[13px]">
          Record a round and its feedback for this candidate.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="interview-application">Application</Label>
              <Select
                value={applicationId}
                onValueChange={(value) => setApplicationId(value)}
              >
                <SelectTrigger id="interview-application" className="w-full">
                  <SelectValue placeholder="Select an application" />
                </SelectTrigger>
                <SelectContent>
                  {applications.map((application) => (
                    <SelectItem key={application.id} value={application.id}>
                      {application.jobTitle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="interview-round">Round</Label>
              <Input
                id="interview-round"
                name="roundName"
                placeholder="Technical interview"
                required
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="interview-scheduled">Scheduled at</Label>
              <Input
                id="interview-scheduled"
                name="scheduledAt"
                type="datetime-local"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="interview-interviewer">Interviewer</Label>
              <Input id="interview-interviewer" name="interviewer" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="interview-outcome">Outcome</Label>
              <Select
                value={outcome}
                onValueChange={(value) => setOutcome(value ?? "pending")}
              >
                <SelectTrigger id="interview-outcome" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OUTCOME_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="interview-feedback">Feedback</Label>
            <Textarea
              id="interview-feedback"
              name="feedbackText"
              className="min-h-24"
              placeholder="The interviewer's written debrief"
            />
            <p className="text-muted-foreground text-xs">
              Written debriefs are searchable by the AI agent later - the
              sharper the notes, the better the recall.
            </p>
          </div>

          {error && (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          )}

          <div>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? "Logging…" : "Log interview"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
