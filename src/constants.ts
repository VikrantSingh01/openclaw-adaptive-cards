/**
 * Marker tags used to embed Adaptive Card JSON inside tool result text.
 *
 * Mobile apps extract the card JSON between these markers and render it natively.
 * Channels that don't understand the markers show the fallback text.
 *
 * @example
 * ```
 * Fallback text here
 *
 * <!--adaptive-card-->{"type":"AdaptiveCard","version":"1.5","body":[...]}<!--/adaptive-card-->
 * ```
 */
export const CARD_OPEN_TAG = "<!--adaptive-card-->";
export const CARD_CLOSE_TAG = "<!--/adaptive-card-->";
export const DATA_OPEN_TAG = "<!--adaptive-card-data-->";
export const DATA_CLOSE_TAG = "<!--/adaptive-card-data-->";

/** Shown when the agent omits fallback_text and the card body yields no extractable text. */
export const DEFAULT_FALLBACK = "(Interactive card \u2014 open on a supported client to view.)";

/** Adaptive Cards schema version used by this plugin. */
export const AC_VERSION = "1.6";
