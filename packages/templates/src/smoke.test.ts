import { expect, it } from "vitest"
import { TEMPLATES_VERSION } from "./index"

it("exports", () => expect(TEMPLATES_VERSION).toBe(1))
