import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

dotenv.config();

import authrouter from "./routes/authroutes.js";
import middleware from "./middleware/authcontext.js";
import teamrouter from "./routes/teamroutes.js";
import contactrouter from "./routes/contactroutes.js";
import startuprouter from "./routes/startup/startuproutes.js";
import updaterouter from "./routes/startup/updateroutes.js";
import initiativerouter from "./routes/initiative/initiatives.js";
import initiativeteamrouter from "./routes/initiative/initiative_teams.js";
import stagerouter from "./routes/initiative/stages.js";
import taskrouter from "./routes/initiative/tasks.js";
import databasrouter from "./routes/database.js";

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);

app.options("*", cors());

app.use(cookieParser());
app.use(express.json());

app.use("/api", authrouter);
app.use("/api/teams", middleware, teamrouter);
app.use("/api/contacts", middleware, contactrouter);
app.use("/api/startups", middleware, startuprouter);
app.use("/api/updates", middleware, updaterouter);
app.use("/api/initiatives", middleware, initiativerouter);
app.use("/api/initiative-teams", middleware, initiativeteamrouter);
app.use("/api/stages", middleware, stagerouter);
app.use("/api/tasks", middleware, taskrouter);
app.use("/api/databases", middleware, databasrouter);

app.get("/api/health", (req, res) => {
  res.status(200).json({ message: "Server is healthy" });
});

// Only bind to a port when running locally (not on Vercel serverless)
if (process.env.VERCEL !== "1") {
  const port = process.env.PORT || 8000;
  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
}

export default app;
