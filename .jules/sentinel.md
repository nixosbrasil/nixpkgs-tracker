## 2024-07-25 - Improper Input Validation in PR Tracking

**Vulnerability:** An Improper Input Validation vulnerability was identified in the `/track/[pr]` route. User-provided input from the URL was used to construct a GitHub API request in the `getPR` function (`src/lib/utils.ts`) without proper sanitization.
**Learning:** The application did not sanitize the `pr` route parameter on the tracking page itself, assuming it would always be a valid integer. An attacker could have crafted a malicious URL to trigger unintended client-side behavior or errors by passing non-numeric input to the GitHub API fetch call.
**Prevention:** All user-controlled input, especially from URL parameters, must be strictly validated at the point of use. For this specific case, ensuring the PR number is parsed as an integer within the `onMount` lifecycle hook of the tracking page prevents non-numeric or malicious payloads from being processed.
