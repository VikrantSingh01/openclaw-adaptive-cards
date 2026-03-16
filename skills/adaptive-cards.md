---
description: "Card templates and patterns for the adaptive_card tool"
---

# Adaptive Card Templates

Use the `adaptive_card` tool to render structured content inline in chat. Below are ready-to-use patterns for Adaptive Cards v1.6.

## Status Dashboard

Show key-value status information with a bold header.

```json
{
  "body": [
    { "type": "TextBlock", "text": "Project Status", "weight": "Bolder", "size": "Large" },
    { "type": "FactSet", "facts": [
      { "title": "Build", "value": "Passing" },
      { "title": "Tests", "value": "142/142" },
      { "title": "Coverage", "value": "87%" },
      { "title": "Last Deploy", "value": "2 hours ago" }
    ]}
  ]
}
```

## Choice Picker

Present options the user can tap instead of typing.

```json
{
  "body": [
    { "type": "TextBlock", "text": "How would you like to proceed?", "weight": "Bolder" },
    { "type": "TextBlock", "text": "Choose one of the following options:", "isSubtle": true }
  ],
  "actions": [
    { "type": "Action.Execute", "title": "Deploy to staging", "verb": "deploy", "data": { "choice": "staging" } },
    { "type": "Action.Execute", "title": "Run tests first", "verb": "test", "data": { "choice": "test" } },
    { "type": "Action.Submit", "title": "Cancel", "data": { "choice": "cancel" } }
  ]
}
```

## Data Table

Display tabular data with a header row.

```json
{
  "body": [
    { "type": "TextBlock", "text": "API Endpoints", "weight": "Bolder", "size": "Medium" },
    {
      "type": "Table",
      "columns": [
        { "width": 1 },
        { "width": 1 },
        { "width": 1 }
      ],
      "rows": [
        { "cells": [
          { "items": [{ "type": "TextBlock", "text": "Endpoint", "weight": "Bolder" }] },
          { "items": [{ "type": "TextBlock", "text": "Method", "weight": "Bolder" }] },
          { "items": [{ "type": "TextBlock", "text": "Status", "weight": "Bolder" }] }
        ]},
        { "cells": [
          { "items": [{ "type": "TextBlock", "text": "/api/users" }] },
          { "items": [{ "type": "TextBlock", "text": "GET" }] },
          { "items": [{ "type": "TextBlock", "text": "200 OK" }] }
        ]},
        { "cells": [
          { "items": [{ "type": "TextBlock", "text": "/api/orders" }] },
          { "items": [{ "type": "TextBlock", "text": "POST" }] },
          { "items": [{ "type": "TextBlock", "text": "201 Created" }] }
        ]}
      ]
    }
  ]
}
```

## Progress Tracker

Show step-by-step progress with status indicators.

```json
{
  "body": [
    { "type": "TextBlock", "text": "Deployment Progress", "weight": "Bolder", "size": "Medium" },
    { "type": "FactSet", "facts": [
      { "title": "1. Build", "value": "Done" },
      { "title": "2. Test", "value": "Done" },
      { "title": "3. Stage", "value": "In Progress" },
      { "title": "4. Deploy", "value": "Pending" },
      { "title": "5. Verify", "value": "Pending" }
    ]}
  ]
}
```

## Comparison Layout

Side-by-side comparison using columns.

```json
{
  "body": [
    { "type": "TextBlock", "text": "Plan Comparison", "weight": "Bolder", "size": "Medium" },
    {
      "type": "ColumnSet",
      "columns": [
        {
          "width": "stretch",
          "items": [
            { "type": "TextBlock", "text": "Free", "weight": "Bolder" },
            { "type": "FactSet", "facts": [
              { "title": "Storage", "value": "5 GB" },
              { "title": "Users", "value": "1" },
              { "title": "Support", "value": "Community" }
            ]}
          ]
        },
        {
          "width": "stretch",
          "items": [
            { "type": "TextBlock", "text": "Pro", "weight": "Bolder" },
            { "type": "FactSet", "facts": [
              { "title": "Storage", "value": "100 GB" },
              { "title": "Users", "value": "10" },
              { "title": "Support", "value": "Priority" }
            ]}
          ]
        }
      ]
    }
  ]
}
```

## Simple Form

Collect user input with text fields and a submit button.

