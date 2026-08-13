import { body, param } from "express-validator";

const stringArrayValidator = (fieldName) =>
  body(fieldName).optional({ nullable: true }).custom((value) => {
    if (!Array.isArray(value)) {
      throw new Error(`${fieldName} must be an array of strings`);
    }

    const isValid = value.every(
      (item) => typeof item === "string" && item.trim().length > 0,
    );

    if (!isValid) {
      throw new Error(`${fieldName} must contain only non-empty strings`);
    }

    return true;
  });

export const contactCreateValidator = [
  body("name").trim().notEmpty().withMessage("Name is required").isString(),
  body("email").optional({ nullable: true }).trim().isEmail().withMessage("Email is invalid"),
  body("phone")
    .optional({ nullable: true })
    .trim()
    .isString()
    .withMessage("Phone must be a string")
    .custom((value) => value.length >= 10)
    .withMessage("Phone number must be at least 10 characters long"),
  body("roles")
    .optional({ nullable: true })
    .isArray()
    .withMessage("Roles must be an array of strings")
    .custom((value) => value.every((item) => typeof item === "string" && item.trim().length > 0))
    .withMessage("Roles must contain only non-empty strings"),
  stringArrayValidator("organisation"),
  stringArrayValidator("tags"),
  body("dataset_id").optional({ nullable: true }).isUUID().withMessage("dataset_id must be a valid UUID"),
];

export const contactUpdateValidator = [
  body("name").optional().trim().notEmpty().withMessage("Name cannot be empty").isString(),
  body("email").optional({ nullable: true }).trim().isEmail().withMessage("Email is invalid"),
  body("phone")
    .optional({ nullable: true })
    .trim()
    .isString()
    .withMessage("Phone must be a string")
    .custom((value) => value.length >= 10)
    .withMessage("Phone number must be at least 10 characters long"),
  body("roles")
    .optional({ nullable: true })
    .isArray()
    .withMessage("Roles must be an array of strings")
    .custom((value) => value.every((item) => typeof item === "string" && item.trim().length > 0))
    .withMessage("Roles must contain only non-empty strings"),
  stringArrayValidator("organisation"),
  stringArrayValidator("tags"),
  body("dataset_id").optional({ nullable: true }).isUUID().withMessage("dataset_id must be a valid UUID"),
];

export const contactIdValidator = [
  param("id").isUUID().withMessage("Contact id must be a valid UUID"),
];