import { describe, expect, test } from "vitest"
import { getAgeInMonths, getWhoGrowthReferenceAtAge } from "@/lib/whoGrowth"

describe("références de croissance OMS", () => {
  test("retrouve les valeurs de naissance publiées pour les garçons", () => {
    const weight = getWhoGrowthReferenceAtAge("weight", "boy", 0)
    expect(weight?.lower).toBeCloseTo(2.459, 2)
    expect(weight?.median).toBeCloseTo(3.346, 2)
    expect(weight?.upper).toBeCloseTo(4.419, 2)
  })

  test("retrouve les valeurs de naissance publiées pour la taille des filles", () => {
    const height = getWhoGrowthReferenceAtAge("height", "girl", 0)
    expect(height?.lower).toBeCloseTo(45.422, 2)
    expect(height?.median).toBeCloseTo(49.148, 2)
    expect(height?.upper).toBeCloseTo(52.873, 2)
  })

  test("interpole jusqu’à 5 ans et s’arrête ensuite", () => {
    expect(getWhoGrowthReferenceAtAge("weight", "girl", 18.5)).not.toBeNull()
    expect(getWhoGrowthReferenceAtAge("height", "boy", 60)).not.toBeNull()
    expect(getWhoGrowthReferenceAtAge("height", "boy", 60.01)).toBeNull()
  })

  test("calcule l’âge depuis la date de naissance", () => {
    expect(getAgeInMonths("2026-01-01", "2026-04-01T12:00:00.000Z")).toBeCloseTo(2.96, 1)
    expect(getAgeInMonths("date-invalide", "2026-04-01T12:00:00.000Z")).toBeNull()
  })
})
