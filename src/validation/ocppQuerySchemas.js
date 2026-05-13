const Joi = require("joi");

const dashboardTransactionListQuery = Joi.object({
  pageNo: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(10),
  searchQuery: Joi.string().allow("").optional(),
  startDate: Joi.string().optional(),
  endDate: Joi.string().optional(),
});

module.exports = { dashboardTransactionListQuery };
