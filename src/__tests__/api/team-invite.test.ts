/**
 * Tests for the team member invite flow:
 *  - GET  /api/team/invite           — lista zaproszeń PENDING + członkowie
 *  - POST /api/team/invite           — wysyłanie zaproszenia
 *  - DELETE /api/team/members/[id]   — usuwanie członka lub cofanie zaproszenia
 *  - GET  /api/invite/[token]        — walidacja tokenu zaproszenia (publiczny)
 *  - POST /api/invite/[token]        — akceptacja zaproszenia + ustawienie hasła
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeRequest, makeParams } from "../helpers";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    invitation: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));
vi.mock("@/lib/pusher", () => ({ pusherServer: { trigger: vi.fn() } }));
vi.mock("@/lib/workspace", () => ({ getWorkspaceUserId: vi.fn().mockReturnValue("user-1") }));
vi.mock("@/lib/email", () => ({ sendInvitationEmail: vi.fn().mockResolvedValue(undefined) }));
vi.mock("bcryptjs", () => ({
  default: { hash: vi.fn().mockResolvedValue("hashed_pw"), compare: vi.fn() },
  hash: vi.fn().mockResolvedValue("hashed_pw"),
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";
import { sendInvitationEmail } from "@/lib/email";
import { GET as teamInviteGET, POST as teamInvitePOST } from "@/app/api/team/invite/route";
import { DELETE as memberDELETE } from "@/app/api/team/members/[id]/route";
import { GET as inviteTokenGET, POST as inviteTokenPOST } from "@/app/api/invite/[token]/route";

const SESSION = { user: { id: "user-1", email: "designer@test.com" } };

const mockInvitation = {
  id: "inv-1",
  email: "member@example.com",
  designerId: "user-1",
  status: "PENDING",
  token: "abc-token-123",
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  designer: { name: "Projektant", email: "designer@test.com" },
};

beforeEach(() => vi.clearAllMocks());

// ─── GET /api/team/invite ─────────────────────────────────────────────────────

describe("GET /api/team/invite — lista zaproszeń i członków", () => {
  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await teamInviteGET();
    expect(res.status).toBe(401);
  });

  it("zwraca listę zaproszeń PENDING i członków", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.invitation.findMany).mockResolvedValue([mockInvitation] as any);
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: "member-1", email: "member@example.com", name: "Jan Nowak", createdAt: new Date() },
    ] as any);

    const res = await teamInviteGET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.invitations).toHaveLength(1);
    expect(body.invitations[0].email).toBe("member@example.com");
    expect(body.members).toHaveLength(1);
    expect(body.members[0].name).toBe("Jan Nowak");
  });

  it("zwraca puste listy gdy brak zaproszeń i członków", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.invitation.findMany).mockResolvedValue([]);
    vi.mocked(prisma.user.findMany).mockResolvedValue([]);

    const res = await teamInviteGET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.invitations).toHaveLength(0);
    expect(body.members).toHaveLength(0);
  });
});

// ─── POST /api/team/invite ────────────────────────────────────────────────────

describe("POST /api/team/invite — wysyłanie zaproszenia", () => {
  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await teamInvitePOST(makeRequest("POST", { email: "test@example.com" }));
    expect(res.status).toBe(401);
  });

  it("zwraca 400 gdy brak emaila", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    const res = await teamInvitePOST(makeRequest("POST", {}));
    expect(res.status).toBe(400);
  });

  it("zwraca 409 gdy użytkownik z tym emailem już istnieje", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    // owner = agencja (plan allows invitations)
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce({ isFree: false, subscription: { plan: "agencja", status: "active" } } as any)
      .mockResolvedValueOnce({ id: "existing-user" } as any);

    const res = await teamInvitePOST(makeRequest("POST", { email: "existing@example.com" }));
    expect(res.status).toBe(409);
  });

  it("zwraca 409 gdy zaproszenie do tego emaila już jest PENDING", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce({ isFree: false, subscription: { plan: "agencja", status: "active" } } as any)
      .mockResolvedValueOnce(null);
    vi.mocked(prisma.invitation.findFirst).mockResolvedValue(mockInvitation as any);

    const res = await teamInvitePOST(makeRequest("POST", { email: "member@example.com" }));
    expect(res.status).toBe(409);
  });

  it("tworzy zaproszenie i wysyła email (plan agencja)", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce({ isFree: false, subscription: { plan: "agencja", status: "active" } } as any)
      .mockResolvedValueOnce(null) // brak istniejącego usera
      .mockResolvedValueOnce({ name: "Projektant", email: "designer@test.com" } as any); // designer info
    vi.mocked(prisma.invitation.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.invitation.create).mockResolvedValue(mockInvitation as any);

    const res = await teamInvitePOST(makeRequest("POST", { email: "newmember@example.com" }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.invitation).toBeDefined();

    expect(vi.mocked(sendInvitationEmail)).toHaveBeenCalledWith(
      expect.objectContaining({ to: "newmember@example.com", token: mockInvitation.token })
    );
  });

  it("normalizuje email do lowercase przed zapisem", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce({ isFree: false, subscription: { plan: "studio", status: "active" } } as any)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ name: "Projektant", email: "designer@test.com" } as any);
    vi.mocked(prisma.user.count).mockResolvedValue(0);
    vi.mocked(prisma.invitation.count).mockResolvedValue(0);
    vi.mocked(prisma.invitation.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.invitation.create).mockResolvedValue({ ...mockInvitation, email: "member@example.com" } as any);

    await teamInvitePOST(makeRequest("POST", { email: "MEMBER@EXAMPLE.COM" }));

    const createCall = vi.mocked(prisma.invitation.create).mock.calls[0][0];
    expect(createCall.data.email).toBe("member@example.com");
  });
});

// ─── DELETE /api/team/members/[id] ───────────────────────────────────────────

describe("DELETE /api/team/members/[id] — usuwanie członka / cofanie zaproszenia", () => {
  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await memberDELETE(makeRequest("DELETE"), makeParams({ id: "inv-1" }));
    expect(res.status).toBe(401);
  });

  it("cofa zaproszenie gdy ID pasuje do invitation", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.invitation.findFirst).mockResolvedValue(mockInvitation as any);
    vi.mocked(prisma.invitation.delete).mockResolvedValue({} as any);

    const res = await memberDELETE(makeRequest("DELETE"), makeParams({ id: "inv-1" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(vi.mocked(prisma.invitation.delete)).toHaveBeenCalledWith({ where: { id: "inv-1" } });
    expect(vi.mocked(prisma.user.update)).not.toHaveBeenCalled();
  });

  it("usuwa członka (odłącza od workspace) gdy ID pasuje do user", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.invitation.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.user.findFirst).mockResolvedValue({
      id: "member-1", email: "member@example.com", ownerId: "user-1",
    } as any);
    vi.mocked(prisma.user.update).mockResolvedValue({} as any);

    const res = await memberDELETE(makeRequest("DELETE"), makeParams({ id: "member-1" }));
    expect(res.status).toBe(200);

    const updateCall = vi.mocked(prisma.user.update).mock.calls[0][0];
    expect(updateCall.data.ownerId).toBeNull();
  });

  it("zwraca 404 gdy ID nie pasuje ani do invitation, ani do usera", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.invitation.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

    const res = await memberDELETE(makeRequest("DELETE"), makeParams({ id: "nieznane-id" }));
    expect(res.status).toBe(404);
  });
});

// ─── POST /api/team/invite — ograniczenia planów ──────────────────────────────

describe("POST /api/team/invite — ograniczenia planów subskrypcji", () => {
  it("blokuje zaproszenie dla planu standard (403)", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      isFree: false,
      subscription: { plan: "standard", status: "active" },
    } as any);

    const res = await teamInvitePOST(makeRequest("POST", { email: "test@example.com" }));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/plan/i);
  });

  it("blokuje zaproszenie gdy brak aktywnej subskrypcji i isFree=false (403)", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      isFree: false,
      subscription: null,
    } as any);

    const res = await teamInvitePOST(makeRequest("POST", { email: "test@example.com" }));
    expect(res.status).toBe(403);
  });

  it("blokuje zaproszenie gdy subskrypcja studio jest nieaktywna (cancelled)", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      isFree: false,
      subscription: { plan: "studio", status: "cancelled" },
    } as any);

    const res = await teamInvitePOST(makeRequest("POST", { email: "test@example.com" }));
    expect(res.status).toBe(403);
  });

  it("zezwala na zaproszenie dla planu studio gdy limit nie przekroczony", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce({ isFree: false, subscription: { plan: "studio", status: "active" } } as any)
      .mockResolvedValueOnce(null) // brak istniejącego usera
      .mockResolvedValueOnce({ name: "Projektant", email: "designer@test.com" } as any);
    vi.mocked(prisma.user.count).mockResolvedValue(1);      // 1 istniejący członek
    vi.mocked(prisma.invitation.count).mockResolvedValue(0); // 0 oczekujących (łącznie 1 < 2)
    vi.mocked(prisma.invitation.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.invitation.create).mockResolvedValue(mockInvitation as any);

    const res = await teamInvitePOST(makeRequest("POST", { email: "new@example.com" }));
    expect(res.status).toBe(201);
  });

  it("blokuje zaproszenie dla studio gdy osiągnięto limit 2 członków (403)", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      isFree: false,
      subscription: { plan: "studio", status: "active" },
    } as any);
    vi.mocked(prisma.user.count).mockResolvedValue(1);      // 1 istniejący
    vi.mocked(prisma.invitation.count).mockResolvedValue(1); // + 1 oczekujące = 2 (limit osiągnięty)

    const res = await teamInvitePOST(makeRequest("POST", { email: "one-too-many@example.com" }));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/2/);
  });

  it("blokuje gdy studio ma dokładnie 2 aktywnych członków (bez pending)", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      isFree: false,
      subscription: { plan: "studio", status: "active" },
    } as any);
    vi.mocked(prisma.user.count).mockResolvedValue(2);
    vi.mocked(prisma.invitation.count).mockResolvedValue(0);

    const res = await teamInvitePOST(makeRequest("POST", { email: "blocked@example.com" }));
    expect(res.status).toBe(403);
  });

  it("zezwala na zaproszenie dla planu agencja bez limitu", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce({ isFree: false, subscription: { plan: "agencja", status: "active" } } as any)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ name: "Projektant", email: "designer@test.com" } as any);
    // Agencja nie sprawdza count — mockujemy wysoką liczbę
    vi.mocked(prisma.invitation.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.invitation.create).mockResolvedValue(mockInvitation as any);

    const res = await teamInvitePOST(makeRequest("POST", { email: "agencja-member@example.com" }));
    expect(res.status).toBe(201);
    // Agencja nie woła count
    expect(vi.mocked(prisma.user.count)).not.toHaveBeenCalled();
  });

  it("zezwala na zaproszenie dla isFree=true niezależnie od braku subskrypcji", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce({ isFree: true, subscription: null } as any)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ name: "Projektant", email: "designer@test.com" } as any);
    vi.mocked(prisma.invitation.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.invitation.create).mockResolvedValue(mockInvitation as any);

    const res = await teamInvitePOST(makeRequest("POST", { email: "free-user-member@example.com" }));
    expect(res.status).toBe(201);
    expect(vi.mocked(prisma.user.count)).not.toHaveBeenCalled();
  });

  it("studio: sprawdza zarówno aktywnych członków jak i oczekujące zaproszenia", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      isFree: false,
      subscription: { plan: "studio", status: "active" },
    } as any);
    vi.mocked(prisma.user.count).mockResolvedValue(1);
    vi.mocked(prisma.invitation.count).mockResolvedValue(1); // łącznie 2 = limit

    const res = await teamInvitePOST(makeRequest("POST", { email: "third@example.com" }));
    expect(res.status).toBe(403);

    expect(vi.mocked(prisma.user.count)).toHaveBeenCalledWith({ where: { ownerId: "user-1" } });
    expect(vi.mocked(prisma.invitation.count)).toHaveBeenCalledWith({
      where: { designerId: "user-1", status: "PENDING" },
    });
  });
});

// ─── GET /api/invite/[token] — walidacja tokenu (publiczny) ──────────────────

describe("GET /api/invite/[token] — walidacja tokenu zaproszenia", () => {
  it("zwraca 404 gdy token nie istnieje", async () => {
    vi.mocked(prisma.invitation.findUnique).mockResolvedValue(null);
    const res = await inviteTokenGET(makeRequest("GET"), makeParams({ token: "nieistniejacy" }));
    expect(res.status).toBe(404);
  });

  it("zwraca 404 gdy zaproszenie nie jest PENDING", async () => {
    vi.mocked(prisma.invitation.findUnique).mockResolvedValue({
      ...mockInvitation,
      status: "ACCEPTED",
    } as any);

    const res = await inviteTokenGET(makeRequest("GET"), makeParams({ token: "abc-token-123" }));
    expect(res.status).toBe(404);
  });

  it("zwraca 410 gdy zaproszenie wygasło", async () => {
    vi.mocked(prisma.invitation.findUnique).mockResolvedValue({
      ...mockInvitation,
      expiresAt: new Date(Date.now() - 1000), // wygasłe
    } as any);

    const res = await inviteTokenGET(makeRequest("GET"), makeParams({ token: "abc-token-123" }));
    expect(res.status).toBe(410);
  });

  it("zwraca email i imię projektanta dla ważnego tokenu", async () => {
    vi.mocked(prisma.invitation.findUnique).mockResolvedValue(mockInvitation as any);

    const res = await inviteTokenGET(makeRequest("GET"), makeParams({ token: "abc-token-123" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.email).toBe("member@example.com");
    expect(body.designerName).toBe("Projektant");
  });
});

// ─── POST /api/invite/[token] — akceptacja zaproszenia ───────────────────────

describe("POST /api/invite/[token] — akceptacja zaproszenia i ustawienie hasła", () => {
  it("zwraca 400 gdy hasło za krótkie", async () => {
    vi.mocked(prisma.invitation.findUnique).mockResolvedValue(mockInvitation as any);
    const res = await inviteTokenPOST(
      makeRequest("POST", { password: "abc", name: "Jan Nowak" }),
      makeParams({ token: "abc-token-123" })
    );
    expect(res.status).toBe(400);
  });

  it("zwraca 404 gdy token nie istnieje", async () => {
    vi.mocked(prisma.invitation.findUnique).mockResolvedValue(null);

    const res = await inviteTokenPOST(
      makeRequest("POST", { password: "haslo123", name: "Jan Nowak" }),
      makeParams({ token: "nieistniejacy" })
    );
    expect(res.status).toBe(404);
  });

  it("zwraca 410 gdy zaproszenie wygasło", async () => {
    vi.mocked(prisma.invitation.findUnique).mockResolvedValue({
      ...mockInvitation,
      expiresAt: new Date(Date.now() - 1000),
    } as any);

    const res = await inviteTokenPOST(
      makeRequest("POST", { password: "haslo123", name: "Jan Nowak" }),
      makeParams({ token: "abc-token-123" })
    );
    expect(res.status).toBe(410);
  });

  it("tworzy konto, akceptuje zaproszenie i wysyła powiadomienie Pusher", async () => {
    vi.mocked(prisma.invitation.findUnique).mockResolvedValue(mockInvitation as any);
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: "new-member-1",
      email: "member@example.com",
      name: "Jan Nowak",
      ownerId: "user-1",
    } as any);

    const designerNotif = {
      id: "notif-1",
      userId: "user-1",
      message: "Jan Nowak dołączył/a do Twojego zespołu.",
      createdAt: new Date(),
    };

    vi.mocked(prisma.$transaction).mockResolvedValue([{}, {}] as any);
    vi.mocked(prisma.notification.create).mockResolvedValue(designerNotif as any);
    vi.mocked(pusherServer.trigger).mockResolvedValue({} as any);

    const res = await inviteTokenPOST(
      makeRequest("POST", { password: "Haslo123!", name: "Jan Nowak" }),
      makeParams({ token: "abc-token-123" })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);

    // Nowe konto ma ownerId projektanta
    const createCall = vi.mocked(prisma.user.create).mock.calls[0][0];
    expect(createCall.data.ownerId).toBe("user-1");
    expect(createCall.data.email).toBe("member@example.com");

    // Hasło haszowane
    expect(createCall.data.password).toBe("hashed_pw");

    // Pusher wysłany do kanału projektanta
    expect(vi.mocked(pusherServer.trigger)).toHaveBeenCalledWith(
      "user-user-1",
      "new-notification",
      expect.any(Object)
    );
  });

  it("używa emaila jako displayName gdy brak imienia", async () => {
    vi.mocked(prisma.invitation.findUnique).mockResolvedValue(mockInvitation as any);
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: "new-member-2",
      email: "member@example.com",
      name: null,
      ownerId: "user-1",
    } as any);
    vi.mocked(prisma.$transaction).mockResolvedValue([{}, {}] as any);
    vi.mocked(prisma.notification.create).mockResolvedValue({
      id: "notif-2",
      userId: "user-1",
      message: "member@example.com dołączył/a do Twojego zespołu.",
      createdAt: new Date(),
    } as any);
    vi.mocked(pusherServer.trigger).mockResolvedValue({} as any);

    const res = await inviteTokenPOST(
      makeRequest("POST", { password: "Haslo123!" }), // brak name
      makeParams({ token: "abc-token-123" })
    );

    expect(res.status).toBe(200);
    const createCall = vi.mocked(prisma.user.create).mock.calls[0][0];
    expect(createCall.data.name).toBeNull();
  });
});
