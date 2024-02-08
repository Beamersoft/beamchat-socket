import jwt from 'jsonwebtoken';

export function authenticateToken(req, res, next) {
	const authHeader = req.headers.authorization;
	const token = authHeader && authHeader.split(' ')[1];

	if (token == null) return res.sendStatus(401);

	jwt.verify(token, process.env.BEAMCHAT_SIGN, (err, user) => {
		if (err) return res.sendStatus(403);
		req.user = user;
		next();
	});
}

export function getUserDataFromToken(req) {
	const authHeader = req.headers.authorization;
	const token = authHeader && authHeader.split(' ')[1];
	if (token == null) return null;

	const data = jwt.verify(token, process.env.BEAMCHAT_SIGN);
	return data;
}
