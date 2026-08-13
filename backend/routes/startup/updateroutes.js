import express from "express";

import supabase from "../../utility/supabase.js";
import {
	updateCreateValidator,
	updateUpdateValidator,
	updateIdValidator,
} from "../../validator/updates.js";
import { handleValidationErrors } from "../../utility/helper.js";
import { requirePrivilegedRole } from "../../utility/helper.js";
import { mapUpdatePayload } from "../../utility/payload_manager.js";

const router = express.Router();

const privilegedRoles = ["admin", "overall_coordinator", "co_overall_coordinator"];

router.post("/", updateCreateValidator, async (req, res) => {
	if (handleValidationErrors(req, res)) {
		return;
	}


	try {
		const payload = mapUpdatePayload(req.body);

		const { data, error } = await supabase
			.from("updates")
			.insert([payload])
			.select("id,created_at,startup_id,title,description,type,tags")
			.single();

		if (error) {
			return res.status(400).json({ message: error.message, error });
		}

		return res.status(201).json({ message: "Update created successfully", data });
	} catch (err) {
		return res.status(500).json({ message: "Internal Server Error", error: err.message });
	}
});

router.get("/all", async (req, res) => {
	try {
		const { data, error } = await supabase
			.from("updates")
			.select("id,startup_id,created_at,title,description,type,tags")
			.order("created_at", { ascending: false });

		if (error) {
			return res.status(400).json({ message: error.message, error });
		}

		return res.status(200).json({ data });
	} catch (err) {
		return res.status(500).json({ message: "Internal Server Error", error: err.message });
	}
});

router.get("/:id", updateIdValidator, async (req, res) => {
	if (handleValidationErrors(req, res)) {
		return;
	}

	try {
		const { data, error } = await supabase
			.from("updates")
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

router.patch("/:id", updateIdValidator, updateUpdateValidator, async (req, res) => {
	if (handleValidationErrors(req, res)) {
		return;
	}

	if (!requirePrivilegedRole(req, res, privilegedRoles)) {
		return;
	}

	try {
		const payload = mapUpdatePayload(req.body);
		delete payload.startup_id;

		const { data, error } = await supabase
			.from("updates")
			.update(payload)
			.eq("id", req.params.id)
			.select("id,created_at,startup_id,title,description,type,tags")
			.single();

		if (error) {
			const status = error.code === "PGRST116" ? 404 : 400;
			return res.status(status).json({ message: error.message, error });
		}

		return res.status(200).json({ message: "Update updated successfully", data });
	} catch (err) {
		return res.status(500).json({ message: "Internal Server Error", error: err.message });
	}
});

router.delete("/:id", updateIdValidator, async (req, res) => {
	if (handleValidationErrors(req, res)) {
		return;
	}

	if (!requirePrivilegedRole(req, res, privilegedRoles)) {
		return;
	}

	try {
		const { data, error } = await supabase
			.from("updates")
			.delete()
			.eq("id", req.params.id)
			.select("id")
			.single();

		if (error) {
			const status = error.code === "PGRST116" ? 404 : 400;
			return res.status(status).json({ message: error.message, error });
		}

		return res.status(200).json({ message: "Update deleted successfully", data });
	} catch (err) {
		return res.status(500).json({ message: "Internal Server Error", error: err.message });
	}
});

export default router;