import { body, param } from "express-validator";

export const initiativeCreateValidator = [
  body("name").trim().notEmpty().withMessage("Name is required").isString(),
  body("created_by").notEmpty().withMessage("Created By cannot be empty"),
  body("status").optional().isString().withMessage("Status must be a string"),
  body("description").optional({ nullable: true }).isString(),
  body("impact").optional({ nullable: true }).isString(),
  body("deadline").optional({ nullable: true }).isISO8601().toDate().withMessage("Deadline must be a valid date"),
  body("whatsapp_link").optional({ nullable: true }).isString(),
];

export const initiativeTeamValidator = [
  param("id").isUUID().withMessage("Valid Initiative ID is required"),
  body().isArray({ min: 1 }).withMessage("Body must be an array of team UUIDs"),
  body("*").isUUID().withMessage("Each element must be a valid UUID")
];

export const stageCreateValidator = [
  param("id").isUUID().withMessage("Valid Initiative ID is required"),
  body("name").trim().notEmpty().withMessage("Stage name is required").isString(),
];

export const taskCreateValidator = [
  body("title").trim().notEmpty().withMessage("Title is required").isString(),
  body("creator_id").isUUID().withMessage("Creator ID must be a valid UUID"),
  body("initiative_id").optional({ nullable: true }).isUUID().withMessage("Initiative ID must be a valid UUID"),
  body("stage_id").optional({ nullable: true }).isUUID().withMessage("Stage ID must be a valid UUID"),
  body("priority").optional().isString().withMessage("Priority must be a string"),
  body("status").optional().isString().withMessage("Status must be a string"),
  body("deadline").optional({ nullable: true }),
  body("assignees").isArray().withMessage("Assignees must be an array of UUIDs"),
  body("assignees.*").isUUID().withMessage("Each assignee must be a valid UUID"),
];

export const taskUpdateValidator = [
  body("title").optional().trim().notEmpty().withMessage("Title cannot be empty").isString(),
  body("deadline").optional({ nullable: true }),
  body("status").optional().isString().withMessage("Status must be a string"),
  body("priority").optional().isString().withMessage("Priority must be a string"),
  body("stage_id").optional().isUUID().withMessage("Stage ID must be a valid UUID"),
];

export const initiativeIdValidator = [
  param("id").isUUID().withMessage("Valid Initiative ID is required"),
];

export const stageIdValidator = [
  param("id").isUUID().withMessage("Valid Stage ID is required"),
];

export const initiativeUpdateValidator = [
  body("name").optional().trim().notEmpty().withMessage("Name cannot be empty").isString(),
  body("description").optional({ nullable: true }).isString(),
  body("impact").optional({ nullable: true }).isString(),
  body("deadline").optional({ nullable: true }),
  body("status").optional().isString(),
  body("whatsapp_link").optional({ nullable: true }).isString(),
];
