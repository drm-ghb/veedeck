import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

export const DEMO_EMAIL = "d.rychlik@veedeck.com";

const DEMO_HELPER_EMAILS = [
  "anna.kowalska@demo.veedeck.com",
  "piotr.wisniewski@demo.veedeck.com",
  "marta.zielinska@demo.veedeck.com",
  "katarzyna.nowak@demo.veedeck.com",
  "tomasz.nowak@demo.veedeck.com",
  "jan.kowalski.klient@demo.veedeck.com",
  "agnieszka.kowalska@demo.veedeck.com",
  "anna.grabowska@demo.veedeck.com",
  "rafal.grabowski@demo.veedeck.com",
  "hydraulik@demo.veedeck.com",
  "elektryk@demo.veedeck.com",
  "malarz@demo.veedeck.com",
];

export async function resetDemoAccount() {
  const demoUser = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (!demoUser) throw new Error(`Demo user not found: ${DEMO_EMAIL}`);
  await clearDemoData(demoUser.id);
  await seedDemoData(demoUser.id);
  return { success: true, userId: demoUser.id };
}

async function clearDemoData(userId: string) {
  // Safe deletion order — most explicit, avoids FK conflicts
  await prisma.discussion.deleteMany({ where: { ownerId: userId } });
  await prisma.task.deleteMany({ where: { creatorId: userId } });
  await prisma.survey.deleteMany({ where: { userId } });
  await prisma.shoppingList.deleteMany({ where: { userId } });
  await prisma.contractor.deleteMany({ where: { designerId: userId } });
  await prisma.client.deleteMany({ where: { designerId: userId } }); // cascades ProjectClients
  await prisma.project.deleteMany({ where: { userId } }); // cascades rooms, renders
  await prisma.note.deleteMany({ where: { userId } });
  await prisma.calendarEvent.deleteMany({ where: { userId } });
  await prisma.user.deleteMany({ where: { email: { in: DEMO_HELPER_EMAILS } } });
}

