import mongoose from "mongoose";

const errorLogSchema = new mongoose.Schema(
  {
    message: {
      type: String,
      required: true,
    },

    stack: {
      type: String,
    },

    method: {
      type: String,
    },

    path: {
      type: String,
    },

    statusCode: {
      type: Number,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

export const ErrorLogModel = mongoose.model("ErrorLog", errorLogSchema);
