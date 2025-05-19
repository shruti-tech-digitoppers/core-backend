import mongoose from "mongoose";

export default new mongoose.Schema({
  name: {
    type: String,
    required: true,
    validate: {
      validator: function (v) {
        return v.length > 2 && v.length < 50;
      },
      message: (props) => `${props.value} is not a valid name!`,
    },
  },
  email: {
    type: String,
    validate: {
      validator: function (v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: (props) => `${props.value} is not a valid email!`,
    },
  },
  password: {
    type: String,
  },
  roll_number: {
    type: String,
    validate: {
      validator: function (v) {
        return v.length >= 1 && v.length <= 10 && /^[0-9A-Za-z]+$/.test(v);
      },
      message: (props) => `${props.value} is not a valid roll number!`,
    },
  },
  phone_number: {
    type: String,
    validate: {
      validator: function (v) {
        return v.length === 10 && /^[0-9]+$/.test(v);
      },
      message: (props) => `${props.value} is not a valid phone number!`,
    },
  },
  gradeId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Grade",
  },
  boardId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Board",
    required: true,
  },
  languageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Language",
    required: true,
  },
  address: {
    type: String,
    validate: {
      validator: function (v) {
        return v.length > 5;
      },
      message: (props) => `${props.value} is not a valid address!`,
    },
  },
  city: {
    type: String,
  },
  state: {
    type: String,
  },
  zip_code: {
    type: String,
  },
},
{
	timestamps: true,
});