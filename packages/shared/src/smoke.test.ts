import { expect, it } from "vitest"
import { SHARED_VERSION } from "./index"

it("exports", () => expect(SHARED_VERSION).toBe(1))
