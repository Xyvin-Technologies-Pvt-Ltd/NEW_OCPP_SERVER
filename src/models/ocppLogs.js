const mongoose = require("mongoose");

// Define the RFID Tag schema
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
    // Lowercased concatenation of searchable fields (Atlas-safe regex target)
    searchText: {
      type: String,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Create a TTL index on the timestamp field with a TTL of 24 hours (in seconds)
ocppSchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

const OCPPLOG = mongoose.model("ocpplog", ocppSchema);

module.exports = OCPPLOG;
