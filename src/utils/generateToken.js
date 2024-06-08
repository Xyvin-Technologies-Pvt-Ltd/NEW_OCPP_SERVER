const jwt = require("jsonwebtoken");
require("dotenv").config();
const { getSecret } = require("../config/env.config");

const generateToken = async (id) => {
  let ACCESS_TOKEN_SECRET;
  if (process.env.NODE_ENV !== "production") {
    ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
  } else {
    const jwtSecret = await getSecret();
    ACCESS_TOKEN_SECRET = jwtSecret.ACCESS_TOKEN_SECRET;
  }
  return jwt.sign({ id }, ACCESS_TOKEN_SECRET, {
    expiresIn: "1y",
  });
};

module.exports = generateToken;
