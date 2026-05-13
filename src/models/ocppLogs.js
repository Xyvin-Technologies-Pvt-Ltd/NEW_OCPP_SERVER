const mongoose = require("mongoose");

const ocppSchema = new mongoose.Schema(
  {
    source: {
      type: String,
      enum: ["CP", "CMS"],
      required: true,
    },
    CPID: String,
    messageType: {
      type: String,
      required: true,
    },
    payload: {
      type: Object,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

ocppSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

const OCPPLOG = mongoose.model("ocpplog", ocppSchema);

module.exports = OCPPLOG;
