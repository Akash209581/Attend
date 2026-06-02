const jwt = require('jsonwebtoken');

const verifyToken = (secret) => (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer '))
        return res.status(401).json({ message: 'No token provided' });

    const token = authHeader.split(' ')[1];
    try {
        req.user = jwt.verify(token, secret || process.env.JWT_SECRET);
        next();
    } catch {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
};

const adminAuth = verifyToken(process.env.JWT_SECRET);

const studentAuth = (req, res, next) => {
    verifyToken(process.env.JWT_SECRET)(req, res, () => {
        if (req.user.role !== 'student')
            return res.status(403).json({ message: 'Access denied: students only' });
        next();
    });
};

const adminOnly = (req, res, next) => {
    verifyToken(process.env.JWT_SECRET)(req, res, () => {
        if (req.user.role !== 'admin')
            return res.status(403).json({ message: 'Access denied: admins only' });
        next();
    });
};

const superAdminOnly = (req, res, next) => {
    adminOnly(req, res, () => {
        if (req.user.adminRole !== 'super_admin') {
            return res.status(403).json({ message: 'Access denied: action restricted to super admins only' });
        }
        next();
    });
};

module.exports = { adminAuth, studentAuth, adminOnly, superAdminOnly };
