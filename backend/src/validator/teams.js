import { body, param } from "express-validator";

const roleValues = [
	"admin",
	"overall_coordinator",
	"co_overall_coordinator",
	"coordinator",
	"executive",
];

const verticalValues = [
	"All",
	"Overall Coordinators",
	"Admin & Finance",
	"OC-Office",
	"Corporate Relations",
	"Events",
	"Marketing & Strategic Partnerships",
	"Publicity",
	"Startup Support",
	"Media",
	"Design",
	"Content",
	"Technical",
];

const arrayOfStringsValidator = (fieldName) =>
	body(fieldName).optional().custom((value) => {
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

export const normalizeTeamPayload = (req, res, next) => {
	if (req.body && !Array.isArray(req.body) && typeof req.body === "object") {
		req.body = [req.body];
	}
	next();
};

export const teamCreateValidator = [
	normalizeTeamPayload,
	body("*.name").trim().notEmpty().withMessage("Name is required").isString(),
	body("*.role")
		.isArray({ min: 1 })
		.withMessage("Role must be an array of roles")
		.custom((value) => value.every((item) => roleValues.includes(item)))
		.withMessage("Role is invalid"),
	body("*.email")
		.trim()
		.notEmpty()
		.withMessage("Email is required")
		.isEmail()
		.withMessage("Email is invalid"),
	body("*.number").trim().notEmpty().withMessage("Number is required").isString(),
	body("*.vertical")
		.notEmpty()
		.withMessage("Vertical is required")
		.isIn(verticalValues)
		.withMessage("Vertical is invalid"),
	arrayOfStringsValidator("*.initiative"),
	arrayOfStringsValidator("*.tasks"),
	arrayOfStringsValidator("*.contribution"),
];

export const teamUpdateValidator = [
	body("name").optional().trim().notEmpty().withMessage("Name cannot be empty").isString(),
	body("role")
		.optional()
		.isArray({ min: 1 })
		.withMessage("Role must be an array of roles")
		.custom((value) => value.every((item) => roleValues.includes(item)))
		.withMessage("Role is invalid"),
	body("email")
		.optional()
		.trim()
		.notEmpty()
		.withMessage("Email cannot be empty")
		.isEmail()
		.withMessage("Email is invalid"),
	body("number").optional().trim().notEmpty().withMessage("Number cannot be empty").isString(),
	body("vertical")
		.optional()
		.notEmpty()
		.withMessage("Vertical cannot be empty")
		.isIn(verticalValues)
		.withMessage("Vertical is invalid"),
	arrayOfStringsValidator("initiative"),
	arrayOfStringsValidator("tasks"),
	arrayOfStringsValidator("contribution"),
];

export { roleValues, verticalValues };
