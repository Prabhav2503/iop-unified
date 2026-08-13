import { body, param } from "express-validator";

export const startupCreateValidator = [
	body("name").trim().notEmpty().withMessage("Name is required").isString(),
	body("description").trim().notEmpty().withMessage("Description is required").isString(),
	body("edc_impact").trim().notEmpty().withMessage("edc_impact is required").isString(),
	body("sector").trim().notEmpty().withMessage("Sector is required").isString(),
	body("stage").trim().notEmpty().withMessage("Stage is required").isString(),
	body("engagement").trim().notEmpty().withMessage("Engagement is required").isString(),
	body("year")
		.notEmpty()
		.withMessage("Year is required")
		.isInt({ min: 1900, max: 9999 })
		.withMessage("Year must be a valid integer"),
	body("email").optional({ nullable: true }).trim().isEmail().withMessage("Email is invalid"),
	body("phone")
		.optional({ nullable: true })
		.trim()
		.isString()
		.withMessage("Phone must be a string"),
	body("website").optional({ nullable: true }).trim().isURL().withMessage("Website is invalid"),
	body("linkedin").optional({ nullable: true }).trim().isURL().withMessage("Linkedin is invalid"),
	body("founder_id").optional({ nullable: true }).isUUID().withMessage("founder_id must be a valid UUID"),
	body("initiative_id").optional({ nullable: true }).isUUID().withMessage("initiative_id must be a valid UUID"),
	body("support_type").optional({ nullable: true }).trim().isString().withMessage("Support type must be a string"),
];

export const startupUpdateValidator = [
	body("name").optional().trim().notEmpty().withMessage("Name cannot be empty").isString(),
	body("description").optional().trim().notEmpty().withMessage("Description cannot be empty").isString(),
	body("edc_impact").optional().trim().notEmpty().withMessage("edc_impact cannot be empty").isString(),
	body("sector").optional().trim().notEmpty().withMessage("Sector cannot be empty").isString(),
	body("stage").optional().trim().notEmpty().withMessage("Stage cannot be empty").isString(),
	body("engagement").optional().trim().notEmpty().withMessage("Engagement cannot be empty").isString(),
	body("year")
		.optional()
		.notEmpty()
		.withMessage("Year cannot be empty")
		.isInt({ min: 1900, max: 9999 })
		.withMessage("Year must be a valid integer"),
	body("email").optional({ nullable: true }).trim().isEmail().withMessage("Email is invalid"),
	body("phone")
		.optional({ nullable: true })
		.trim()
		.isString()
		.withMessage("Phone must be a string"),
	body("website").optional({ nullable: true }).trim().isURL().withMessage("Website is invalid"),
	body("linkedin").optional({ nullable: true }).trim().isURL().withMessage("Linkedin is invalid"),
	body("founder_id").optional({ nullable: true }).isUUID().withMessage("founder_id must be a valid UUID"),
	body("initiative_id").optional({ nullable: true }).isUUID().withMessage("initiative_id must be a valid UUID"),
	body("support_type").optional({ nullable: true }).trim().isString().withMessage("Support type must be a string"),
];

export const startupIdValidator = [
	param("id").isUUID().withMessage("Startup id must be a valid UUID"),
];

export const startupUpdateLinkValidator = [
	body("update_id").notEmpty().withMessage("update_id is required").isUUID().withMessage("update_id must be a valid UUID"),
];