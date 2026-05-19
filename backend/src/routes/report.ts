// src/routes/report.ts
import { Hono } from "hono";
import { logService } from "../services/logService";

const app = new Hono();

app.get("/report", (c) => {
  return c.json({ success: true, data: { logs: logService.getLogs(), stats: logService.getStats() } });
});

app.get("/report/export/csv", (c) => {
  const csv = logService.getLogsAsCSV();
  c.header("Content-Type", "text/csv");
  c.header("Content-Disposition", 'attachment; filename="email-logs.csv"');
  return c.text(csv);
});

app.get("/report/export/json", (c) => {
  const json = logService.getLogsAsJSON();
  c.header("Content-Type", "application/json");
  c.header("Content-Disposition", 'attachment; filename="email-logs.json"');
  return c.text(json);
});

app.delete("/report/clear", (c) => {
  logService.clearLogs();
  return c.json({ success: true, message: "Logs cleared successfully" });
});

export default app;