```json
{
  "body": [
    { "type": "TextBlock", "text": "Quick Feedback", "weight": "Bolder", "size": "Medium" },
    { "type": "Input.Text", "id": "name", "label": "Your name", "placeholder": "Enter your name" },
    { "type": "Input.Text", "id": "feedback", "label": "Feedback", "placeholder": "What can we improve?", "isMultiline": true },
    { "type": "Input.ChoiceSet", "id": "rating", "label": "Rating", "choices": [
      { "title": "Excellent", "value": "5" },
      { "title": "Good", "value": "4" },
      { "title": "Average", "value": "3" },
      { "title": "Poor", "value": "2" }
    ]}
  ],
  "actions": [
    { "type": "Action.Submit", "title": "Submit Feedback", "data": { "action": "submit_feedback" } }
  ]
}
```

## Image with Actions

Display an image with contextual action buttons.

```json
{
  "body": [
    { "type": "TextBlock", "text": "Screenshot Review", "weight": "Bolder" },
    { "type": "Image", "url": "https://example.com/screenshot.png", "altText": "App screenshot", "size": "Large" },
    { "type": "TextBlock", "text": "Does this look correct?", "isSubtle": true }
  ],
  "actions": [
    { "type": "Action.Execute", "title": "Approve", "verb": "review_approve", "data": { "review": "approved" } },
    { "type": "Action.Execute", "title": "Request Changes", "verb": "review_change", "data": { "review": "changes" } },
    { "type": "Action.OpenUrl", "title": "View Full Size", "url": "https://example.com/screenshot.png" }
  ]
}
```

## Approval Workflow

Multi-step approval with Action.Execute for server-side card refresh.

```json
{
  "body": [
    {
      "type": "ColumnSet",
      "columns": [
        {
          "width": "auto",
          "items": [
            { "type": "Image", "url": "https://example.com/avatar.png", "altText": "Requester avatar", "size": "Small", "style": "Person" }
          ]
        },
        {
          "width": "stretch",
          "items": [
            { "type": "TextBlock", "text": "Expense Approval Request", "weight": "Bolder", "size": "Medium" },
            { "type": "TextBlock", "text": "Submitted by Jane Smith", "isSubtle": true, "spacing": "None" }
          ]
        }
      ]
    },
    { "type": "FactSet", "facts": [
      { "title": "Amount", "value": "$2,450.00" },
      { "title": "Category", "value": "Travel" },
      { "title": "Date", "value": "2024-03-15" },
      { "title": "Description", "value": "Client visit to Seattle office" }
    ]},
    { "type": "Input.Text", "id": "comment", "label": "Comment (optional)", "placeholder": "Add a note...", "isMultiline": true }
  ],
  "actions": [
    { "type": "Action.Execute", "title": "Approve", "verb": "expense_approve", "data": { "decision": "approved" } },
    { "type": "Action.Execute", "title": "Reject", "verb": "expense_reject", "data": { "decision": "rejected" } },
    { "type": "Action.ShowCard", "title": "Request Info", "card": {
      "type": "AdaptiveCard",
      "body": [
        { "type": "Input.Text", "id": "question", "label": "What information do you need?", "isMultiline": true }
      ],
      "actions": [
        { "type": "Action.Execute", "title": "Send", "verb": "expense_info", "data": { "decision": "info_needed" } }
      ]
    }}
  ]
}
```

## Incident Alert

Severity-based incident notification with escalation actions.

```json
{
  "body": [
    {
      "type": "Container",
      "style": "attention",
      "items": [
        { "type": "TextBlock", "text": "SEV-2 Incident", "weight": "Bolder", "size": "Large", "color": "Attention" }
      ]
    },
    { "type": "TextBlock", "text": "API latency exceeding SLA thresholds", "weight": "Bolder" },
    { "type": "FactSet", "facts": [
      { "title": "Service", "value": "Payment Gateway" },
      { "title": "Region", "value": "US-East" },
      { "title": "Impact", "value": "~2,500 users affected" },
      { "title": "Started", "value": "14:23 UTC" },
      { "title": "Duration", "value": "12 minutes" }
    ]}
  ],
  "actions": [
    { "type": "Action.Execute", "title": "Acknowledge", "verb": "incident_ack", "data": { "action": "acknowledge" } },
    { "type": "Action.Execute", "title": "Escalate", "verb": "incident_escalate", "data": { "action": "escalate" } },
    { "type": "Action.OpenUrl", "title": "Dashboard", "url": "https://grafana.example.com/d/api-latency" }
  ]
}
```

## Calendar Event

Meeting card with attendees and join/decline actions.

