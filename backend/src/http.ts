import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import { SpecError } from "./domain/rules.js";
import type { Actor, Role } from "./domain/types.js";
import * as service from "./service.js";
import type { Store } from "./store/types.js";

const secret = () => process.env.JWT_SECRET ?? "dev-secret";

interface AuthedRequest extends Request {
  actor?: Actor;
}

function asyncRoute(handler: (req: AuthedRequest, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res).catch(next);
  };
}

function requireAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  const header = req.header("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) {
    next(new SpecError("SPEC-AUTH-01", "未登录", 401));
    return;
  }
  try {
    req.actor = jwt.verify(token, secret()) as Actor;
    next();
  } catch {
    next(new SpecError("SPEC-AUTH-01", "未登录", 401));
  }
}

export function createApp(store: Store) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.post(
    "/api/auth/login",
    asyncRoute(async (req, res) => {
      const { account, password, role } = req.body as { account: string; password: string; role: Role };
      const user = await service.login(store, { account, password, role });
      const token = jwt.sign(user, secret(), { expiresIn: "12h" });
      res.json({ token, user });
    }),
  );

  app.use("/api", requireAuth);

  app.get("/api/course-types", asyncRoute(async (req, res) => {
    res.json(await service.listCourseTypes(store, req.actor!));
  }));
  app.get("/api/teachers", asyncRoute(async (req, res) => {
    res.json(await service.listTeachers(store, req.actor!));
  }));
  app.get("/api/trials", asyncRoute(async (req, res) => {
    res.json(await service.listTrials(store, req.actor!));
  }));
  app.post("/api/trials", asyncRoute(async (req, res) => {
    res.status(201).json(await service.createTrial(store, req.actor!, req.body));
  }));
  app.put("/api/trials/:id", asyncRoute(async (req, res) => {
    res.json(await service.updateTrial(store, req.actor!, Number(req.params.id), req.body));
  }));
  app.get("/api/trials/:id/follow-ups", asyncRoute(async (req, res) => {
    res.json(await service.listTrialFollowUps(store, req.actor!, Number(req.params.id)));
  }));
  app.post("/api/trials/:id/visits", asyncRoute(async (req, res) => {
    res.status(201).json(await service.createTrialVisit(store, req.actor!, Number(req.params.id), req.body));
  }));
  app.delete("/api/trials/:id/visits/:visitId", asyncRoute(async (req, res) => {
    await service.deleteTrialVisit(store, req.actor!, Number(req.params.id), Number(req.params.visitId));
    res.status(204).end();
  }));
  app.post("/api/trials/:id/assists", asyncRoute(async (req, res) => {
    res.status(201).json(await service.generateTrialAssist(store, req.actor!, Number(req.params.id)));
  }));
  app.get("/api/students", asyncRoute(async (req, res) => {
    res.json(await service.listStudents(store, req.actor!, String(req.query.keyword ?? "")));
  }));
  app.post("/api/students", asyncRoute(async (req, res) => {
    res.status(201).json(await service.createStudent(store, req.actor!, req.body));
  }));
  app.delete("/api/students/:id", asyncRoute(async (req, res) => {
    await service.deleteStudent(store, req.actor!, Number(req.params.id));
    res.status(204).end();
  }));
  app.get("/api/purchases", asyncRoute(async (req, res) => {
    res.json(await service.listPurchases(store, req.actor!, String(req.query.keyword ?? "")));
  }));
  app.post("/api/purchases", asyncRoute(async (req, res) => {
    res.status(201).json(await service.createPurchase(store, req.actor!, req.body));
  }));
  app.get("/api/classes", asyncRoute(async (req, res) => {
    res.json(await service.listClasses(store, req.actor!));
  }));
  app.post("/api/classes", asyncRoute(async (req, res) => {
    res.status(201).json(await service.createClass(store, req.actor!, req.body));
  }));
  app.post("/api/classes/:id/students", asyncRoute(async (req, res) => {
    await service.assignStudent(store, req.actor!, Number(req.params.id), Number(req.body.studentId));
    res.status(204).end();
  }));
  app.get("/api/classes/:id/sessions", asyncRoute(async (req, res) => {
    res.json(await service.listClassSessions(store, req.actor!, Number(req.params.id)));
  }));
  app.get("/api/teacher/classes", asyncRoute(async (req, res) => {
    res.json(await service.listTeacherClasses(store, req.actor!));
  }));
  app.get("/api/teacher/classes/:id/students", asyncRoute(async (req, res) => {
    res.json(await service.listTeacherStudents(store, req.actor!, Number(req.params.id)));
  }));
  app.get("/api/teacher/classes/:id/sessions", asyncRoute(async (req, res) => {
    res.json(await service.listSessions(store, req.actor!, Number(req.params.id)));
  }));
  app.post("/api/teacher/classes/:id/sessions", asyncRoute(async (req, res) => {
    res.status(201).json(await service.createSession(store, req.actor!, Number(req.params.id), req.body));
  }));
  app.patch("/api/teacher/sessions/:id", asyncRoute(async (req, res) => {
    res.json(await service.updateSession(store, req.actor!, Number(req.params.id), req.body));
  }));
  app.get("/api/teacher/sessions/:id/attendance", asyncRoute(async (req, res) => {
    res.json(await service.attendanceSheet(store, req.actor!, Number(req.params.id)));
  }));
  app.post("/api/teacher/sessions/:id/attendance", asyncRoute(async (req, res) => {
    await service.submitAttendance(store, req.actor!, Number(req.params.id), req.body.items ?? []);
    res.status(204).end();
  }));

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof SpecError) {
      res.status(error.status).json({ error: error.message, code: error.code });
      return;
    }
    res.status(500).json({ error: "服务器错误", code: "INTERNAL" });
  });

  return app;
}
