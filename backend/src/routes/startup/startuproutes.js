import express from "express";

import supabase from "../../utility/supabase.js";
import {
	startupCreateValidator,
	startupUpdateValidator,
	startupIdValidator,
	startupUpdateLinkValidator,
} from "../../validator/startup.js";

import { handleValidationErrors } from "../../utility/helper.js";
import { requirePrivilegedRole } from "../../utility/helper.js";
import { mapStartupPayload } from "../../utility/payload_manager.js";

import {isFounderNotFoundError} from "../../utility/errors_manager.js";

const router = express.Router();

const privilegedRoles = ["admin", "overall_coordinator", "co_overall_coordinator"];

router.post("/", startupCreateValidator, async (req, res) => {
	if (handleValidationErrors(req, res)) {
		return;
	}

	if (!requirePrivilegedRole(req, res, privilegedRoles)) {
		return;
	}

	try {
		const payload = mapStartupPayload(req.body);

		const { data, error } = await supabase
			.from("startups")
			.insert([payload])
			.select("id,created_at,name,description,edc_impact,sector,stage,engagement,year,email,phone,website,linkedin,founder_id,initiative_id,support_type")
			.single();

		if (error) {
			if (isFounderNotFoundError(error)) {
				return res.status(404).json({ message: "Founder not found", error });
			}

			return res.status(400).json({ message: error.message, error });
		}

		return res.status(201).json({ message: "Startup created successfully", data });
	} catch (err) {
		return res.status(500).json({ message: "Internal Server Error", error: err.message });
	}
});

router.get("/all", async (req, res) => {
	try {
		const { data, error } = await supabase
			.from("startups")
			.select("id,name,sector,description,founder_id,created_at,stage,engagement")
			.order("created_at", { ascending: false });

		if (error) {
			return res.status(400).json({ message: error.message, error });
		}

		return res.status(200).json({ data });
	} catch (err) {
		return res.status(500).json({ message: "Internal Server Error", error: err.message });
	}
});

router.get("/:id", startupIdValidator, async (req, res) => {
	if (handleValidationErrors(req, res)) {
		return;
	}

	try {
		const { data, error } = await supabase
			.from("startups")
			.select("*")
			.eq("id", req.params.id)
			.single();

		if (error) {
			const status = error.code === "PGRST116" ? 404 : 400;
			return res.status(status).json({ message: error.message, error });
		}

		return res.status(200).json({ data });
	} catch (err) {
		return res.status(500).json({ message: "Internal Server Error", error: err.message });
	}
});

router.post("/:id", startupIdValidator, startupUpdateLinkValidator, async (req, res) => {
	if (handleValidationErrors(req, res)) {
		return;
	}

	try {
		const { data: startup, error: startupError } = await supabase
			.from("startups")
			.select("id,updates_id")
			.eq("id", req.params.id)
			.single();

		if (startupError) {
			const status = startupError.code === "PGRST116" ? 404 : 400;
			return res.status(status).json({ message: startupError.message, error: startupError });
		}

		const currentUpdates = Array.isArray(startup.updates_id) ? startup.updates_id : [];
		const nextUpdates = currentUpdates.includes(req.body.update_id)
			? currentUpdates
			: [...currentUpdates, req.body.update_id];

		const { data, error } = await supabase
			.from("startups")
			.update({ updates_id: nextUpdates })
			.eq("id", req.params.id)
			.select("id,created_at,name,description,edc_impact,sector,stage,engagement,year,email,phone,website,linkedin,founder_id,initiative_id,support_type,updates_id")
			.single();

		if (error) {
			const status = error.code === "PGRST116" ? 404 : 400;
			return res.status(status).json({ message: error.message, error });
		}

		return res.status(200).json({ message: "Startup update linked successfully", data });
	} catch (err) {
		return res.status(500).json({ message: "Internal Server Error", error: err.message });
	}
});

router.patch("/:id", startupIdValidator, startupUpdateValidator, async (req, res) => {
	if (handleValidationErrors(req, res)) {
		return;
	}

	if (!requirePrivilegedRole(req, res, privilegedRoles)) {
		return;
	}

	try {
		const payload = mapStartupPayload(req.body);

		const { data, error } = await supabase
			.from("startups")
			.update(payload)
			.eq("id", req.params.id)
			.select("id,created_at,name,description,edc_impact,sector,stage,engagement,year,email,phone,website,linkedin,founder_id,initiative_id,support_type")
			.single();

		if (error) {
			if (isFounderNotFoundError(error)) {
				return res.status(404).json({ message: "Founder not found", error });
			}

			const status = error.code === "PGRST116" ? 404 : 400;
			return res.status(status).json({ message: error.message, error });
		}

		return res.status(200).json({ message: "Startup updated successfully", data });
	} catch (err) {
		return res.status(500).json({ message: "Internal Server Error", error: err.message });
	}
});

router.delete("/:id", startupIdValidator, async (req, res) => {
	if (handleValidationErrors(req, res)) {
		return;
	}

	if (!requirePrivilegedRole(req, res, privilegedRoles)) {
		return;
	}

	try {
		const { data, error } = await supabase
			.from("startups")
			.delete()
			.eq("id", req.params.id)
			.select("id")
			.single();

		if (error) {
			const status = error.code === "PGRST116" ? 404 : 400;
			return res.status(status).json({ message: error.message, error });
		}

		return res.status(200).json({ message: "Startup deleted successfully", data });
	} catch (err) {
		return res.status(500).json({ message: "Internal Server Error", error: err.message });
	}
});

export default router;
