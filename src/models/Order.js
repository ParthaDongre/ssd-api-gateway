const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      default: function () {
        const rand = Math.floor(1000 + Math.random() * 9000);
        return `ORD-${Date.now().toString().slice(-6)}-${rand}`;
      }
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Order must belong to a user"],
      index: true
    },
    item: {
      type: String,
      required: [true, "Order item/description is required"],
      trim: true,
      minlength: [2, "Item name must have at least 2 characters"]
    },
    amount: {
      type: Number,
      required: [true, "Order amount is required"],
      min: [0, "Amount must be a non-negative number"]
    },
    status: {
      type: String,
      enum: ["Pending", "Processing", "Shipped", "Delivered"],
      default: "Processing"
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret.orderId;
        ret._docId = ret._id.toString();
        delete ret.__v;
        return ret;
      }
    }
  }
);

const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);

module.exports = Order;
