import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

dotenv.config();

import authrouter from "./src/routes/authroutes.js";
import middleware from "./src/middleware/authcontext.js";
import teamrouter from "./src/routes/teamroutes.js";
import contactrouter from "./src/routes/contactroutes.js";
import startuprouter from "./src/routes/startup/startuproutes.js";
import updaterouter from "./src/routes/startup/updateroutes.js";
import initiativerouter from "./src/routes/initiative/initiatives.js";
import initiativeteamrouter from "./src/routes/initiative/initiative_teams.js";
import stagerouter from "./src/routes/initiative/stages.js";
import taskrouter from "./src/routes/initiative/tasks.js";
import databasrouter from "./src/routes/database.js";

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:8080",
  "https://iop-edciitd.web.app",
  "https://iop-frontend.vercel.app",
];

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

// uncomment the following lines if you want to run the server directly from this file

// const port = process.env.PORT || 5000;

// app.listen(port, () => {
//   console.log(`Server is running on port ${port}`);
// });

export default app;
