import jwt from "jsonwebtoken";

export function issueToken(user: {
	id: string;
	email: string;
	username: string;
}): string {
	const secret = process.env.JWT_SECRET;
	if (!secret) throw new Error("JWT_SECRET not defined");

	return jwt.sign(
		{
			id: user.id,
			email: user.email,
			username: user.username,
		},
		secret,
		{ expiresIn: "7d" },
	);
}