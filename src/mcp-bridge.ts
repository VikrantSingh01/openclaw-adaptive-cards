/**
 * Bridge adapter between the plugin's API shapes and the adaptive-cards-mcp library.
 *
 * The MCP library functions operate on full card envelopes ({type: "AdaptiveCard", ...}).
 * The plugin passes body[] and actions[] separately. This module bridges the gap
 * so the plugin gets the MCP's full AJV validation, host adaptation, accessibility
 * checking, and 21 layout patterns without duplicating any logic.
 */

import {
  validateCard as mcpValidateCard,
  checkHostCompatibility as mcpCheckHostCompat,
  adaptCardForHost as mcpAdaptCardForHost,
  checkAccessibility as mcpCheckAccessibility,
  analyzeCard as mcpAnalyzeCard,
  getValidElementTypes as mcpGetValidElementTypes,
  getValidActionTypes as mcpGetValidActionTypes,
  getAllPatterns as mcpGetAllPatterns,
} from "adaptive-cards-mcp";
import type {
  HostApp,
  ValidationError,
  AccessibilityReport,
  HostCompatibilityReport,
  LayoutPattern,
  CardStats,
} from "adaptive-cards-mcp";
import { AC_VERSION } from "./constants.js";

// Re-export MCP types for consumers
export type {
  HostApp,
  ValidationError,
  AccessibilityReport,
  HostCompatibilityReport,
  LayoutPattern,
  CardStats,
} from "adaptive-cards-mcp";

// ---------------------------------------------------------------------------
// Plugin-shaped result types (backward compatible with v3 API)
// ---------------------------------------------------------------------------

export interface ValidationIssue {
  severity: "error" | "warning";
  message: string;
  path?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  elementCount: number;
  actionCount: number;
}

export interface CompatibilityIssue {
  severity: "error" | "warning";
  message: string;
  suggestion?: string;
}

export interface CompatibilityResult {
  host: string;
  compatible: boolean;
  issues: CompatibilityIssue[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Wrap body + actions into a full Adaptive Card envelope. */
function buildEnvelope(body: unknown[], actions?: unknown[]): Record<string, unknown> {
  const card: Record<string, unknown> = {
    type: "AdaptiveCard",
    version: AC_VERSION,
    body,
  };
  if (Array.isArray(actions) && actions.length > 0) {
    card.actions = actions;
  }
  return card;
}

/** Map plugin host names to MCP HostApp type. */
function normalizeHostName(host: string): HostApp {
  const h = host.toLowerCase();
  if (h === "viva") return "viva-connections";
  const valid: HostApp[] = ["teams", "outlook", "webchat", "windows", "viva-connections", "webex", "generic"];
  return valid.includes(h as HostApp) ? (h as HostApp) : "generic";
}

// ---------------------------------------------------------------------------
// Bridge functions
// ---------------------------------------------------------------------------

/**
 * Validate card body and actions using the MCP's full AJV schema validator.
 * Returns results in the plugin's expected shape.
 */
export function validateCard(body: unknown[], actions?: unknown[]): ValidationResult {
  const card = buildEnvelope(body, actions);
  const schemaResult = mcpValidateCard(card);
  const stats = mcpAnalyzeCard(card);

  // Map MCP ValidationError[] (which has severity: error|warning|info) to plugin shape
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  for (const err of schemaResult.errors) {
    const issue: ValidationIssue = {
      severity: err.severity === "error" ? "error" : "warning",
      message: err.message,
      path: err.path || undefined,
    };
    if (err.severity === "error") {
      errors.push(issue);
    } else {
      warnings.push(issue);
    }
  }

  return {
    valid: schemaResult.valid,
    errors,
    warnings,
    elementCount: stats.elementCount,
    actionCount: stats.actionTypes.length,
  };
}

/**
 * Check card compatibility with a specific host using the MCP's host support map.
 */
export function checkHostCompatibility(
  body: unknown[],
  actions: unknown[] | undefined,
  host: string,
): CompatibilityResult {
  const card = buildEnvelope(body, actions);
  const hostApp = normalizeHostName(host);
  const result = mcpCheckHostCompat(card, hostApp);

  const issues: CompatibilityIssue[] = result.unsupportedElements.map((el) => ({
    severity: "warning" as const,
    message: `${el.type} is not supported: ${el.reason}`,
    suggestion: `Remove or replace '${el.type}' at ${el.path}`,
  }));

  return {
    host: hostApp,
    compatible: result.supported,
    issues,
  };
}

/**
 * Adapt card for a specific host, replacing unsupported elements.
 * Returns adapted body and actions extracted from the MCP's full card response.
 */
export function adaptCardForHost(
  body: unknown[],
  actions: unknown[] | undefined,
  host: string,
): { body: unknown[]; actions: unknown[] | undefined; changes: string[]; warnings: string[] } {
  const card = buildEnvelope(body, actions);
  const hostApp = normalizeHostName(host);
  const result = mcpAdaptCardForHost(card, hostApp);

  const adapted = result.card;
  return {
    body: (adapted.body as unknown[]) ?? [],
    actions: adapted.actions as unknown[] | undefined,
    changes: result.changes,
    warnings: result.warnings,
  };
}

/**
 * Check card accessibility using the MCP's accessibility checker.
 * Returns a score (0-100) and list of issues.
 */
export function checkCardAccessibility(body: unknown[], actions?: unknown[]): AccessibilityReport {
  const card = buildEnvelope(body, actions);
  return mcpCheckAccessibility(card);
}

/**
 * Get card statistics using the MCP's card analyzer.
 */
export function analyzeCard(body: unknown[], actions?: unknown[]): CardStats {
  const card = buildEnvelope(body, actions);
  return mcpAnalyzeCard(card);
}

// ---------------------------------------------------------------------------
// Direct re-exports from MCP (no bridging needed)
// ---------------------------------------------------------------------------

export const getValidElementTypes = mcpGetValidElementTypes;
export const getValidActionTypes = mcpGetValidActionTypes;
export const getAllPatterns = mcpGetAllPatterns;
