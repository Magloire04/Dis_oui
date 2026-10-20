import { describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { EN_TETES_SECURITE, enTetesSecurite } from "./securityHeaders";

describe("enTetesSecurite", () => {
  it("pose chaque en-tête de sécurité puis passe la main", () => {
    const setHeader = vi.fn();
    const suite = vi.fn();

    enTetesSecurite({} as Request, { setHeader } as unknown as Response, suite);

    for (const [nom, valeur] of Object.entries(EN_TETES_SECURITE)) {
      expect(setHeader).toHaveBeenCalledWith(nom, valeur);
    }
    expect(suite).toHaveBeenCalledTimes(1);
  });

  it("couvre HSTS, nosniff, cadrage et politique de référent", () => {
    expect(Object.keys(EN_TETES_SECURITE)).toEqual([
      "Strict-Transport-Security",
      "X-Content-Type-Options",
      "X-Frame-Options",
      "Referrer-Policy",
    ]);
  });

  it("n'engage pas les sous-domaines dans HSTS", () => {
    expect(EN_TETES_SECURITE["Strict-Transport-Security"]).not.toMatch(
      /includeSubDomains|preload/i
    );
  });
});
