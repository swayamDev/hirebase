import { defineField, defineType } from "sanity";

/**
 * One document per org per UTC day, incremented once per AI agent message.
 * Document _id convention: `agent-usage.<orgId>.<YYYY-MM-DD>` - derivable
 * without a lookup, same pattern as `organization`'s `org.<clerkOrgId>`.
 * Powers lib/agent-rate-limit.ts. Intentionally NOT tenant-critical data -
 * this is a cost-control safety net, not a business record, so it's fine
 * for it to be approximate under heavy concurrency (see that module's
 * comments for the specific tradeoff).
 */
export const agentUsage = defineType({
  name: "agentUsage",
  title: "AI agent usage",
  type: "document",
  fields: [
    defineField({
      name: "orgId",
      title: "Clerk org id",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "date",
      title: "Date (UTC, YYYY-MM-DD)",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "count",
      title: "Messages sent",
      type: "number",
      initialValue: 0,
      validation: (rule) => rule.required().min(0),
    }),
  ],
  preview: {
    select: { title: "orgId", subtitle: "date" },
  },
});