async function seedDemoData(userId: string) {
  const hash = await bcrypt.hash("Demo1234!", 10);

  // ─── TEAM MEMBERS ─────────────────────────────────────────────────────────
  const [anna, piotr, marta] = await Promise.all([
    prisma.user.create({
      data: {
        email: "anna.kowalska@demo.veedeck.com",
        name: "Anna Kowalska",
        fullName: "Anna Kowalska",
        password: hash,
        role: "designer",
        ownerId: userId,
      },
    }),
    prisma.user.create({
      data: {
        email: "piotr.wisniewski@demo.veedeck.com",
        name: "Piotr Wiśniewski",
        fullName: "Piotr Wiśniewski",
        password: hash,
        role: "designer",
        ownerId: userId,
      },
    }),
    prisma.user.create({
      data: {
        email: "marta.zielinska@demo.veedeck.com",
        name: "Marta Zielińska",
        fullName: "Marta Zielińska",
        password: hash,
        role: "designer",
        ownerId: userId,
      },
    }),
  ]);

  await Promise.all([
    prisma.teamMemberPermission.create({ data: { memberId: anna.id, ownerId: userId } }),
    prisma.teamMemberPermission.create({ data: { memberId: piotr.id, ownerId: userId } }),
    prisma.teamMemberPermission.create({ data: { memberId: marta.id, ownerId: userId } }),
  ]);

  // ─── CLIENT USER ACCOUNTS (for clients 1, 3, 4) ──────────────────────────
  const [katarzyna, tomasz] = await Promise.all([
    prisma.user.create({
      data: {
        email: "katarzyna.nowak@demo.veedeck.com",
        login: "katarzyna.nowak",
        name: "Katarzyna Nowak",
        fullName: "Katarzyna Nowak",
        password: hash,
        role: "client",
      },
    }),
    prisma.user.create({
      data: {
        email: "tomasz.nowak@demo.veedeck.com",
        login: "tomasz.nowak",
        name: "Tomasz Nowak",
        fullName: "Tomasz Nowak",
        password: hash,
        role: "client",
      },
    }),
  ]);

  const [janKlient, agnieszka] = await Promise.all([
    prisma.user.create({
      data: {
        email: "jan.kowalski.klient@demo.veedeck.com",
        login: "jan.kowalski.klient",
        name: "Jan Kowalski",
        fullName: "Jan Kowalski",
        password: hash,
        role: "client",
      },
    }),
    prisma.user.create({
      data: {
        email: "agnieszka.kowalska@demo.veedeck.com",
        login: "agnieszka.kowalska",
        name: "Agnieszka Kowalska",
        fullName: "Agnieszka Kowalska",
        password: hash,
        role: "client",
      },
    }),
  ]);

  const [annaGrabowska, rafalGrabowski] = await Promise.all([
    prisma.user.create({
      data: {
        email: "anna.grabowska@demo.veedeck.com",
        login: "anna.grabowska",
        name: "Anna Grabowska",
        fullName: "Anna Grabowska",
        password: hash,
        role: "client",
      },
    }),
    prisma.user.create({
      data: {
        email: "rafal.grabowski@demo.veedeck.com",
        login: "rafal.grabowski",
        name: "Rafał Grabowski",
        fullName: "Rafał Grabowski",
        password: hash,
        role: "client",
      },
    }),
  ]);

  // ─── CLIENTS ──────────────────────────────────────────────────────────────
  const [client1, client2, client3, client4, client5] = await Promise.all([
    prisma.client.create({
      data: {
        designerId: userId,
        name: "Nowakowie",
        addressCity: "Kraków",
        addressStreet: "ul. Szewska 12",
        addressPostalCode: "31-009",
        addressCountry: "Polska",
        description: "Rodzina Nowak – aranżacja apartamentu w centrum Krakowa.",
        startDate: new Date("2025-03-01"),
        endDate: new Date("2025-10-31"),
      },
    }),
    prisma.client.create({
      data: {
        designerId: userId,
        name: "Wiśniewscy",
        addressCity: "Warszawa",
        addressStreet: "ul. Mokotowska 44",
        addressPostalCode: "00-551",
        addressCountry: "Polska",
        description: "Projekt domu jednorodzinnego – Warszawa Mokotów. Styl skandynawski.",
        startDate: new Date("2025-05-15"),
        endDate: new Date("2026-04-30"),
      },
    }),
    prisma.client.create({
      data: {
        designerId: userId,
        name: "Jan Kowalski",
        addressCity: "Wrocław",
        addressStreet: "ul. Świdnicka 8",
        addressPostalCode: "50-066",
        addressCountry: "Polska",
        description: "Modernizacja mieszkania 55m² w centrum Wrocławia. Styl industrialny.",
        startDate: new Date("2025-06-01"),
      },
    }),
    prisma.client.create({
      data: {
        designerId: userId,
        name: "Grabowska Design",
        addressCity: "Poznań",
        addressStreet: "ul. Półwiejska 30",
        addressPostalCode: "61-888",
        addressCountry: "Polska",
        description: "Aranżacja przestrzeni biurowej studia projektowego. 120m² open space.",
        startDate: new Date("2025-07-01"),
      },
    }),
    prisma.client.create({
      data: {
        designerId: userId,
        name: "Malinowski & Co.",
        addressCity: "Gdańsk",
        addressStreet: "ul. Długa 50",
        addressPostalCode: "80-827",
        addressCountry: "Polska",
        description: "Projekt reprezentacyjnej siedziby firmy – Gdańsk Stare Miasto.",
        startDate: new Date("2025-09-01"),
      },
    }),
  ]);

  // ─── PROJECT CLIENTS (contacts) ───────────────────────────────────────────
  // Client 1 – Nowakowie – 2 contacts WITH accounts
  const [pc1a, pc1b] = await Promise.all([
    prisma.projectClient.create({
      data: {
        name: "Katarzyna Nowak",
        email: "katarzyna.nowak@demo.veedeck.com",
        phone: "+48 601 234 567",
        isMainContact: true,
        order: 0,
        clientId: client1.id,
        userId: katarzyna.id,
      },
    }),
    prisma.projectClient.create({
      data: {
        name: "Tomasz Nowak",
        email: "tomasz.nowak@demo.veedeck.com",
        phone: "+48 602 345 678",
        isMainContact: false,
        order: 1,
        clientId: client1.id,
        userId: tomasz.id,
      },
    }),
  ]);

  // Client 2 – Wiśniewscy – 2 contacts WITHOUT accounts (alert will show)
  const [pc2a, pc2b] = await Promise.all([
    prisma.projectClient.create({
      data: {
        name: "Beata Wiśniewska",
        email: "beata.wisniewska@gmail.com",
        phone: "+48 603 456 789",
        isMainContact: true,
        order: 0,
        clientId: client2.id,
      },
    }),
    prisma.projectClient.create({
      data: {
        name: "Marek Wiśniewski",
        email: "marek.wisniewski@gmail.com",
        phone: "+48 604 567 890",
        isMainContact: false,
        order: 1,
        clientId: client2.id,
      },
    }),
  ]);

  // Client 3 – Kowalski – 2 contacts WITH accounts
  const [pc3a, pc3b] = await Promise.all([
    prisma.projectClient.create({
      data: {
        name: "Jan Kowalski",
        email: "jan.kowalski.klient@demo.veedeck.com",
        phone: "+48 605 678 901",
        isMainContact: true,
        order: 0,
        clientId: client3.id,
        userId: janKlient.id,
      },
    }),
    prisma.projectClient.create({
      data: {
        name: "Agnieszka Kowalska",
        email: "agnieszka.kowalska@demo.veedeck.com",
        phone: "+48 606 789 012",
        isMainContact: false,
        order: 1,
        clientId: client3.id,
        userId: agnieszka.id,
      },
    }),
  ]);

  // Client 4 – Grabowska – 2 contacts WITH accounts
  const [pc4a, pc4b] = await Promise.all([
    prisma.projectClient.create({
      data: {
        name: "Anna Grabowska",
        email: "anna.grabowska@demo.veedeck.com",
        phone: "+48 607 890 123",
        isMainContact: true,
        order: 0,
        clientId: client4.id,
        userId: annaGrabowska.id,
      },
    }),
    prisma.projectClient.create({
      data: {
        name: "Rafał Grabowski",
        email: "rafal.grabowski@demo.veedeck.com",
        phone: "+48 608 901 234",
        isMainContact: false,
        order: 1,
        clientId: client4.id,
        userId: rafalGrabowski.id,
      },
    }),
  ]);

  // Client 5 – Malinowski – NO contacts (intentional)

  // ─── PROJECTS ─────────────────────────────────────────────────────────────
  const [project1, project2, project3, project4, project5] = await Promise.all([
    prisma.project.create({
      data: {
        title: "Apartament Nowak – Kraków",
        description: "Kompleksowa aranżacja apartamentu 80m² w centrum Krakowa. Styl nowoczesny z elementami klasycznymi.",
        userId,
        clientId: client1.id,
        clientName: "Katarzyna Nowak",
        clientEmail: "katarzyna.nowak@demo.veedeck.com",
        addressCity: "Kraków",
        addressStreet: "ul. Szewska 12",
        addressPostalCode: "31-009",
        addressCountry: "Polska",
        startDate: new Date("2025-03-01"),
        endDate: new Date("2025-10-31"),
        modules: ["renderflow", "listy", "dyskusje"],
        pinned: true,
      },
    }),
    prisma.project.create({
      data: {
        title: "Dom Wiśniewskich – Warszawa",
        description: "Projekt wnętrz domu jednorodzinnego 200m². Styl skandynawski z ciepłymi akcentami drewna.",
        userId,
        clientId: client2.id,
        clientName: "Beata Wiśniewska",
        clientEmail: "beata.wisniewska@gmail.com",
        addressCity: "Warszawa",
        addressStreet: "ul. Mokotowska 44",
        addressPostalCode: "00-551",
        startDate: new Date("2025-05-15"),
        modules: ["renderflow", "listy", "dyskusje", "wykonawcy"],
      },
    }),
    prisma.project.create({
      data: {
        title: "Mieszkanie Kowalskiego – Wrocław",
        description: "Modernizacja mieszkania 55m². Otwarta przestrzeń dzienna. Styl industrialny.",
        userId,
        clientId: client3.id,
        clientName: "Jan Kowalski",
        clientEmail: "jan.kowalski.klient@demo.veedeck.com",
        addressCity: "Wrocław",
        addressStreet: "ul. Świdnicka 8",
        startDate: new Date("2025-06-01"),
        modules: ["renderflow", "listy", "dyskusje"],
      },
    }),
    prisma.project.create({
      data: {
        title: "Biuro Grabowska Design – Poznań",
        description: "Aranżacja przestrzeni biurowej studia projektowego. 120m² open space z salą spotkań.",
        userId,
        clientId: client4.id,
        clientName: "Anna Grabowska",
        clientEmail: "anna.grabowska@demo.veedeck.com",
        addressCity: "Poznań",
        addressStreet: "ul. Półwiejska 30",
        startDate: new Date("2025-07-01"),
        modules: ["renderflow", "dyskusje"],
      },
    }),
    prisma.project.create({
      data: {
        title: "Siedziba Malinowski & Co. – Gdańsk",
        description: "Projekt reprezentacyjnej siedziby firmy w Gdańsku. Styl klasyczno-nowoczesny.",
        userId,
        clientId: client5.id,
        clientName: "Malinowski & Co.",
        addressCity: "Gdańsk",
        addressStreet: "ul. Długa 50",
        startDate: new Date("2025-09-01"),
        modules: ["renderflow", "dyskusje"],
      },
    }),
  ]);

  // Link contacts to projects
  await Promise.all([
    prisma.projectClient.updateMany({ where: { id: { in: [pc1a.id, pc1b.id] } }, data: { projectId: project1.id } }),
    prisma.projectClient.updateMany({ where: { id: { in: [pc2a.id, pc2b.id] } }, data: { projectId: project2.id } }),
    prisma.projectClient.updateMany({ where: { id: { in: [pc3a.id, pc3b.id] } }, data: { projectId: project3.id } }),
    prisma.projectClient.updateMany({ where: { id: { in: [pc4a.id, pc4b.id] } }, data: { projectId: project4.id } }),
  ]);

  // ─── ROOMS ────────────────────────────────────────────────────────────────
  await Promise.all([
    prisma.room.createMany({
      data: [
        { name: "Salon", type: "SALON", order: 0, projectId: project1.id },
        { name: "Kuchnia", type: "KUCHNIA", order: 1, projectId: project1.id },
        { name: "Sypialnia główna", type: "SYPIALNIA", order: 2, projectId: project1.id },
        { name: "Łazienka", type: "INNE", order: 3, projectId: project1.id },
        { name: "Przedpokój", type: "INNE", order: 4, projectId: project1.id },
      ],
    }),
    prisma.room.createMany({
      data: [
        { name: "Salon z jadalnią", type: "SALON", order: 0, projectId: project2.id },
        { name: "Kuchnia", type: "KUCHNIA", order: 1, projectId: project2.id },
        { name: "Sypialnia 1", type: "SYPIALNIA", order: 2, projectId: project2.id },
        { name: "Sypialnia 2", type: "SYPIALNIA", order: 3, projectId: project2.id },
        { name: "Łazienka", type: "INNE", order: 4, projectId: project2.id },
        { name: "Garderoba", type: "INNE", order: 5, projectId: project2.id },
      ],
    }),
    prisma.room.createMany({
      data: [
        { name: "Salon", type: "SALON", order: 0, projectId: project3.id },
        { name: "Aneks kuchenny", type: "KUCHNIA", order: 1, projectId: project3.id },
        { name: "Sypialnia", type: "SYPIALNIA", order: 2, projectId: project3.id },
        { name: "Łazienka", type: "INNE", order: 3, projectId: project3.id },
      ],
    }),
    prisma.room.createMany({
      data: [
        { name: "Open space", type: "INNE", order: 0, projectId: project4.id },
        { name: "Sala konferencyjna", type: "INNE", order: 1, projectId: project4.id },
        { name: "Recepcja", type: "INNE", order: 2, projectId: project4.id },
        { name: "Aneks kuchenny", type: "KUCHNIA", order: 3, projectId: project4.id },
      ],
    }),
    prisma.room.createMany({
      data: [
        { name: "Hol wejściowy", type: "INNE", order: 0, projectId: project5.id },
        { name: "Biuro zarządu", type: "INNE", order: 1, projectId: project5.id },
        { name: "Sala spotkań", type: "INNE", order: 2, projectId: project5.id },
        { name: "Kuchnia pracownicza", type: "KUCHNIA", order: 3, projectId: project5.id },
        { name: "Toaleta", type: "TOALETA", order: 4, projectId: project5.id },
      ],
    }),
  ]);

  // ─── TASKS ────────────────────────────────────────────────────────────────
  await prisma.task.createMany({
    data: [
      { title: "Przygotować moodboard dla salonu Nowak", status: "DONE", priority: "HIGH", projectId: project1.id, creatorId: userId, assigneeId: anna.id, ownerId: userId, dueDate: new Date("2025-08-01") },
      { title: "Zamówić próbki tkanin do sypialni – Nowak", status: "IN_PROGRESS", priority: "MEDIUM", projectId: project1.id, creatorId: userId, assigneeId: userId, ownerId: userId, dueDate: new Date("2025-09-15") },
      { title: "Wysłać wizualizacje kuchni do akceptacji", status: "TODO", priority: "HIGH", projectId: project1.id, creatorId: userId, assigneeId: piotr.id, ownerId: userId, dueDate: new Date("2025-09-30") },
      { title: "Skontaktować się z hydraulikiem – łazienka Nowak", status: "TODO", priority: "MEDIUM", projectId: project1.id, creatorId: userId, assigneeId: userId, ownerId: userId, dueDate: new Date("2025-10-05") },
      { title: "Opracować schemat oświetlenia – dom Wiśniewskich", status: "IN_PROGRESS", priority: "HIGH", projectId: project2.id, creatorId: userId, assigneeId: anna.id, ownerId: userId, dueDate: new Date("2025-09-20") },
      { title: "Wizualizacja garderoby – Wiśniewscy", status: "TODO", priority: "LOW", projectId: project2.id, creatorId: userId, assigneeId: marta.id, ownerId: userId, dueDate: new Date("2025-10-10") },
      { title: "Dobór płytek łazienkowych – Wiśniewscy", status: "DONE", priority: "MEDIUM", projectId: project2.id, creatorId: userId, assigneeId: piotr.id, ownerId: userId },
      { title: "Wycena mebli na zamówienie – Kowalski", status: "IN_PROGRESS", priority: "HIGH", projectId: project3.id, creatorId: userId, assigneeId: userId, ownerId: userId, dueDate: new Date("2025-09-25") },
      { title: "Zaprojektować układ gniazdek – Kowalski", status: "TODO", priority: "MEDIUM", projectId: project3.id, creatorId: userId, assigneeId: anna.id, ownerId: userId },
      { title: "Przygotować listę zakupową – Kowalski", status: "TODO", priority: "LOW", projectId: project3.id, creatorId: userId, assigneeId: marta.id, ownerId: userId, dueDate: new Date("2025-10-01") },
      { title: "Projekt systemu akustycznego – Grabowska", status: "IN_PROGRESS", priority: "HIGH", projectId: project4.id, creatorId: userId, assigneeId: piotr.id, ownerId: userId, dueDate: new Date("2025-09-10") },
      { title: "Dobór krzeseł biurowych – Grabowska Design", status: "DONE", priority: "MEDIUM", projectId: project4.id, creatorId: userId, assigneeId: anna.id, ownerId: userId },
      { title: "Koncepcja recepcji – Grabowska", status: "TODO", priority: "HIGH", projectId: project4.id, creatorId: userId, assigneeId: userId, ownerId: userId, dueDate: new Date("2025-09-30") },
      { title: "Dobór kamienia na hol wejściowy – Malinowski", status: "TODO", priority: "HIGH", projectId: project5.id, creatorId: userId, assigneeId: marta.id, ownerId: userId, dueDate: new Date("2025-10-15") },
      { title: "Harmonogram prac – Malinowski & Co.", status: "IN_PROGRESS", priority: "MEDIUM", projectId: project5.id, creatorId: userId, assigneeId: userId, ownerId: userId, dueDate: new Date("2025-09-05") },
    ],
  });

  // ─── SURVEYS ──────────────────────────────────────────────────────────────
  const ts = Date.now();

  // Survey 1 – ACTIVE, 2 responses
  const survey1 = await prisma.survey.create({
    data: { name: "Ankieta stylistyczna – Nowak", slug: `ankieta-styl-nowak-${ts}`, status: "ACTIVE", userId, projectId: project1.id, clientId: pc1a.id },
  });

  const [s1q1, s1q2, s1q3, s1q4] = await Promise.all([
    prisma.surveyQuestion.create({ data: { surveyId: survey1.id, label: "Jaki styl aranżacji najbardziej Państwu odpowiada?", type: "single_choice", required: true, order: 0, options: ["Nowoczesny/minimalistyczny", "Klasyczny/elegancki", "Skandynawski", "Industrialny", "Eklektyczny"] } }),
    prisma.surveyQuestion.create({ data: { surveyId: survey1.id, label: "Jaką paletę kolorystyczną preferujecie?", type: "single_choice", required: true, order: 1, options: ["Neutralna (biele, beże, szarości)", "Ciepła (ziemiste tony, terakota)", "Chłodna (niebieskości, zielenie)", "Kontrastowa (czerń i biel)", "Barwna i wyrazista"] } }),
    prisma.surveyQuestion.create({ data: { surveyId: survey1.id, label: "Co jest dla Państwa najważniejsze w nowym wnętrzu?", type: "text", required: false, order: 2 } }),
    prisma.surveyQuestion.create({ data: { surveyId: survey1.id, label: "Jaki budżet przeznaczacie Państwo na wyposażenie?", type: "single_choice", required: true, order: 3, options: ["do 50 000 zł", "50 000 – 100 000 zł", "100 000 – 200 000 zł", "powyżej 200 000 zł"] } }),
  ]);

  const s1r1 = await prisma.surveyResponse.create({ data: { surveyId: survey1.id, respondentEmail: "katarzyna.nowak@demo.veedeck.com", respondentName: "Katarzyna Nowak", completedAt: new Date("2025-07-10") } });
  await prisma.surveyAnswer.createMany({ data: [
    { responseId: s1r1.id, questionId: s1q1.id, value: "Nowoczesny/minimalistyczny" },
    { responseId: s1r1.id, questionId: s1q2.id, value: "Neutralna (biele, beże, szarości)" },
    { responseId: s1r1.id, questionId: s1q3.id, value: "Funkcjonalność i przytulność. Dużo miejsca do przechowywania." },
    { responseId: s1r1.id, questionId: s1q4.id, value: "100 000 – 200 000 zł" },
  ] });

  const s1r2 = await prisma.surveyResponse.create({ data: { surveyId: survey1.id, respondentEmail: "tomasz.nowak@demo.veedeck.com", respondentName: "Tomasz Nowak", completedAt: new Date("2025-07-12") } });
  await prisma.surveyAnswer.createMany({ data: [
    { responseId: s1r2.id, questionId: s1q1.id, value: "Klasyczny/elegancki" },
    { responseId: s1r2.id, questionId: s1q2.id, value: "Ciepła (ziemiste tony, terakota)" },
    { responseId: s1r2.id, questionId: s1q3.id, value: "Dobra jakość materiałów i trwałość. Zależy nam na tym żeby to przetrwało lata." },
    { responseId: s1r2.id, questionId: s1q4.id, value: "100 000 – 200 000 zł" },
  ] });

  // Survey 2 – DRAFT
  const survey2 = await prisma.survey.create({
    data: { name: "Preferencje kolorystyczne – Wiśniewscy", slug: `pref-kolory-${ts}`, status: "DRAFT", userId, projectId: project2.id },
  });
  await prisma.surveyQuestion.createMany({ data: [
    { surveyId: survey2.id, label: "Jakie kolory mają dominować w salonie?", type: "text", order: 0, required: false },
    { surveyId: survey2.id, label: "Czy preferujecie jasne czy ciemne meble?", type: "single_choice", order: 1, required: true, options: ["Jasne (dąb, sosna, biel)", "Ciemne (orzech, wenge, czerń)", "Mieszane"] },
    { surveyId: survey2.id, label: "Jakie materiały Wam się kojarzą z domem marzeń?", type: "text", order: 2, required: false },
  ] });

  // Survey 3 – ACTIVE, 2 responses
  const survey3 = await prisma.survey.create({
    data: { name: "Ocena wizualizacji – Kowalski", slug: `ocena-wizualizacji-${ts}`, status: "ACTIVE", userId, projectId: project3.id, clientId: pc3a.id },
  });
  const [s3q1, s3q2] = await Promise.all([
    prisma.surveyQuestion.create({ data: { surveyId: survey3.id, label: "Jak oceniasz wizualizację salonu? (skala 1–5)", type: "scale", required: true, order: 0, config: { min: 1, max: 5 } } }),
    prisma.surveyQuestion.create({ data: { surveyId: survey3.id, label: "Co chciałbyś zmienić lub poprawić?", type: "text", required: false, order: 1 } }),
  ]);

  const s3r1 = await prisma.surveyResponse.create({ data: { surveyId: survey3.id, respondentEmail: "jan.kowalski.klient@demo.veedeck.com", respondentName: "Jan Kowalski", completedAt: new Date("2025-07-20") } });
  await prisma.surveyAnswer.createMany({ data: [
    { responseId: s3r1.id, questionId: s3q1.id, value: 4 },
    { responseId: s3r1.id, questionId: s3q2.id, value: "Może trochę więcej zieleni – rośliny doniczkowe byłyby miłym akcentem." },
  ] });

  const s3r2 = await prisma.surveyResponse.create({ data: { surveyId: survey3.id, respondentEmail: "agnieszka.kowalska@demo.veedeck.com", respondentName: "Agnieszka Kowalska", completedAt: new Date("2025-07-22") } });
  await prisma.surveyAnswer.createMany({ data: [
    { responseId: s3r2.id, questionId: s3q1.id, value: 5 },
    { responseId: s3r2.id, questionId: s3q2.id, value: "Wszystko świetnie! Układ mebli idealny, bardzo się cieszymy." },
  ] });

  // Survey 4 – CLOSED
  const survey4 = await prisma.survey.create({
    data: { name: "Budżet i harmonogram – Grabowska Design", slug: `budzet-harmonogram-${ts}`, status: "CLOSED", userId, projectId: project4.id },
  });
  await prisma.surveyQuestion.createMany({ data: [
    { surveyId: survey4.id, label: "Jaki jest całkowity budżet na projekt i wykonanie biura?", type: "text", order: 0, required: true },
    { surveyId: survey4.id, label: "Kiedy planujecie zakończenie prac i wprowadzenie się?", type: "text", order: 1, required: true },
    { surveyId: survey4.id, label: "Czy przewidujecie etapowanie prac?", type: "single_choice", order: 2, required: false, options: ["Tak, chcemy etapować", "Nie, robimy wszystko od razu"] },
  ] });

  // Survey 5 – DRAFT (ogólna satysfakcja)
  const survey5 = await prisma.survey.create({
    data: { name: "Ankieta satysfakcji z obsługi", slug: `satysfakcja-${ts}`, status: "DRAFT", userId },
  });
  await prisma.surveyQuestion.createMany({ data: [
    { surveyId: survey5.id, label: "Jak oceniasz współpracę z naszym studiem? (1–10)", type: "scale", order: 0, required: true, config: { min: 1, max: 10 } },
    { surveyId: survey5.id, label: "Czy poleciłbyś nasze usługi znajomym?", type: "single_choice", order: 1, required: true, options: ["Zdecydowanie tak", "Raczej tak", "Raczej nie", "Zdecydowanie nie"] },
    { surveyId: survey5.id, label: "Co moglibyśmy zrobić lepiej?", type: "text", order: 2, required: false },
  ] });

  // ─── CONTRACTOR ACCOUNTS ──────────────────────────────────────────────────
  const [hydraulikUser, elektrykUser, malarzUser] = await Promise.all([
    prisma.user.create({
      data: { email: "hydraulik@demo.veedeck.com", login: "hydraulik.kowalczyk", name: "Jan Kowalczyk", fullName: "Jan Kowalczyk", password: hash, role: "contractor" },
    }),
    prisma.user.create({
      data: { email: "elektryk@demo.veedeck.com", login: "volt.elektryk", name: "Volt Instalacje", fullName: "Volt Instalacje Elektryczne", password: hash, role: "contractor" },
    }),
    prisma.user.create({
      data: { email: "malarz@demo.veedeck.com", login: "biel.malarz", name: "Biel Malarska", fullName: "Biel Ekipa Malarska", password: hash, role: "contractor" },
    }),
  ]);

  const [contractor1, contractor2, contractor3] = await Promise.all([
    prisma.contractor.create({ data: { designerId: userId, userId: hydraulikUser.id, name: "Jan Kowalczyk", company: "Hydraulik Kowalczyk", trade: "Hydraulika i wod-kan", email: "hydraulik@demo.veedeck.com", phone: "+48 500 100 200" } }),
    prisma.contractor.create({ data: { designerId: userId, userId: elektrykUser.id, name: "Volt Instalacje Elektryczne", company: "Volt sp. z o.o.", trade: "Instalacje elektryczne", email: "elektryk@demo.veedeck.com", phone: "+48 500 200 300" } }),
    prisma.contractor.create({ data: { designerId: userId, userId: malarzUser.id, name: "Biel Ekipa Malarska", company: "Biel Prace Malarskie", trade: "Malowanie i tynkowanie", email: "malarz@demo.veedeck.com", phone: "+48 500 300 400" } }),
  ]);

  const [assignment1, assignment2, assignment3] = await Promise.all([
    prisma.contractorAssignment.create({
      data: {
        contractorId: contractor1.id, projectId: project1.id, designerId: userId,
        designerContactName: "Daniel Rychlik", designerContactPhone: "+48 601 000 001",
        investmentCity: "Kraków", investmentStreet: "ul. Szewska 12",
        investorContactName: "Katarzyna Nowak", investorContactPhone: "+48 601 234 567",
        projectNotes: "Wymiana instalacji wod-kan w łazience i kuchni. Montaż kabiny walk-in, baterie podtynkowe Hansgrohe Raindance.",
      },
    }),
    prisma.contractorAssignment.create({
      data: {
        contractorId: contractor2.id, projectId: project2.id, designerId: userId,
        designerContactName: "Daniel Rychlik", designerContactPhone: "+48 601 000 001",
        investmentCity: "Warszawa", investmentStreet: "ul. Mokotowska 44",
        investorContactName: "Beata Wiśniewska", investorContactPhone: "+48 603 456 789",
        projectNotes: "Nowa instalacja elektryczna – oświetlenie podtynkowe w całym domu. Sterownik Lutron Caseta (Apple HomeKit). Start: 1 września.",
      },
    }),
    prisma.contractorAssignment.create({
      data: {
        contractorId: contractor3.id, projectId: project3.id, designerId: userId,
        designerContactName: "Daniel Rychlik", designerContactPhone: "+48 601 000 001",
        investmentCity: "Wrocław", investmentStreet: "ul. Świdnicka 8",
        investorContactName: "Jan Kowalski", investorContactPhone: "+48 605 678 901",
        projectNotes: "Malowanie całego mieszkania. Salon: tynk strukturalny. Pozostałe pomieszczenia: gładź malowana.",
      },
    }),
  ]);

  await Promise.all([
    prisma.contractorFolder.createMany({ data: [
      { assignmentId: assignment1.id, name: "Rysunki techniczne", type: "rysunki", order: 0 },
      { assignmentId: assignment1.id, name: "Wizualizacje łazienki", type: "wizualizacje", order: 1 },
    ] }),
    prisma.contractorFolder.createMany({ data: [
      { assignmentId: assignment2.id, name: "Schematy elektryczne", type: "rysunki", order: 0 },
      { assignmentId: assignment2.id, name: "Projekt oświetlenia", type: "inne", order: 1 },
    ] }),
    prisma.contractorFolder.createMany({ data: [
      { assignmentId: assignment3.id, name: "Specyfikacja materiałów", type: "inne", order: 0 },
      { assignmentId: assignment3.id, name: "Wizualizacje kolorów", type: "wizualizacje", order: 1 },
    ] }),
  ]);

  // ─── CALENDAR EVENTS ─────────────────────────────────────────────────────
  await prisma.calendarEvent.createMany({
    data: [
      { title: "Spotkanie – Nowakowie (przegląd koncepcji)", type: "WYDARZENIE", startAt: daysFromNow(5, 14), endAt: daysFromNow(5, 16), location: "Kraków, ul. Szewska 12", description: "Prezentacja koncepcji salonu i kuchni. Omówienie wyboru materiałów i kolorów.", userId },
      { title: "Wizyta u dostawcy mebli tapicerowanych", type: "WYDARZENIE", startAt: daysFromNow(8, 10), endAt: daysFromNow(8, 13), location: "Warszawa, Galeria Meblowa Arkadia", description: "Oglądamy kolekcje dla domu Wiśniewskich.", userId },
      { title: "Odbiór próbek tkanin i farb – Nowak", type: "ZADANIE", startAt: daysFromNow(3, 9), userId },
      { title: "Termin oddania wizualizacji – Kowalski", type: "PRZYPOMNIENIE", startAt: daysFromNow(10, 8), userId },
      { title: "Konsultacja z hydraulikiem – łazienka Nowak", type: "WYDARZENIE", startAt: daysFromNow(14, 11), endAt: daysFromNow(14, 12), location: "Kraków, ul. Szewska 12", description: "Omówienie zakresu prac instalacyjnych, lokalizacja odpływów.", userId },
      { title: "Spotkanie – Grabowska Design (oświetlenie biura)", type: "WYDARZENIE", startAt: daysFromNow(18, 10), endAt: daysFromNow(18, 12), location: "Poznań, ul. Półwiejska 30", description: "Finalizacja schematu oświetlenia open space i sali konferencyjnej.", userId },
      { title: "Przypomnienie: faktura za projekt Nowak", type: "PRZYPOMNIENIE", startAt: daysFromNow(21, 9), userId },
      { title: "Targi Warsaw Home – zwiedzanie", type: "WYDARZENIE", startAt: daysFromNow(25, 10), endAt: daysFromNow(26, 17), location: "Warszawa, PTAK Warsaw Expo", description: "Szukamy inspiracji i nowych dostawców mebli i oświetlenia.", userId },
      { title: "Prezentacja finalna – Malinowski & Co.", type: "WYDARZENIE", startAt: daysFromNow(35, 14), endAt: daysFromNow(35, 16), location: "Gdańsk, ul. Długa 50", description: "Prezentacja finalnego projektu zarządowi firmy.", userId },
      { title: "Odbiór techniczny – Dom Wiśniewskich", type: "WYDARZENIE", startAt: daysFromNow(48, 10), endAt: daysFromNow(48, 14), location: "Warszawa, ul. Mokotowska 44", description: "Odbiór prac elektrycznych i instalacyjnych przed malowaniem.", userId },
    ],
  });

  // ─── NOTES ────────────────────────────────────────────────────────────────
  await prisma.note.createMany({
    data: [
      {
        userId,
        title: "Dostawcy – notatki z targów",
        content: "**Meble tapicerowane:** Sits, Olta – dobra jakość, czas realizacji 8–10 tygodni.\n\n**Oświetlenie:** Azzardo – szeroka gama opraw podtynkowych, polecam do projektu Grabowska.\n\n**Płytki:** Paradyż, kolekcja Marmo – świetna do łazienki Nowak.\n\n**Drewno podłogowe:** Barlinek, kolekcja Classico – dąb olejowany.",
      },
      {
        userId,
        title: "Projekt Nowak – notatki ze spotkania 12.06",
        content: "Katarzyna preferuje ciepłe odcienie, Tomasz woli chłodniejszą paletę.\n\nKompromis: neutralna baza (biel/jasny szary) + ciepłe akcenty w tkaninach i drewnie.\n\n**Kuchnia:** koniecznie wyspa, dużo miejsca do przechowywania, blat kwarcytowy.\n\n**Sypialnia:** łóżko 180×200, garderoba w zabudowie ok. 3 mb.",
      },
      {
        userId,
        title: "Inspiracje – styl skandynawski dla Wiśniewskich",
        content: "Wiśniewscy kochają styl skandynawski. Kluczowe elementy:\n- Drewno w naturalnych odcieniach (dąb, jesion)\n- Tkaniny boucle i len\n- Dużo roślin\n- Proste, funkcjonalne meble\n- Biel jako baza, akcenty musztardowe i zielone\n\nReferencje: Norm Architects, Muuto, Frama Studio",
      },
      {
        userId,
        title: "Cennik usług 2025 – wewnętrzny",
        content: "Projekt koncepcyjny: 150 zł/h lub ryczałt od 3 000 zł\nProjekt wykonawczy: 200 zł/h\nNadzór autorski: 800 zł/dzień\nWizualizacje: 500 zł/ujęcie\nLista zakupowa: 100 zł/h\n\n*Stawki obowiązują od 01.01.2025*",
      },
      {
        userId,
        title: "Zaległości do odhaczenia",
        content: "- [ ] Zaktualizować umowę z Malinowski & Co. – aneks dot. terminu\n- [ ] Odpowiedzieć na ofertę od dostawcy parkietu\n- [ ] Sprawdzić czy Agnieszka skończyła moodboard Grabowska\n- [ ] Zamówić archiwalne numery AD Polska 2024",
      },
    ],
  });

  // ─── DISCUSSIONS ─────────────────────────────────────────────────────────

  // 5 client discussions (one per project)
  const disc1 = await prisma.discussion.create({ data: { title: "Apartament Nowak – Kraków", type: "client", ownerId: userId, projectId: project1.id } });
  await prisma.discussionParticipant.createMany({ data: [{ discussionId: disc1.id, userId }, { discussionId: disc1.id, userId: katarzyna.id }] });
  await prisma.discussionMessage.createMany({ data: [
    { discussionId: disc1.id, content: "Cześć Katarzyno! Przesyłam pierwsze propozycje kolorów ścian w salonie. Mam dwa kierunki: ciepły beż (Farrow & Ball 'Clunch') i chłodny szary ('Purbeck Stone'). Który bardziej Wam odpowiada?", authorName: "Daniel Rychlik", userId },
    { discussionId: disc1.id, content: "Cześć Daniel! Obejrzałam obydwie opcje – bardzo mi się podoba ten beż, taki przytulny. Ale Tomasz jest za szarym... Możemy gdzieś zobaczyć próbki na żywo?", authorName: "Katarzyna Nowak", userId: katarzyna.id },
    { discussionId: disc1.id, content: "Oczywiście! Zamówię próbki i przywiozę do piątku. Mam też pomysł – możemy połączyć oba kolory: beż na ścianę z oknem, szary na ścianę z TV. To teraz bardzo popularny zabieg i myślę że będzie kompromisem dla Was obojga.", authorName: "Daniel Rychlik", userId },
    { discussionId: disc1.id, content: "O, to brzmi idealnie! Pokazałam Tomkowi i jemu też się to spodobało. Czekamy w piątek!", authorName: "Katarzyna Nowak", userId: katarzyna.id },
    { discussionId: disc1.id, content: "Super! Do zobaczenia o 17:00. Przy okazji – czy możecie zmierzyć wnękę w salonie? Mam 320cm z projektu budowlanego, ale chcę zweryfikować przed zamówieniem szafy.", authorName: "Daniel Rychlik", userId },
    { discussionId: disc1.id, content: "Zmierzę dziś wieczorem i napiszę jutro rano!", authorName: "Katarzyna Nowak", userId: katarzyna.id },
  ] });

  const disc2 = await prisma.discussion.create({ data: { title: "Dom Wiśniewskich – Warszawa", type: "client", ownerId: userId, projectId: project2.id } });
  await prisma.discussionParticipant.createMany({ data: [{ discussionId: disc2.id, userId }] });
  await prisma.discussionMessage.createMany({ data: [
    { discussionId: disc2.id, content: "Dzień dobry! Przesyłam zaktualizowany projekt salonu z jadalnią – zmieniłem układ mebli tak, żeby strefa jadalna była bliżej okna tarasowego, jak Państwo prosili.", authorName: "Daniel Rychlik", userId },
    { discussionId: disc2.id, content: "Witamy! Właśnie oglądaliśmy – zdecydowanie lepiej wygląda! Mamy tylko pytanie o oświetlenie nad stołem. Wolelibyśmy zrezygnować z żyrandola, bo mamy stół rozkładany i środek się przesuwa.", authorName: "Beata Wiśniewska", userId: null, clientEmail: "beata.wisniewska@gmail.com" },
    { discussionId: disc2.id, content: "Świetna uwaga! W takim przypadku proponuję trzy wisiorki na szynie – można je swobodnie przesuwać niezależnie od rozmiaru stołu. Mam kilka propozycji w różnych przedziałach cenowych. Przygotowuję prezentację na ten tydzień.", authorName: "Daniel Rychlik", userId },
    { discussionId: disc2.id, content: "Idealnie! Czekamy, bardzo nam się podoba to rozwiązanie.", authorName: "Beata Wiśniewska", userId: null, clientEmail: "beata.wisniewska@gmail.com" },
  ] });

  const disc3 = await prisma.discussion.create({ data: { title: "Mieszkanie Kowalskiego – Wrocław", type: "client", ownerId: userId, projectId: project3.id } });
  await prisma.discussionParticipant.createMany({ data: [{ discussionId: disc3.id, userId }, { discussionId: disc3.id, userId: janKlient.id }] });
  await prisma.discussionMessage.createMany({ data: [
    { discussionId: disc3.id, content: "Janku, wrzuciłem pierwsze renderki salonu do systemu. Jak oceniasz układ mebli? Kanapa może też pójść bardziej w stronę okna jeśli wolisz.", authorName: "Daniel Rychlik", userId },
    { discussionId: disc3.id, content: "Bardzo mi się podoba ta cegła na ścianie, pasuje do industrialnego klimatu. Chciałem zapytać – czy możemy zrobić więcej miejsca na buty przy wejściu? Mam dużą kolekcję...", authorName: "Jan Kowalski", userId: janKlient.id },
    { discussionId: disc3.id, content: "Haha, rozumiem! W przedpokoju przewidziałem wnękę 120cm – mogę tam zaproponować zabudowę na ok. 20 par + górne szafki na okrycia. Wyślę koncepcję jutro.", authorName: "Daniel Rychlik", userId },
    { discussionId: disc3.id, content: "Brzmi świetnie! Dzięki za szybką odpowiedź.", authorName: "Jan Kowalski", userId: janKlient.id },
  ] });

  const disc4 = await prisma.discussion.create({ data: { title: "Biuro Grabowska Design – Poznań", type: "client", ownerId: userId, projectId: project4.id } });
  await prisma.discussionParticipant.createMany({ data: [{ discussionId: disc4.id, userId }, { discussionId: disc4.id, userId: annaGrabowska.id }] });
  await prisma.discussionMessage.createMany({ data: [
    { discussionId: disc4.id, content: "Anno, mam pytanie przed projektowaniem akustyki – ile osób docelowo będzie pracowało w open space? To kluczowe dla doboru paneli i układu biurek.", authorName: "Daniel Rychlik", userId },
    { discussionId: disc4.id, content: "Na start 8 osób, docelowo może 12. Bardzo zależy nam na możliwości szybkiej rekonfiguracji przestrzeni – czasem robimy warsztaty dla klientów.", authorName: "Anna Grabowska", userId: annaGrabowska.id },
    { discussionId: disc4.id, content: "Rozumiem. Proponuję biurka na kółkach (Vitra WorKit) + sufitowe panele akustyczne które możemy przestawiać. Czy firma ma jakiś system hot-desking który powinienem uwzględnić?", authorName: "Daniel Rychlik", userId },
    { discussionId: disc4.id, content: "Nie na razie, ale może czas na zmiany. Muszę porozmawiać z IT i wracam do Ciebie.", authorName: "Anna Grabowska", userId: annaGrabowska.id },
    { discussionId: disc4.id, content: "Spokojnie, biorę to pod uwagę w projekcie – zrobię rozwiązanie elastyczne na obie ewentualności.", authorName: "Daniel Rychlik", userId },
  ] });

  const disc5 = await prisma.discussion.create({ data: { title: "Siedziba Malinowski & Co. – Gdańsk", type: "client", ownerId: userId, projectId: project5.id } });
  await prisma.discussionParticipant.createMany({ data: [{ discussionId: disc5.id, userId }] });
  await prisma.discussionMessage.createMany({ data: [
    { discussionId: disc5.id, content: "Dzień dobry, przesyłam koncepcję holu wejściowego. Zaproponowałem marmur Calacatta na posadzkę i okładzinę recepcji – podkreśli reprezentacyjny charakter siedziby.", authorName: "Daniel Rychlik", userId },
    { discussionId: disc5.id, content: "Bardzo ładne! Zarząd jest zachwycony. Czy mógłby Pan przygotować też wersję z czarnym granitem? Chcemy mieć porównanie przed ostateczną decyzją.", authorName: "Malinowski & Co.", userId: null, clientEmail: "biuro@malinowski.pl" },
    { discussionId: disc5.id, content: "Oczywiście, przygotuję obydwie wersje do środy. Przy okazji zestawię szacunkowe koszty materiałów żebyście mieli pełen obraz.", authorName: "Daniel Rychlik", userId },
    { discussionId: disc5.id, content: "Doskonale, czekamy. Przy okazji – pytanie o salę spotkań. Czy może być ciemniejsza, bardziej intymna? Zarząd woli mroczniejszy klimat na ważne negocjacje.", authorName: "Malinowski & Co.", userId: null, clientEmail: "biuro@malinowski.pl" },
    { discussionId: disc5.id, content: "Tak, to bardzo ciekawa koncepcja. Ciemne panele drewniane, stonowane oświetlenie, masywny stół – klasyczne rodem z kancelarii prawniczej. Zrobię też alternatywę tej sali.", authorName: "Daniel Rychlik", userId },
  ] });

  // 2 contractor discussions
  const discC1 = await prisma.discussion.create({ data: { title: "Hydraulik – Kowalczyk (Nowak, Kraków)", type: "contractor", ownerId: userId, contractorAssignmentId: assignment1.id } });
  await prisma.discussionParticipant.createMany({ data: [{ discussionId: discC1.id, userId }, { discussionId: discC1.id, userId: hydraulikUser.id }] });
  await prisma.discussionMessage.createMany({ data: [
    { discussionId: discC1.id, content: "Cześć Janie, przesyłam rysunki techniczne łazienki po ostatniej zmianie projektu. Kabina walk-in przeniosła się przy ścianę zachodnią – sprawdź czy odpływ liniowy da się tam poprowadzić.", authorName: "Daniel Rychlik", userId },
    { discussionId: discC1.id, content: "Sprawdziłem rzuty – nie ma problemu. Muszę tylko zmierzyć głębokość wylewki na miejscu, bo może być mniej miejsca przy tej ścianie. Kiedy mogę wejść?", authorName: "Jan Kowalczyk", userId: hydraulikUser.id },
    { discussionId: discC1.id, content: "Zadzwoń bezpośrednio do klientki: Katarzyna Nowak, tel. 601 234 567. Najlepiej umówić się w przyszłym tygodniu.", authorName: "Daniel Rychlik", userId },
    { discussionId: discC1.id, content: "OK, dzwonię do niej dzisiaj. Jedno pytanie – jest już decyzja w sprawie baterii podtynkowej? Grohe czy Hansgrohe?", authorName: "Jan Kowalczyk", userId: hydraulikUser.id },
    { discussionId: discC1.id, content: "Klient wybrał Hansgrohe Raindance 360 – model i dane techniczne są w dokumentacji którą wysłałem mailem w piątek.", authorName: "Daniel Rychlik", userId },
    { discussionId: discC1.id, content: "Dostałem, dziękuję. Zamawiamy materiały i za 2 tygodnie możemy zaczynać.", authorName: "Jan Kowalczyk", userId: hydraulikUser.id },
  ] });

  const discC2 = await prisma.discussion.create({ data: { title: "Elektryk – Volt (Wiśniewscy, Warszawa)", type: "contractor", ownerId: userId, contractorAssignmentId: assignment2.id } });
  await prisma.discussionParticipant.createMany({ data: [{ discussionId: discC2.id, userId }, { discussionId: discC2.id, userId: elektrykUser.id }] });
  await prisma.discussionMessage.createMany({ data: [
    { discussionId: discC2.id, content: "Cześć, wrzuciłem nowy schemat oświetlenia dla domu Wiśniewskich. W salonie trzy niezależne obwody: główne LED podtynkowe, akcent nad TV i dekoracyjne wisiorki nad jadalnią.", authorName: "Daniel Rychlik", userId },
    { discussionId: discC2.id, content: "Dostałem, analizuję. Mam ważne pytanie – czy sterownik Lutron jest już wybrany? Muszę to wiedzieć przed zakupem włączników i ściemniaczy.", authorName: "Volt Instalacje", userId: elektrykUser.id },
    { discussionId: discC2.id, content: "Klient wybrał Lutron Caseta Pro (Apple HomeKit). Pełna specyfikacja w pliku technicznym w systemie, folder 'Schematy elektryczne'.", authorName: "Daniel Rychlik", userId },
    { discussionId: discC2.id, content: "Świetnie, to mi bardzo ułatwia robotę – znam ten system dobrze. Szacuję 10 dni roboczych na całą instalację. Możemy startować 1 września jak ustalaliśmy?", authorName: "Volt Instalacje", userId: elektrykUser.id },
    { discussionId: discC2.id, content: "Potwierdzam 1 września. Budowlaniec gwarantuje że tynki i wylewki będą gotowe do 28 sierpnia.", authorName: "Daniel Rychlik", userId },
  ] });

  // 2 team member discussions
  const discT1 = await prisma.discussion.create({ data: { title: "Projekt Nowak – koordynacja", type: "internal", ownerId: userId } });
  await prisma.discussionParticipant.createMany({ data: [{ discussionId: discT1.id, userId }, { discussionId: discT1.id, userId: anna.id }, { discussionId: discT1.id, userId: piotr.id }] });
  await prisma.discussionMessage.createMany({ data: [
    { discussionId: discT1.id, content: "Annu, możesz dziś dokończyć moodboard kuchni Nowak? Klientka chce zobaczyć materiały przed piątkiem.", authorName: "Daniel Rychlik", userId },
    { discussionId: discT1.id, content: "Jasne, skończę do południa. Czy mam wrzucić tylko opcję z blatem kwarcytowym, czy też granit dla porównania?", authorName: "Anna Kowalska", userId: anna.id },
    { discussionId: discT1.id, content: "Wrzuć obie – klientka lubi mieć wybór. Piotrek, możesz przy okazji sprawdzić aktualną wycenę od Nolte zanim wyślemy propozycję?", authorName: "Daniel Rychlik", userId },
    { discussionId: discT1.id, content: "Już pytam ich handlowca, powinni odpisać jutro.", authorName: "Piotr Wiśniewski", userId: piotr.id },
    { discussionId: discT1.id, content: "Super, dzięki ekipo! Jak mam wyniki od Nolte to spinamy wszystko i idzie do klientki.", authorName: "Daniel Rychlik", userId },
  ] });

  const discT2 = await prisma.discussion.create({ data: { title: "Organizacja – urlopy i zastępstwa", type: "internal", ownerId: userId } });
  await prisma.discussionParticipant.createMany({ data: [
    { discussionId: discT2.id, userId },
    { discussionId: discT2.id, userId: anna.id },
    { discussionId: discT2.id, userId: piotr.id },
    { discussionId: discT2.id, userId: marta.id },
  ] });
  await prisma.discussionMessage.createMany({ data: [
    { discussionId: discT2.id, content: "Hej ekipo! Przypomnijcie mi proszę kiedy macie zaplanowane urlopy w sierpniu – muszę rozpisać kto kryje których klientów.", authorName: "Daniel Rychlik", userId },
    { discussionId: discT2.id, content: "Ja 10–24 sierpnia!", authorName: "Anna Kowalska", userId: anna.id },
    { discussionId: discT2.id, content: "Ja nie biorę urlopu w sierpniu, mogę kryć projekty przez cały miesiąc bez problemu.", authorName: "Piotr Wiśniewski", userId: piotr.id },
    { discussionId: discT2.id, content: "Ja 1–14 sierpnia. Czy Piotrek mógłby być osobą kontaktową dla Kowalskich i Grabowskiej w tym czasie?", authorName: "Marta Zielińska", userId: marta.id },
    { discussionId: discT2.id, content: "Piotrek kryje Kowalskich i Grabowską przez cały sierpień. Annu, Twoje projekty (Nowak, Wiśniewscy) kryjemy z Martą do 10-go, później sam. Dziękuję wszystkim – uzupełniam kalendarz!", authorName: "Daniel Rychlik", userId },
  ] });
}

function daysFromNow(days: number, hour = 10): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d;
}
