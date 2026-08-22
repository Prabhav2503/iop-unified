import express from "express";
import { validationResult } from "express-validator";

import supabase from "../utility/supabase.js";
import {
	contactCreateValidator,
	contactUpdateValidator,
	contactIdValidator,
} from "../validator/contacts.js";
import {handleValidationErrors} from "../utility/helper.js";
import {requirePrivilegedRole} from "../utility/helper.js";
import { getUserRoles } from "../utility/helper.js";
import { mapContactPayload } from "../utility/payload_manager.js";

const router = express.Router();

const privilegedRoles = [
	"admin",
	"overall_coordinator",
	"co_overall_coordinator",
	"coordinator"
];

const formatSummaryContact = (contact) => ({
	id: contact.id,
	name: contact.name,
	startup_name: Array.isArray(contact.organization)
		? contact.organization[0] ?? null
		: contact.organization ?? null,
});

router.post("/", contactCreateValidator, async (req, res) => {
	if (handleValidationErrors(req, res)) {
		return;
	}

	if (!requirePrivilegedRole(req, res, privilegedRoles)) {
		return;
	}

	try {
		const payload = mapContactPayload(req.body);

		const { data, error } = await supabase
			.from("Contacts")
			.insert([payload])
			.select("id,created_at,name,number,email,tags,organization,dataset_id,roles")
			.single();

		if (error) {
			return res.status(400).json({ message: error.message, error });
		}

		return res.status(201).json({ message: "Contact created successfully", data });
	} catch (err) {
		return res.status(500).json({ message: "Internal Server Error", error: err.message });
	}
});

router.get("/", async (req, res) => {
	try {
		const { data, error } = await supabase
			.from("Contacts")
			.select("*")
			.order("created_at", { ascending: false });

		if (error) {
			return res.status(400).json({ message: error.message, error });
		}

		return res.status(200).json({ data });
	} catch (err) {
		return res.status(500).json({ message: "Internal Server Error", error: err.message });
	}
});

router.get("/all", async (req, res) => {
	try {
		const { data, error } = await supabase
			.from("Contacts")
			.select("id,name,organization")
			.order("created_at", { ascending: false });

		if (error) {
			return res.status(400).json({ message: error.message, error });
		}

		return res.status(200).json({ data: data.map(formatSummaryContact) });
	} catch (err) {
		return res.status(500).json({ message: "Internal Server Error", error: err.message });
	}
});

router.patch("/:id", contactIdValidator, contactUpdateValidator, async (req, res) => {
	if (handleValidationErrors(req, res)) {
		return;
	}

	if (!requirePrivilegedRole(req, res, privilegedRoles)) {
		return;
	}

	try {
		const payload = mapContactPayload(req.body);

		const { data, error } = await supabase
			.from("Contacts")
			.update(payload)
			.eq("id", req.params.id)
			.select("id,created_at,name,number,email,tags,organization,dataset_id,roles")
			.single();

		if (error) {
			const status = error.code === "PGRST116" ? 404 : 400;
			return res.status(status).json({ message: error.message, error });
		}

		return res.status(200).json({ message: "Contact updated successfully", data });
	} catch (err) {
		return res.status(500).json({ message: "Internal Server Error", error: err.message });
	}
});

//update visibility
router.patch("/visibility/:id", async (req, res) => {
	if (handleValidationErrors(req, res)) {
		return;
	}

	if (!requirePrivilegedRole(req, res, privilegedRoles)) {
		return;
	}

	try {
		const contactId = req.params.id;

		// 1. First get the current visibility
		const { data: existing, error: fetchError } = await supabase
			.from("Contacts")
			.select("id, visibility")
			.eq("id", contactId)
			.single();

		if (fetchError) {
			const status = fetchError.code === "PGRST116" ? 404 : 400;
			return res.status(status).json({ message: fetchError.message, error: fetchError });
		}

		// 2. Flip the boolean
		const newVisibility = !existing.visibility;

		// 3. Update with the flipped value
		const { data, error } = await supabase
			.from("Contacts")
			.update({ visibility: newVisibility })
			.eq("id", contactId)
			.select("id, created_at, name, number, email, tags, organization, dataset_id, roles, visibility")
			.single();

		if (error) {
			const status = error.code === "PGRST116" ? 404 : 400;
			return res.status(status).json({ message: error.message, error });
		}

		return res.status(200).json({
			message: `Contact visibility set to ${newVisibility}`,
			data,
		});
	} catch (err) {
		return res.status(500).json({
			message: "Internal Server Error",
			error: err.message,
		});
	}
});

router.delete("/:id", contactIdValidator, async (req, res) => {
	if (handleValidationErrors(req, res)) {
		return;
	}

	if (!requirePrivilegedRole(req, res, privilegedRoles)) {
		return;
	}

	try {
		const { data, error } = await supabase
			.from("Contacts")
			.delete()
			.eq("id", req.params.id)
			.select("id")
			.single();

		if (error) {
			const status = error.code === "PGRST116" ? 404 : 400;
			return res.status(status).json({ message: error.message, error });
		}

		return res.status(200).json({ message: "Contact deleted successfully", data });
	} catch (err) {
		return res.status(500).json({ message: "Internal Server Error", error: err.message });
	}
});

export default router;
