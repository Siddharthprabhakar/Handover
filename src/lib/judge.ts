/** The shared judge login: a normal email and password account whose email is JUDGE_EMAIL. It skips the authenticator code; everyone else still needs it. */
export const isJudge = (email?: string | null) => Boolean(email && process.env.JUDGE_EMAIL && email.toLowerCase() === process.env.JUDGE_EMAIL.toLowerCase());
