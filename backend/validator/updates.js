import { body, param } from "express-validator";

const updateTypeValues = ["general", "funding", "hiring", "milestone", "product_launch"];

const updateTagValues = ["funding", "hiring", "product", "expansion", "partnership", "pivot"];

const arrayOfStringsValidator = (fieldName, allowedValues) =>
	body(fieldName).optional().custom((value) => {
		if (value === undefined || value === null) {
			return true;
		}

		if (!Array.isArray(value)) {
			throw new Error(`${fieldName} must be an array of strings`);
		}

		const isValid = value.every(
			(item) => typeof item === "string" && item.trim().length > 0 && allowedValues.includes(item),
		);

		if (!isValid) {
			throw new Error(`${fieldName} must contain only allowed non-empty strings`);
		}

		return true;
	});

export const updateCreateValidator = [
	body("startup_id").notEmpty().withMessage("startup_id is required").isUUID().withMessage("startup_id must be a valid UUID"),
	body("title").trim().notEmpty().withMessage("Title is required").isString(),
	body("description").trim().notEmpty().withMessage("Description is required").isString(),
	body("type").trim().notEmpty().withMessage("Type is required").isIn(updateTypeValues).withMessage("Type is invalid"),
	body("tags").isArray().withMessage("tags must be an array of strings"),
	body("tags").custom((value) => {
		const isValid = value.every(
			(item) => typeof item === "string" && item.trim().length > 0 && updateTagValues.includes(item),
		);

		if (!isValid) {
			throw new Error("tags must contain only allowed non-empty strings");
		}

		return true;
	}),
];

export const updateUpdateValidator = [
	body("title").optional().trim().notEmpty().withMessage("Title cannot be empty").isString(),
	body("description").optional().trim().notEmpty().withMessage("Description cannot be empty").isString(),
	body("type").optional().trim().notEmpty().withMessage("Type cannot be empty").isIn(updateTypeValues).withMessage("Type is invalid"),
	arrayOfStringsValidator("tags", updateTagValues),
];

export const updateIdValidator = [
	param("id").isUUID().withMessage("Update id must be a valid UUID"),
];