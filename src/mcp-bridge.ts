/**
 * Bridge adapter between the plugin's API shapes and the adaptive-cards-mcp library.
 *
 * The MCP library functions operate on full card envelopes ({type: "AdaptiveCard", ...}).
 * The plugin passes body[] and actions[] separately. This module bridges the gap
 * so the plugin gets the MCP's full AJV validation, host adaptation, accessibility
 * checking, 21 layout patterns, card persistence, and preview generation without
 * duplicating any logic.
 *
 * v4.1.0: Added card persistence (storeCard/getCard), preview generation,
 * high-level tool handlers (generateCard, validateCardFull, optimizeCard, etc.),
 * pattern scoring, host support queries, and duplicate ID detection.
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
  findDuplicateIds as mcpFindDuplicateIds,
  scorePatterns as mcpScorePatterns,
  getAllHostSupport as mcpGetAllHostSupport,
  getHostSupport as mcpGetHostSupport,
  storeCard as mcpStoreCard,
  getCard as mcpGetCard,
  listCards as mcpListCards,
  writePreviewFile as mcpWritePreviewFile,
  generateCard as mcpGenerateCard,
  validateCardFull as mcpValidateCardFull,
  optimizeCard as mcpOptimizeCard,
  dataToCard as mcpDataToCard,
  suggestLayout as mcpSuggestLayout,
  findPatternByName as mcpFindPatternByName,
  findPatternByIntent as mcpFindPatternByIntent,
} from "adaptive-cards-mcp";
import type {
  HostApp,
  ValidationError,
  AccessibilityReport,
  HostCompatibilityReport,
  LayoutPattern,
  CardStats,
  GenerateCardInput,
  ValidateCardInput,
  OptimizeCardInput,
  DataToCardInput,
  SuggestLayoutInput,
  GenerateCardOutput,
  OptimizeCardOutput,
  SuggestLayoutOutput,
  CardIntent,
  HostVersionSupport,
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
  GenerateCardInput,
  ValidateCardInput,
  OptimizeCardInput,
  DataToCardInput,
  SuggestLayoutInput,
  GenerateCardOutput,
  OptimizeCardOutput,
  SuggestLayoutOutput,
  CardIntent,
  HostVersionSupport,
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
// Core bridge functions (body[] + actions[] → MCP envelope)
// ---------------------------------------------------------------------------

/**
 * Validate card body and actions using the MCP's full AJV schema validator.
 * Returns results in the plugin's expected shape.
 */
export function validateCard(body: unknown[], actions?: unknown[]): ValidationResult {
  const card = buildEnvelope(body, actions);
  const schemaResult = mcpValidateCard(card);
  const stats = mcpAnalyzeCard(card);

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

/**
 * Find duplicate element IDs in the card (important for ToggleVisibility targets).
 */
export function findDuplicateIds(body: unknown[], actions?: unknown[]): string[] {
  const card = buildEnvelope(body, actions);
  return mcpFindDuplicateIds(card);
}

// ---------------------------------------------------------------------------
// Pattern & host queries (no envelope needed)
// ---------------------------------------------------------------------------

/** Return all 21 layout patterns from the MCP library. */
export const getAllPatterns = mcpGetAllPatterns;

/** Score all patterns against a natural language description. */
export const scorePatterns = mcpScorePatterns;

/** Find a pattern by its name (e.g., "approval", "incident-alert"). */
export const findPatternByName = mcpFindPatternByName;

/** Find a pattern by intent enum (e.g., "approval", "notification"). */
export const findPatternByIntent = mcpFindPatternByIntent;

/** Return the host support map for all 7 hosts. */
export const getAllHostSupport = mcpGetAllHostSupport;

/** Return host support info for a single host. */
export function getHostSupport(host: string): HostVersionSupport {
  return mcpGetHostSupport(normalizeHostName(host));
}

/** Return the set of valid element type names. */
export const getValidElementTypes = mcpGetValidElementTypes;

/** Return the set of valid action type names. */
export const getValidActionTypes = mcpGetValidActionTypes;

// ---------------------------------------------------------------------------
// Card persistence (session-scoped, 30-min TTL)
// ---------------------------------------------------------------------------

/** Store a card and get a cardId back (format: "card-{uuid}"). */
export function storeCard(body: unknown[], actions?: unknown[], metadata?: Record<string, unknown>): string {
  const card = buildEnvelope(body, actions);
  return mcpStoreCard(card, metadata);
}

/** Retrieve a stored card by cardId. Returns null if expired or not found. */
export const getCard = mcpGetCard;

/** List all stored cards with metadata. */
export const listCards = mcpListCards;

// ---------------------------------------------------------------------------
// Preview generation
// ---------------------------------------------------------------------------

/** Write an HTML preview file to /tmp/ and return a file:// URL. */
export function writePreviewFile(body: unknown[], actions?: unknown[]): string {
  const card = buildEnvelope(body, actions);
  return mcpWritePreviewFile(card);
}

// ---------------------------------------------------------------------------
// High-level tool handlers (pass-through to MCP)
// ---------------------------------------------------------------------------

/** Generate a card from natural language description + optional data. */
export const generateCard = mcpGenerateCard;

/** Full validation with diagnostics: schema + accessibility + host compat + stats. */
export const validateCardFull = mcpValidateCardFull;

/** Optimize a card for accessibility, performance, compactness, modernity, or readability. */
export const optimizeCard = mcpOptimizeCard;

/** Convert structured data to an Adaptive Card (auto-selects Table/FactSet/Chart/List). */
export const dataToCard = mcpDataToCard;

/** Recommend the best layout pattern for a description. */
export const suggestLayout = mcpSuggestLayout;
