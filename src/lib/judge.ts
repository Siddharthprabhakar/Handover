/** The shared demo account for judges: signs in with one click and skips the authenticator code. Set JUDGE_EMAIL and JUDGE_PASSWORD to turn it on. */
export const judgeEnabled = () => Boolean(process.env.JUDGE_EMAIL && process.env.JUDGE_PASSWORD);
export const isJudge = (email?: string | null) => Boolean(email && process.env.JUDGE_EMAIL && email.toLowerCase() === process.env.JUDGE_EMAIL.toLowerCase());
