import { body } from "express-validator";

export const loginClientValidator = [
  body("username")
    .notEmpty()
    .isString()
    .withMessage("Username is required and should be a string"),
  body("password").notEmpty().isString().withMessage("Password is required "),
];

export const changePasswordValidator = [
  body("current").notEmpty().withMessage("Current password is required"),
  body("new").notEmpty().withMessage("New password is required"),
  body("id").custom((value, { req }) => {
    if (!value && !req.body.profile_id) {
      throw new Error("ID or profile_id is required");
    }
    return true;
  }),
];