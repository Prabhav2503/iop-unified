export const isFounderNotFoundError = (error) => {
    return error?.code === "23503" && (
        error?.details?.includes("founder_id") ||
        error?.message?.includes("startups_founder_id_fkey")
    );
};
