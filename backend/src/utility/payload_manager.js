export const mapStartupPayload = (body) => ({
	name: body.name,
	description: body.description,
	edc_impact: body.edc_impact,
	sector: body.sector,
	stage: body.stage,
	engagement: body.engagement,
	year: body.year,
	email: body.email ?? null,
	phone: body.phone ?? null,
	website: body.website ?? null,
	linkedin: body.linkedin ?? null,
	founder_id: body.founder_id ?? null,
	initiative_id: body.initiative_id ?? null,
	support_type: body.support_type ?? null,
});

export const mapContactPayload = (body) => ({
	name: body.name,
	email: body.email ?? null,
	number: body.phone ?? body.number ?? null,
	roles: body.roles ?? null,
	organization: body.organisation ?? body.organization ?? null,
	tags: body.tags ?? null,
	dataset_id: body.dataset_id ?? body.datasetId ?? null,
});

export const mapUpdatePayload = (body) => ({
	startup_id: body.startup_id ?? null,
	title: body.title,
	description: body.description,
	type: body.type,
	tags: body.tags ?? null,
});

export const mapInitiativePayload = (body, userId) => ({
	name: body.name,
	description: body.description ?? null,
	impact: body.impact ?? null,
	deadline: body.deadline ?? null,
	status: body.status ?? null,
	whatsapp_link: body.whatsapp_link ?? body.whatsappLink ?? null,
	created_by: userId,
});

export const mapTaskPayload = (body) => ({
	title: body.title,
	creator_id: body.creator_id,
	initiative_id: body.initiative_id ?? null,
	priority: body.priority ?? null,
	deadline: body.deadline ?? null,
	status: body.status ?? "pending",
});

export const mapTaskUpdatePayload = (body) => {
	const payload = {};
	if (body.title !== undefined) payload.title = body.title;
	if (body.deadline !== undefined) payload.deadline = body.deadline;
	if (body.status !== undefined) payload.status = body.status;
	if (body.priority !== undefined) payload.priority = body.priority;
	return payload;
};

export const normalizeAssigneeIds = (value) => {
	if (value == null || value === "") return [];
	const list = Array.isArray(value) ? value : [value];
	const ids = [];
	const seen = new Set();

	for (const item of list) {
		const raw =
			item && typeof item === "object"
				? item.team_id || item.id || item.profile_id
				: item;
		const id = String(raw ?? "").trim();
		if (!id) continue;
		const key = id.toLowerCase();
		if (seen.has(key)) continue;
		seen.add(key);
		ids.push(id);
	}

	return ids;
};

export const shapeTask = (task) => {
	if (!task) return task;
	return {
		...task,
		assignees: normalizeAssigneeIds(task.task_assignees),
	};
};