import { Router, type IRouter } from "express";
import healthRouter from "./health";
import documentsRouter from "./documents";
import knowledgeGraphRouter from "./knowledgeGraph";
import complianceRouter from "./compliance";
import maintenanceRouter from "./maintenance";
import copilotRouter from "./copilot";
import dashboardRouter from "./dashboard";
import drawingsRouter from "./drawings";
import qmsRouter from "./qms";

const router: IRouter = Router();

router.use(healthRouter);
router.use(documentsRouter);
router.use(knowledgeGraphRouter);
router.use(complianceRouter);
router.use(maintenanceRouter);
router.use(copilotRouter);
router.use(dashboardRouter);
router.use(drawingsRouter);
router.use(qmsRouter);

export default router;