```json
{
  "body": [
    { "type": "TextBlock", "text": "Sprint Planning", "weight": "Bolder", "size": "Medium" },
    { "type": "ColumnSet", "columns": [
      {
        "width": "auto",
        "items": [
          { "type": "TextBlock", "text": "Mar", "horizontalAlignment": "Center", "isSubtle": true },
          { "type": "TextBlock", "text": "18", "horizontalAlignment": "Center", "weight": "Bolder", "size": "ExtraLarge" }
        ]
      },
      {
        "width": "stretch",
        "items": [
          { "type": "TextBlock", "text": "Tuesday, 10:00 AM - 11:00 AM", "weight": "Bolder" },
          { "type": "TextBlock", "text": "Conference Room B / Teams", "isSubtle": true, "spacing": "None" }
        ]
      }
    ]},
    { "type": "TextBlock", "text": "Attendees: Alice, Bob, Charlie, Diana", "isSubtle": true }
  ],
  "actions": [
    { "type": "Action.Execute", "title": "Join Meeting", "verb": "meeting_join", "data": { "action": "join" } },
    { "type": "Action.Execute", "title": "Tentative", "verb": "meeting_tentative", "data": { "action": "tentative" } },
    { "type": "Action.Execute", "title": "Decline", "verb": "meeting_decline", "data": { "action": "decline" } }
  ]
}
```

## Profile Card

User or contact profile with avatar and details.

```json
{
  "body": [
    {
      "type": "ColumnSet",
      "columns": [
        {
          "width": "auto",
          "items": [
            { "type": "Image", "url": "https://example.com/photo.jpg", "altText": "Profile photo", "size": "Large", "style": "Person" }
          ]
        },
        {
          "width": "stretch",
          "items": [
            { "type": "TextBlock", "text": "Sarah Chen", "weight": "Bolder", "size": "Large" },
            { "type": "TextBlock", "text": "Principal Engineer, Platform Team", "isSubtle": true, "spacing": "None" },
            { "type": "TextBlock", "text": "Redmond, WA", "isSubtle": true, "spacing": "None" }
          ]
        }
      ]
    },
    { "type": "FactSet", "facts": [
      { "title": "Email", "value": "sarah.chen@example.com" },
      { "title": "Teams", "value": "Platform, SRE, Architecture" },
      { "title": "Timezone", "value": "PST (UTC-8)" }
    ]}
  ],
  "actions": [
    { "type": "Action.OpenUrl", "title": "View Profile", "url": "https://example.com/people/sarah-chen" },
    { "type": "Action.Execute", "title": "Send Message", "verb": "profile_message", "data": { "userId": "sarah.chen" } }
  ]
}
```

## Pull Request Review

Code review card with file stats and reviewer actions.

```json
{
  "body": [
    {
      "type": "ColumnSet",
      "columns": [
        {
          "width": "auto",
          "items": [
            { "type": "Image", "url": "https://example.com/avatar.png", "altText": "Author", "size": "Small", "style": "Person" }
          ]
        },
        {
          "width": "stretch",
          "items": [
            { "type": "TextBlock", "text": "feat: add host compatibility checking", "weight": "Bolder" },
            { "type": "TextBlock", "text": "alice opened PR #142 into main from feature/host-compat", "isSubtle": true, "spacing": "None" }
          ]
        }
      ]
    },
    { "type": "FactSet", "facts": [
      { "title": "Files changed", "value": "8" },
      { "title": "Additions", "value": "+342" },
      { "title": "Deletions", "value": "-28" },
      { "title": "Checks", "value": "All passing" },
      { "title": "Reviewers", "value": "Bob, Charlie" }
    ]}
  ],
  "actions": [
    { "type": "Action.Execute", "title": "Approve", "verb": "pr_approve", "data": { "action": "approve", "pr": 142 } },
    { "type": "Action.Execute", "title": "Request Changes", "verb": "pr_changes", "data": { "action": "request_changes", "pr": 142 } },
    { "type": "Action.OpenUrl", "title": "View Diff", "url": "https://github.com/example/repo/pull/142" }
  ]
}
```

## Tips

- Use `weight: "Bolder"` on the first TextBlock for visual hierarchy
- Keep FactSets under 10 facts for best display
- Use `isSubtle: true` for secondary/helper text
- Prefer `Action.Execute` with `verb` for server-side workflows that need card refresh
- Use `Action.Submit` for simpler client-side data collection
- Always include meaningful `data` in actions so the action is self-describing
- Add `altText` to all Images for accessibility
- Add `label` and `id` to all Input elements for accessibility and data binding
- For channels without card support, fallback text is auto-generated from the card body
- Cards are automatically adapted for host compatibility (e.g., Teams, Outlook element limits)
