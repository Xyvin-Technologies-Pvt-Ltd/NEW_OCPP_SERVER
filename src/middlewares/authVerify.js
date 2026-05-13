const jwt = require("jsonwebtoken");

const authVerify = (req, res, next) => {
  const secret = process.env.ACCESS_TOKEN_SECRET;
  if (!secret) {
    return res.status(500).json({ message: "Server misconfigured" });
  }

  const header = req.headers.authorization;
  const jwt_token = header && header.split(" ")[1];

  if (!jwt_token) {
    return res.status(401).json({ message: "No token provided" });
  }

  jwt.verify(jwt_token, secret, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Failed to authenticate token" });
    }
    req.role = decoded.role;
    req.userId = decoded.userId;
    req.roleId = decoded.roleId;
    return next();
  });
};

module.exports = authVerify;
