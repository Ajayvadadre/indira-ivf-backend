/**
 * INTENTIONAL VAPT DEMO — common "ignored in code review" secret patterns.
 * GitLeaks/Semgrep target these; values are fake and safe to commit.
 * Remove this file before real production hardening.
 */
export const VAPT_DEMO_SECRETS = {
  internalApiToken: "7f3a9c2e1b8d4f6a0c5e9d2b7f1a4c8e9d0b3a6f7c2e9d1b",
  legacyDbPassword: "Prod_Legacy_DB_P@ss_NotReal_2024",
  webhookSigningKey: "whsec_demo_pipeline_only_not_a_real_signing_key",
  jwtFallbackSecret: "do-not-use-this-jwt-secret-in-production-demo",
} as const;
