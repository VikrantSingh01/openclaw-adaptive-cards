---
description: "Card templates and patterns for the adaptive_card tool"
---

# Adaptive Card Templates

Use the `adaptive_card` tool to render structured content inline in chat. Below are ready-to-use patterns.

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
    { "type": "Action.Submit", "title": "Deploy to staging", "data": { "choice": "staging" } },
    { "type": "Action.Submit", "title": "Run tests first", "data": { "choice": "test" } },
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
    { "type": "Action.Submit", "title": "Approve", "data": { "review": "approved" } },
    { "type": "Action.Submit", "title": "Request Changes", "data": { "review": "changes" } },
    { "type": "Action.OpenUrl", "title": "View Full Size", "url": "https://example.com/screenshot.png" }
  ]
}
```

## Tips

- Use `weight: "Bolder"` on the first TextBlock for visual hierarchy
- Keep FactSets under 10 facts for best display on Slack (splits into multiple blocks)
- Use `isSubtle: true` for secondary/helper text
- Always include meaningful data in `Action.Submit` so the action is self-describing
- For channels without card support, the fallback text is auto-generated from the card body
