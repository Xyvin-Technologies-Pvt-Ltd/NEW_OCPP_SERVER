 function isMongoId(value) {
    const mongoIdRegex = /^[0-9a-fA-F]{24}$/;
    return mongoIdRegex.test(value);
  }

  module.exports = {isMongoId}