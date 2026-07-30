import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    groupMember: {
      findMany: vi.fn(),
    },
    projectAssignment: {
      findMany: vi.fn(),
    },
    project: {
      findMany: vi.fn(),
    },
    permissionGroup: {
      count: vi.fn(),
      createMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  getEffectivePermissions,
  hasPermission,
  getMemberHiddenModules,
  getAllowedProjectIds,
  MODULE_SLUGS,
} from "@/lib/permissions";

beforeEach(() => vi.clearAllMocks());

// ─── Session builders ─────────────────────────────────────────────────────────

const ownerSession = { user: { id: "owner-1", email: "owner@test.com" } };
const adminSession = {
  user: { id: "admin-1", email: "admin@test.com", ownerId: "owner-1", systemRole: "admin" },
};
const memberSession = {
  user: { id: "member-1", email: "member@test.com", ownerId: "owner-1", systemRole: "member" },
};

// ─── getEffectivePermissions ──────────────────────────────────────────────────

describe("getEffectivePermissions", () => {
  it("owner gets level 3 on all modules and scope=all", async () => {
    const result = await getEffectivePermissions("owner-1", "owner-1", "owner");
    for (const slug of MODULE_SLUGS) {
      expect(result[slug]).toBe(3);
    }
    expect(result.projectScope).toBe("all");
    // No DB call needed for owner
    expect(vi.mocked(prisma.groupMember.findMany)).not.toHaveBeenCalled();
  });

  it("admin gets level 3 on all modules and scope=all", async () => {
    const result = await getEffectivePermissions("admin-1", "owner-1", "admin");
    for (const slug of MODULE_SLUGS) {
      expect(result[slug]).toBe(3);
    }
    expect(result.projectScope).toBe("all");
    expect(vi.mocked(prisma.groupMember.findMany)).not.toHaveBeenCalled();
  });

  it("member with no groups gets level 0 on all modules and scope=assigned", async () => {
    vi.mocked(prisma.groupMember.findMany).mockResolvedValue([]);
    const result = await getEffectivePermissions("member-1", "owner-1", "member");
    for (const slug of MODULE_SLUGS) {
      expect(result[slug]).toBe(0);
    }
    expect(result.projectScope).toBe("assigned");
  });

  it("member with one group inherits that group's permissions", async () => {
    vi.mocked(prisma.groupMember.findMany).mockResolvedValue([
      {
        group: {
          projectScope: "assigned",
          permissions: {
            klienci: 0, projectflow: 2, listy: 1, moodboardy: 2, zadania: 2,
            ankiety: 0, produkty: 1, wykonawcy: 0, kalendarz: 1, notatnik: 2,
            dyskusje: 2, ustawienia: 0,
          },
        },
      },
    ] as any);

    const result = await getEffectivePermissions("member-1", "owner-1", "member");
    expect(result.projectflow).toBe(2);
    expect(result.klienci).toBe(0);
    expect(result.listy).toBe(1);
    expect(result.projectScope).toBe("assigned");
  });

  it("member with two groups gets max level per module", async () => {
    vi.mocked(prisma.groupMember.findMany).mockResolvedValue([
      {
        group: {
          projectScope: "assigned",
          permissions: {
            klienci: 0, projectflow: 2, listy: 1, moodboardy: 1, zadania: 1,
            ankiety: 0, produkty: 0, wykonawcy: 0, kalendarz: 0, notatnik: 1,
            dyskusje: 1, ustawienia: 0,
          },
        },
      },
      {
        group: {
          projectScope: "assigned",
          permissions: {
            klienci: 1, projectflow: 1, listy: 0, moodboardy: 2, zadania: 3,
            ankiety: 1, produkty: 2, wykonawcy: 1, kalendarz: 2, notatnik: 0,
            dyskusje: 2, ustawienia: 1,
          },
        },
      },
    ] as any);

    const result = await getEffectivePermissions("member-1", "owner-1", "member");
    expect(result.klienci).toBe(1);     // max(0, 1)
    expect(result.projectflow).toBe(2); // max(2, 1)
    expect(result.listy).toBe(1);       // max(1, 0)
    expect(result.moodboardy).toBe(2);  // max(1, 2)
    expect(result.zadania).toBe(3);     // max(1, 3)
    expect(result.ankiety).toBe(1);     // max(0, 1)
    expect(result.dyskusje).toBe(2);    // max(1, 2)
    expect(result.ustawienia).toBe(1);  // max(0, 1)
  });

  it("projectScope is 'all' when any group has scope=all", async () => {
    vi.mocked(prisma.groupMember.findMany).mockResolvedValue([
      {
        group: {
          projectScope: "assigned",
          permissions: Object.fromEntries(MODULE_SLUGS.map((m) => [m, 0])),
        },
      },
      {
        group: {
          projectScope: "all",
          permissions: Object.fromEntries(MODULE_SLUGS.map((m) => [m, 1])),
        },
      },
    ] as any);

    const result = await getEffectivePermissions("member-1", "owner-1", "member");
    expect(result.projectScope).toBe("all");
  });
});

