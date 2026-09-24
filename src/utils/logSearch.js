/**
 * MongoDB $where clause that matches the search text against every value
 * and key on an OCPP log, including nested payload fields.
 * The needle is embedded as a JSON string literal so user input cannot break out.
 */
function logSearchClause(searchQuery) {
  const needle = JSON.stringify(String(searchQuery).trim().toLowerCase());

  return {
    $where: `function () {
      var needle = ${needle};
      if (!needle) return true;

      function matches(value) {
        if (value == null) return false;

        var type = typeof value;
        if (type === "string" || type === "number" || type === "boolean") {
          return String(value).toLowerCase().indexOf(needle) !== -1;
        }

        if (value instanceof Date) {
          return (
            value.toISOString().toLowerCase().indexOf(needle) !== -1 ||
            String(value).toLowerCase().indexOf(needle) !== -1
          );
        }

        if (value._bsontype === "ObjectId" || value._bsontype === "ObjectID" || typeof value.toHexString === "function") {
          return String(value).toLowerCase().indexOf(needle) !== -1;
        }

        if (Array.isArray(value)) {
          for (var i = 0; i < value.length; i++) {
            if (matches(value[i])) return true;
          }
          return false;
        }

        if (type === "object") {
          for (var key in value) {
            if (!Object.prototype.hasOwnProperty.call(value, key)) continue;
            if (String(key).toLowerCase().indexOf(needle) !== -1) return true;
            if (matches(value[key])) return true;
          }
        }

        return false;
      }

      return matches(this);
    }`,
  };
}

function pageSkip(pageNo) {
  const page = Math.max(parseInt(pageNo, 10) || 1, 1);
  return 10 * (page - 1);
}

module.exports = { logSearchClause, pageSkip };
