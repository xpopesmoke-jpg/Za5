/** People with no daily limit on Plan readings (the app owner): ZA5_UNLIMITED_EMAILS, comma separated. */
export const unlimitedEmails = () => (process.env.ZA5_UNLIMITED_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);