// ─── hasPermission ────────────────────────────────────────────────────────────

describe("hasPermission", () => {
  it("owner always passes any permission check", async () => {
    const result = await hasPermission(ownerSession as any, "klienci", 3);
    expect(result).toBe(true);
  });

  it("non-team-member (standalone designer) always passes", async () => {
    // No ownerId = not a team member
    const result = await hasPermission(ownerSession as any, "dyskusje", 3);
    expect(result).toBe(true);
  });

  it("admin team member always passes", async () => {
    const result = await hasPermission(adminSession as any, "ustawienia", 3);
    expect(result).toBe(true);
    expect(vi.mocked(prisma.groupMember.findMany)).not.toHaveBeenCalled();
  });

  it("member without groups fails any level > 0 check", async () => {
    vi.mocked(prisma.groupMember.findMany).mockResolvedValue([]);
    const result = await hasPermission(memberSession as any, "projectflow", 1);
    expect(result).toBe(false);
  });

  it("member passes check when group grants sufficient level", async () => {
    vi.mocked(prisma.groupMember.findMany).mockResolvedValue([
      {
        group: {
          projectScope: "assigned",
          permissions: Object.fromEntries(MODULE_SLUGS.map((m) => [m, m === "listy" ? 2 : 0])),
        },
      },
    ] as any);
    expect(await hasPermission(memberSession as any, "listy", 1)).toBe(true);
    expect(await hasPermission(memberSession as any, "listy", 2)).toBe(true);
  });

  it("member fails check when level is below minimum", async () => {
    vi.mocked(prisma.groupMember.findMany).mockResolvedValue([
      {
        group: {
          projectScope: "assigned",
          permissions: Object.fromEntries(MODULE_SLUGS.map((m) => [m, m === "listy" ? 1 : 0])),
        },
      },
    ] as any);
    expect(await hasPermission(memberSession as any, "listy", 2)).toBe(false);
  });
});

// ─── getMemberHiddenModules ───────────────────────────────────────────────────

describe("getMemberHiddenModules", () => {
  it("returns empty array for owner", async () => {
    const result = await getMemberHiddenModules("owner-1", "owner-1", "owner");
    expect(result).toEqual([]);
  });

  it("returns all modules for member with no groups", async () => {
    vi.mocked(prisma.groupMember.findMany).mockResolvedValue([]);
    const result = await getMemberHiddenModules("member-1", "owner-1", "member");
    expect(result).toEqual(expect.arrayContaining([...MODULE_SLUGS]));
    expect(result).toHaveLength(MODULE_SLUGS.length);
  });

  it("returns only level-0 modules for member with partial permissions", async () => {
    vi.mocked(prisma.groupMember.findMany).mockResolvedValue([
      {
        group: {
          projectScope: "assigned",
          permissions: {
            klienci: 0, projectflow: 2, listy: 1, moodboardy: 0, zadania: 1,
            ankiety: 0, produkty: 0, wykonawcy: 0, kalendarz: 0, notatnik: 1,
            dyskusje: 2, ustawienia: 0,
          },
        },
      },
    ] as any);

    const result = await getMemberHiddenModules("member-1", "owner-1", "member");
    expect(result).toContain("klienci");
    expect(result).toContain("moodboardy");
    expect(result).toContain("ustawienia");
    expect(result).not.toContain("projectflow");
    expect(result).not.toContain("listy");
    expect(result).not.toContain("dyskusje");
  });
});

// ─── getAllowedProjectIds ─────────────────────────────────────────────────────

describe("getAllowedProjectIds", () => {
  it("returns null for owner (unrestricted access)", async () => {
    const result = await getAllowedProjectIds(ownerSession as any);
    expect(result).toBeNull();
  });

  it("returns null for member with scope=all", async () => {
    vi.mocked(prisma.groupMember.findMany).mockResolvedValue([
      {
        group: {
          projectScope: "all",
          permissions: Object.fromEntries(MODULE_SLUGS.map((m) => [m, 1])),
        },
      },
    ] as any);

    const result = await getAllowedProjectIds(memberSession as any);
    expect(result).toBeNull();
  });

  it("returns assigned project IDs for member with scope=assigned", async () => {
    vi.mocked(prisma.groupMember.findMany).mockResolvedValue([
      {
        group: {
          projectScope: "assigned",
          permissions: Object.fromEntries(MODULE_SLUGS.map((m) => [m, 1])),
        },
      },
    ] as any);
    vi.mocked(prisma.projectAssignment.findMany).mockResolvedValue([
      { projectId: "proj-1" },
      { projectId: "proj-2" },
    ] as any);

    const result = await getAllowedProjectIds(memberSession as any);
    expect(result).toEqual(["proj-1", "proj-2"]);
  });
});
