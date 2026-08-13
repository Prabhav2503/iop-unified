import { body, param } from "express-validator";

export const databaseCreateValidator = [
  body("drive_url")
    .trim()
    .notEmpty()
    .withMessage("Drive URL is required")
    .isURL()
    .withMessage("Drive URL must be a valid URL"),
  body("name").trim().notEmpty().withMessage("Name is required").isString(),
  body("description").trim().notEmpty().withMessage("Description is required").isString(),
  body("created_by").optional().isUUID().withMessage("Created By must be a valid UUID"),
];

export const databaseUpdateValidator = [
  body("drive_url")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Drive URL cannot be empty")
    .isURL()
    .withMessage("Drive URL must be a valid URL"),
  body("name").optional().trim().notEmpty().withMessage("Name cannot be empty").isString(),
  body("description").optional().trim().notEmpty().withMessage("Description cannot be empty").isString(),
  body("created_by").optional().isUUID().withMessage("Created By must be a valid UUID"),
];

export const databaseIdValidator = [
  param("id").isUUID().withMessage("Valid Database ID is required"),
];
