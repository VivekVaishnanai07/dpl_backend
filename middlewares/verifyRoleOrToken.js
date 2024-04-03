const jwt = require('jsonwebtoken');

// Middleware to verify token
const verifyRoleOrToken = (requiredRoles) => {
  return (req, res, next) => {
    const tokenWithBearer = req.headers['authorization'];
    const token = tokenWithBearer.substring(7);

    if (!token) {
      return res.status(401).json({ message: 'Token not provided' });
    }

    jwt.verify(token, process.env.JWT_SECRET_KEY, (err, decoded) => {
      if (err) {
        console.error(err)
        if (err.name === 'TokenExpiredError') {
          return res.status(401).json({ message: 'Invalid token' });
        } else {
          return res.status(401).json({ message: 'Token expired' });
        }
      }

      if (!requiredRoles.includes(decoded.role)) {
        return res.status(403).json({ message: 'Only admin can access this endpoint' });
      }

      req.user = decoded;
      next();
    });
  };
};

module.exports = verifyRoleOrToken;