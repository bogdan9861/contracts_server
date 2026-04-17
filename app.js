const express = require("express");
const cors = require("cors");
const logger = require("morgan");
const path = require("path");
require("dotenv").config();

const {
  startMaintenanceScheduler,
} = require("./scheduler/maintenance.scheduler");
const { startOverdueScheduler } = require("./scheduler/overdue.scheduler");

startMaintenanceScheduler();
startOverdueScheduler();

const app = express();

app.use(cors({ origin: "*" }));

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use("/public", express.static(path.join(__dirname, "public")));

app.use("/api/users", require("./routes/users"));
app.use("/api/clients", require("./routes/clients"));
app.use("/api/contracts", require("./routes/contracts"));
app.use("/api/dashboard", require("./routes/dashboard"));
app.use("/api/logs", require("./routes/auditLogs"));

module.exports = app;
