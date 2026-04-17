import { describe, it, expect, vi, beforeEach } from "vitest";
import { PATCH } from "@/app/api/user/route";
import { PATCH as PatchPassword } from "@/app/api/user/password/route";
import { makeRequest, SESSION } from "../helpers";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn().mockResolvedValue("hashed-password"),
  },
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const mockUser = {
  id: SESSION.user.id,
  name: "Jan Kowalski",
  email: SESSION.user.email,
  password: "hashed-old",
};

beforeEach(() => vi.clearAllMocks());

describe("PATCH /api/user", () => {
  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await PATCH(makeRequest("PATCH", { name: "Nowy" }));
    expect(res.status).toBe(401);
  });

  it("aktualizuje imię użytkownika", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.user.update).mockResolvedValue({
      id: SESSION.user.id,
      name: "Anna",
      email: SESSION.user.email,
    } as any);

    const res = await PATCH(makeRequest("PATCH", { name: "Anna" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("Anna");
  });

  it("zwraca 409 gdy nowy email jest już zajęty", async () => {
    vi.mocked(auth).mockResolvedValue({
      ...SESSION,
      user: { ...SESSION.user, email: "stary@test.com" },
    } as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "inny-user" } as any);

    const res = await PATCH(makeRequest("PATCH", { email: "zajety@test.com" }));
    expect(res.status).toBe(409);
  });

  it("aktualizuje ustawienia boolowskie", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.user.update).mockResolvedValue({
      id: SESSION.user.id,
      name: "Jan",
      email: SESSION.user.email,
    } as any);

    const res = await PATCH(makeRequest("PATCH", {
      allowClientComments: true,
      allowClientAcceptance: false,
      hideCommentCount: true,
    }));
    expect(res.status).toBe(200);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          allowClientComments: true,
          allowClientAcceptance: false,
          hideCommentCount: true,
        }),
      })
    );
  });

  it("aktualizuje navMode", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.user.update).mockResolvedValue({
      id: SESSION.user.id,
      name: "Jan",
      email: SESSION.user.email,
    } as any);

    const res = await PATCH(makeRequest("PATCH", { navMode: "sidebar" }));
    expect(res.status).toBe(200);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ navMode: "sidebar" }),
      })
    );
  });

  it("aktualizuje colorTheme na poprawną wartość", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.user.update).mockResolvedValue({
      id: SESSION.user.id,
      name: "Jan",
      email: SESSION.user.email,
    } as any);

    const res = await PATCH(makeRequest("PATCH", { colorTheme: "navy" }));
    expect(res.status).toBe(200);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ colorTheme: "navy" }),
      })
    );
  });

  it("zwraca 400 dla nieprawidłowego colorTheme", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);

    const res = await PATCH(makeRequest("PATCH", { colorTheme: "xyz" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/motyw/i);
  });

  it("zwraca 401 bez sesji dla colorTheme", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const res = await PATCH(makeRequest("PATCH", { colorTheme: "obsidian" }));
    expect(res.status).toBe(401);
  });
});

describe("PATCH /api/user/password", () => {
  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await PatchPassword(makeRequest("PATCH", { currentPassword: "old", newPassword: "new12345" }));
    expect(res.status).toBe(401);
  });

  it("zwraca 400 gdy konto nie ma hasła", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...mockUser, password: null } as any);

    const res = await PatchPassword(makeRequest("PATCH", { currentPassword: "old", newPassword: "new12345" }));
    expect(res.status).toBe(400);
  });

  it("zwraca 400 gdy aktualne hasło jest nieprawidłowe", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

    const res = await PatchPassword(makeRequest("PATCH", { currentPassword: "zle", newPassword: "new12345" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/nieprawidłowe/);
  });

  it("zwraca 400 gdy nowe hasło jest za krótkie", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

    const res = await PatchPassword(makeRequest("PATCH", { currentPassword: "stare", newPassword: "kr" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/8 znaków/);
  });

  it("zmienia hasło pomyślnie", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
    vi.mocked(prisma.user.update).mockResolvedValue(mockUser as any);

    const res = await PatchPassword(makeRequest("PATCH", { currentPassword: "stare", newPassword: "nowe-haslo-123" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { password: "hashed-password" },
      })
    );
  });
});
