import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/auth/register/route";
import { makeRequest } from "../helpers";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("bcryptjs", () => ({
  default: { hash: vi.fn().mockResolvedValue("hashed_password") },
}));

import { prisma } from "@/lib/prisma";

beforeEach(() => vi.clearAllMocks());

describe("POST /api/auth/register", () => {
  it("zwraca 400 gdy brakuje pól", async () => {
    const res = await POST(makeRequest("POST", { name: "Jan" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Brakujące pola");
  });

  it("zwraca 400 gdy email już istnieje", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "u1" } as any);

    const res = await POST(makeRequest("POST", {
      fullName: "Jan",
      email: "jan@test.pl",
      password: "Haslo123",
    }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Email już zarejestrowany");
  });

  it("tworzy użytkownika i zwraca 201", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: "u1",
      email: "jan@test.pl",
    } as any);

    const res = await POST(makeRequest("POST", {
      fullName: "Jan",
      email: "jan@test.pl",
      password: "Haslo123",
    }));

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe("u1");
    expect(body.email).toBe("jan@test.pl");
    expect(prisma.user.create).toHaveBeenCalledOnce();
  });
});
