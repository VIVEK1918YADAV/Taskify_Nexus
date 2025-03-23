import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      default: "",
    },
    role: {
      type: String,
      enum: ["sub_admin", "manager", "team_lead", "team_member"],
      default: "team_member",
    },
    team: {
      type: String,
      enum: ["Development", "Sales", "Infrastructure", "Design", "Marketing"],
      required: function() {
        return this.role === 'manager' || this.role === 'team_lead' || this.role === 'team_member';
      }
    },
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: function() {
        return this.role === 'team_lead' || this.role === 'team_member';
      }
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    isManager: {
      type: Boolean,
      default: function() {
        return this.role === 'manager';
      }
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Encrypt password using bcrypt
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);

export default User;