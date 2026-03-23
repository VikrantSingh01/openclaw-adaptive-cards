# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 4.x     | Yes       |
| 3.x     | Security fixes only |
| < 3.0   | No        |

## Reporting a Vulnerability

If you discover a security vulnerability in openclaw-adaptive-cards, please report it responsibly:

1. **Do not** open a public GitHub issue
2. Email the details to the maintainer via [GitHub Security Advisories](https://github.com/VikrantSingh01/openclaw-adaptive-cards/security/advisories/new)
3. Include: description, reproduction steps, affected versions, and potential impact

You should receive a response within 48 hours. We will work with you to understand the issue and coordinate a fix before any public disclosure.

## Scope

This plugin generates Adaptive Card JSON and passes it through the OpenClaw gateway. Security concerns include:

- **Card JSON injection** — malicious content in card text fields
- **Action.OpenUrl targets** — URLs in card actions that could be phishing vectors
- **Template data injection** — `${expression}` expansion with untrusted data
- **PII in card payloads** — personal data embedded in card JSON

The plugin does not execute code, access external APIs, or store data persistently.
