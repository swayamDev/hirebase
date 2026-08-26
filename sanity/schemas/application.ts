import { defineField, defineType } from "sanity";
import { STAGES } from "./stages";

export const application = defineType({
  name: "application",
  title: "Application",
  type: "document",
  fields: [
    defineField({
      name: "orgId",
      title: "Agency (Clerk org id)",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "organization",
      title: "Agency",
      type: "reference",
      to: [{ type: "organization" }],
      weak: true,
      description: "Synced from Clerk - orgId string remains the tenant key",
    }),
    defineField({
      name: "candidate",
      title: "Candidate",
      type: "reference",
      to: [{ type: "candidate" }],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "job",
      title: "Job",
      type: "reference",
      to: [{ type: "job" }],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "stage",
      title: "Stage",
      type: "string",
      options: { list: [...STAGES] },
      initialValue: "applied",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "appliedAt",
      title: "Applied at",
      type: "datetime",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "stageUpdatedAt",
      title: "Stage last updated",
      type: "datetime",
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: { candidate: "candidate.name", job: "job.title", stage: "stage" },
    prepare({ candidate, job, stage }) {
      return { title: `${candidate ?? "?"} → ${job ?? "?"}`, subtitle: stage };
    },
  },
});
