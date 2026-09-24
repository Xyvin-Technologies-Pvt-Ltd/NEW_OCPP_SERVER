/**
 * Atlas-safe charger-log search (no $where / $function).
 * Flattens nested payload keys/values into a string and $regexMatches it,
 * along with top-level log fields and optional persisted searchText.
 */

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function asSearchString(valueExpr) {
  return {
    $convert: {
      input: valueExpr,
      to: "string",
      onError: "",
      onNull: "",
    },
  };
}

/** Recursively flatten objects/arrays into a searchable string (Atlas-safe). */
function valueToSearchString(valueExpr, depth) {
  if (depth <= 0) {
    return asSearchString(valueExpr);
  }

  return {
    $switch: {
      branches: [
        {
          case: { $eq: [{ $type: valueExpr }, "object"] },
          then: {
            $reduce: {
              input: { $objectToArray: { $ifNull: [valueExpr, {}] } },
              initialValue: "",
              in: {
                $concat: [
                  "$$value",
                  " ",
                  asSearchString("$$this.k"),
                  " ",
                  valueToSearchString("$$this.v", depth - 1),
                ],
              },
            },
          },
        },
        {
          case: { $eq: [{ $type: valueExpr }, "array"] },
          then: {
            $reduce: {
              input: { $ifNull: [valueExpr, []] },
              initialValue: "",
              in: {
                $concat: [
                  "$$value",
                  " ",
                  valueToSearchString("$$this", depth - 1),
                ],
              },
            },
          },
        },
      ],
      default: asSearchString(valueExpr),
    },
  };
}

function buildSearchableDocument() {
  return {
    $concat: [
      { $ifNull: ["$searchText", ""] },
      " ",
      { $ifNull: ["$CPID", ""] },
      " ",
      { $ifNull: ["$messageType", ""] },
      " ",
      { $ifNull: ["$source", ""] },
      " ",
      asSearchString("$_id"),
      " ",
      asSearchString("$createdAt"),
      " ",
      asSearchString("$updatedAt"),
      " ",
      valueToSearchString("$payload", 6),
    ],
  };
}

function logSearchClause(searchQuery) {
  const trimmed = String(searchQuery ?? "").trim();
  if (!trimmed) return {};

  return {
    $expr: {
      $regexMatch: {
        input: buildSearchableDocument(),
        regex: escapeRegex(trimmed),
        options: "i",
      },
    },
  };
}

function pageSkip(pageNo) {
  const page = Math.max(parseInt(pageNo, 10) || 1, 1);
  return 10 * (page - 1);
}

/** Persistable blob so future searches stay cheap and complete. */
function buildSearchText({ CPID, messageType, source, payload }) {
  return [CPID, messageType, source, JSON.stringify(payload ?? {})]
    .filter((part) => part != null && part !== "")
    .join(" ")
    .toLowerCase();
}

module.exports = {
  logSearchClause,
  pageSkip,
  buildSearchText,
  escapeRegex,
};
